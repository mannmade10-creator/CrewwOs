// app/api/business/upload-logo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    await logAuditEvent({ req, actorId: "anonymous", action: "business.upload-logo.unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(`business-upload:${userId}`, 10, 60_000);
  if (!rl.allowed) {
    await logAuditEvent({ req, actorId: userId, action: "business.upload-logo.rate_limited" });
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WebP, GIF allowed." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "File too large. Max 5 MB." }, { status: 400 });
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `business/${userId}/logo.${ext}`;
  const supabase = supabaseAdmin();

  const { error } = await supabase.storage
    .from("crewos-assets")
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (error) {
    await logAuditEvent({ req, actorId: userId, action: "business.upload-logo.storage_error", metadata: { error: error.message } });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from("crewos-assets").getPublicUrl(path);
  await logAuditEvent({ req, actorId: userId, action: "business.upload-logo.success" });
  return NextResponse.json({ url: data.publicUrl });
}
