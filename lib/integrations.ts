// lib/integrations.ts
//
// The ONLY module allowed to read/write the `integrations.credentials`
// column. lib/tool-executors.ts calls getIntegrationCredentials() and
// never sees ciphertext; API routes that let a user connect/disconnect a
// tool call setIntegrationCredentials()/disconnectIntegration() and never
// see plaintext once it's written.

import { supabaseAdmin } from "./supabase";
import { encryptCredentials, decryptCredentials, credentialsAAD, type EncryptedPayload } from "./crypto";

export interface IntegrationMeta {
  provider: string;
  is_connected: boolean;
  connected_at: string | null;
}

// Decrypts and returns credentials for a workspace+provider. Throws if not
// connected or if decryption fails (tampered data, wrong key, AAD mismatch).
export async function getIntegrationCredentials(workspaceId: string, provider: string): Promise<Record<string, any>> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("integrations")
    .select("credentials, is_connected")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .single();

  if (error || !data?.is_connected) {
    throw new Error(`${provider} is not connected for this workspace. Connect it on the Integrations page first.`);
  }
  return decryptCredentials(data.credentials as EncryptedPayload, credentialsAAD(workspaceId, provider));
}

// Encrypts and stores credentials for a workspace+provider, marking it connected.
// Call this from the Integrations page's "Connect" action — never store
// plaintext credentials anywhere else en route to this function (don't log
// req.body, don't persist to any other table).
export async function setIntegrationCredentials(workspaceId: string, provider: string, credentials: Record<string, any>): Promise<void> {
  const supabase = supabaseAdmin();
  const encrypted = encryptCredentials(credentials, credentialsAAD(workspaceId, provider));

  const { error } = await supabase
    .from("integrations")
    .upsert(
      {
        workspace_id: workspaceId,
        provider,
        credentials: encrypted,
        is_connected: true,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,provider" }
    );
  if (error) throw error;
}

// Disconnects an integration. Wipes the stored ciphertext rather than just
// flipping a flag — a disconnected tool shouldn't leave old credentials
// sitting in the database indefinitely.
export async function disconnectIntegration(workspaceId: string, provider: string): Promise<void> {
  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("integrations")
    .update({ credentials: {}, is_connected: false, connected_at: null, allowed_tables: null })
    .eq("workspace_id", workspaceId)
    .eq("provider", provider);
  if (error) throw error;
}

// Table allowlist for the `supabase` provider — plain data, not encrypted,
// since it's authorization policy rather than a secret. db_query/db_write
// (lib/tool-executors.ts) call getAllowedTables() before touching any table.
export async function getAllowedTables(workspaceId: string, provider: string): Promise<string[]> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("integrations")
    .select("allowed_tables")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .maybeSingle();
  return data?.allowed_tables ?? [];
}

export async function setAllowedTables(workspaceId: string, provider: string, tables: string[]): Promise<void> {
  const supabase = supabaseAdmin();
  const cleaned = [...new Set(tables.map(t => t.trim()).filter(Boolean))];
  const { error } = await supabase
    .from("integrations")
    .update({ allowed_tables: cleaned })
    .eq("workspace_id", workspaceId)
    .eq("provider", provider);
  if (error) throw error;
}

// Safe to expose to the frontend — connection status only, never credentials.
export async function listIntegrations(workspaceId: string): Promise<IntegrationMeta[]> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("integrations")
    .select("provider, is_connected, connected_at")
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  return data ?? [];
}

// Used by the inbound email webhook: an inbound email's "to" address could
// belong to any workspace, since CrewwOS is multi-tenant. Matches by
// comparing the domain of each workspace's connected Resend from_email
// against the domain the inbound email was actually sent to.
export async function findWorkspaceIdForInboundEmailDomain(toDomain: string): Promise<string | null> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("integrations")
    .select("workspace_id, credentials")
    .eq("provider", "resend")
    .eq("is_connected", true);
  if (error || !data) return null;

  for (const row of data) {
    try {
      const creds = decryptCredentials(row.credentials as EncryptedPayload, credentialsAAD(row.workspace_id, "resend"));
      const fromEmail = creds.from_email as string | undefined;
      if (fromEmail && fromEmail.split("@")[1]?.toLowerCase() === toDomain.toLowerCase()) {
        return row.workspace_id;
      }
    } catch {
      continue; // a workspace with corrupted/unreadable creds shouldn't block matching others
    }
  }
  return null;
}
