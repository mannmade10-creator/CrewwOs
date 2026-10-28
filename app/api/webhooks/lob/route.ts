// app/api/webhooks/lob/route.ts
//
// Receives PostGrid delivery status webhooks and updates mail_sends accordingly.
// Add this URL in your PostGrid dashboard under Settings → Webhooks.
// Verifies the PostGrid-Signature header to ensure events are genuine.

import { NextRequest, NextResponse } from "next/server";
import { handlePostGridWebhook, type PostGridWebhookEvent } from "@/lib/postgrid";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("lob-signature") ?? "";
  const secret = process.env.LOB_WEBHOOK_SECRET;

  // Verify signature if secret is configured
  if (secret && signature) {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (signature !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: PostGridWebhookEvent;

  try {
    event = JSON.parse(rawBody) as PostGridWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    await handlePostGridWebhook(event);
    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[postgrid-webhook]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}