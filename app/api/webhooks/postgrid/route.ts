/**
 * app/api/webhooks/postgrid/route.ts
 * Receives PostGrid event webhooks and updates mail_sends table
 *
 * In PostGrid dashboard → Webhooks, add:
 *   https://crewwos.com/api/webhooks/postgrid
 * and set the secret as POSTGRID_WEBHOOK_SECRET in your env.
 */

import { NextRequest, NextResponse } from "next/server";
import { handlePostGridWebhook, PostGridWebhookEvent } from "@/lib/postgrid";
import crypto from "crypto";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.POSTGRID_WEBHOOK_SECRET;

  // Verify webhook signature if secret is configured
  if (secret) {
    const signature = req.headers.get("x-postgrid-signature") ?? "";
    const rawBody = await req.text();

    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (signature !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    try {
      const event = JSON.parse(rawBody) as PostGridWebhookEvent;
      await handlePostGridWebhook(event);
    } catch (err) {
      console.error("[PostGrid Webhook] Error:", err);
      return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }
  } else {
    // No secret configured — process without verification (dev/test only)
    try {
      const event = (await req.json()) as PostGridWebhookEvent;
      await handlePostGridWebhook(event);
    } catch (err) {
      console.error("[PostGrid Webhook] Error:", err);
      return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}