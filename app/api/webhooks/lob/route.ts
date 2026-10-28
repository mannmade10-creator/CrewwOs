// app/api/webhooks/lob/route.ts
//
// Receives Lob delivery status webhooks and updates mail_sends accordingly.
// Add this URL in your Lob dashboard under Settings → Webhooks.
// Verifies the Lob-Signature header to ensure events are genuine.

import { NextRequest, NextResponse } from "next/server";
import { handleLobWebhook } from "@/lib/postgrid";
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

  let event: {
    id: string;
    event_type: { id: string };
    body: { id: string; status?: string; expected_delivery_date?: string };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    await handleLobWebhook(event);
    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[lob-webhook]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
