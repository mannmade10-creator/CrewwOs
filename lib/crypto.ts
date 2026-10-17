// lib/crypto.ts
//
// Encrypts everything that goes into `integrations.credentials` before it
// ever reaches Supabase, and decrypts it only inside server-side tool
// executors. This is application-level envelope encryption — a reasonable
// baseline, but the master key itself is only as safe as your env var
// storage. For anything beyond a single-founder setup, swap KEYS below for
// keys pulled from a real KMS (AWS KMS, GCP KMS) or Supabase Vault
// (pgsodium) instead of raw environment variables.
//
// Design:
//   - AES-256-GCM: encryption + integrity (tamper-evident) in one primitive.
//   - AAD (additional authenticated data) = `${workspaceId}:${provider}`,
//     so a ciphertext stolen from one row can't be replayed into another
//     workspace's or provider's row even if someone gets raw DB access.
//   - Key versioning (`kv`) lets you rotate CREDENTIALS_ENCRYPTION_KEY
//     without a big-bang re-encryption: add a new env var, bump
//     CURRENT_KEY_VERSION, and old rows still decrypt against their
//     original key version until you re-encrypt them on next write.

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended for GCM

// Add a new KEYS[n] entry + bump CURRENT_KEY_VERSION when rotating.
// Each key must be a 32-byte value, base64-encoded, e.g.:
//   openssl rand -base64 32
const KEYS: Record<number, string | undefined> = {
  1: process.env.CREDENTIALS_ENCRYPTION_KEY,
  // 2: process.env.CREDENTIALS_ENCRYPTION_KEY_V2,
};
const CURRENT_KEY_VERSION = 1;

function getKey(version: number): Buffer {
  const raw = KEYS[version];
  if (!raw) throw new Error(`No encryption key configured for version ${version}. Set CREDENTIALS_ENCRYPTION_KEY.`);
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error(`CREDENTIALS_ENCRYPTION_KEY must decode to exactly 32 bytes, got ${key.length}.`);
  return key;
}

export interface EncryptedPayload {
  kv: number;      // key version used
  iv: string;      // base64
  tag: string;     // base64 auth tag
  data: string;     // base64 ciphertext
}

export function encryptCredentials(plaintextObj: Record<string, any>, aad: string): EncryptedPayload {
  const key = getKey(CURRENT_KEY_VERSION);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));

  const plaintext = Buffer.from(JSON.stringify(plaintextObj), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    kv: CURRENT_KEY_VERSION,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: ciphertext.toString("base64"),
  };
}

export function decryptCredentials(payload: EncryptedPayload, aad: string): Record<string, any> {
  const key = getKey(payload.kv);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, "base64"));
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

  try {
    const plaintext = Buffer.concat([decipher.update(Buffer.from(payload.data, "base64")), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8"));
  } catch (err) {
    // GCM auth failure (wrong key, tampered ciphertext, or AAD mismatch —
    // e.g. someone copied a row's credentials into a different workspace/provider)
    // throws here rather than silently returning garbage.
    throw new Error("Failed to decrypt credentials — wrong key, tampered data, or AAD mismatch.");
  }
}

// Helper so callers don't have to build the AAD string themselves and risk
// getting workspaceId/provider swapped or mismatched between encrypt/decrypt.
export function credentialsAAD(workspaceId: string, provider: string): string {
  return `${workspaceId}:${provider}`;
}
