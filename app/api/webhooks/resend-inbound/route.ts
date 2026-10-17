// app/api/webhooks/resend-inbound/route.ts
//
// Resend calls this when a customer emails your store's address. No Clerk
// session exists on this request — it's server-to-server from Resend, so
// this route must be listed in middleware.ts's public route matcher (same
// pattern as the cron route). Flow:
//   1. Resend POSTs { type: "email.received", data: { email_id, from, to, subject } }
//      — metadata only, no body.
//   2. Fetch the full email body via Resend's API using that email_id.
//   3. Figure out which workspace this belongs to, by matching the "to"
//      domain against each workspace's connected Resend from_email domain.
//   4. Run Priya's real turn with the email content as her message.
//   5. Send her reply back to the customer via Resend's send API.
//
// NOTE: the exact shape of Resend's "fetch received email body" endpoint
// is inferred from their documented SDK method (resend.emails.receiving.get)
// rather than a raw curl example — unlike most of tonight's other
// integrations, this one hasn't been corrected against a real error yet.
// Given Resend is already connected and verified, this is genuinely
// testable tonight, so expect (and welcome) a quick real-error fix cycle
// if the endpoint shape needs adjusting.

import { NextRequest, NextResponse } from "next/server";
import { findWorkspaceIdForInboundEmailDomain, getIntegrationCredentials } from "@/lib/integrations";
import { getWorkspaceById } from "@/lib/supabase";
import { runAgentTurn } from "@/lib/agent-runtime";

export async function POST(req: NextRequest) {
  const payload = await req.json();

  if (payload?.type !== "email.received") {
    // Resend may send other event types to the same endpoint later —
    // acknowledge anything we don't handle rather than erroring, so
    // Resend doesn't treat it as a failed delivery and keep retrying.
    return NextResponse.json({ ok: true, ignored: payload?.type });
  }

  const emailId = payload.data?.email_id;
  const fromAddress = payload.data?.from as string;
  const toAddress = (payload.data?.to?.[0] ?? "") as string;
  const subject = payload.data?.subject ?? "(no subject)";
  const toDomain = toAddress.split("@")[1];

  if (!emailId || !toDomain) {
    return NextResponse.json({ error: "Malformed webhook payload — missing email_id or to address" }, { status: 400 });
  }

  const workspaceId = await findWorkspaceIdForInboundEmailDomain(toDomain);
  if (!workspaceId) {
    console.error(`resend-inbound: no workspace matches inbound domain "${toDomain}" — email from ${fromAddress} not routed.`);
    return NextResponse.json({ ok: true, unrouted: true });
  }

  try {
    const workspace = await getWorkspaceById(workspaceId);
    const creds = await getIntegrationCredentials(workspaceId, "resend");

    // Fetch the full body — the webhook itself only carries metadata.
    const bodyRes = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${creds.api_key}` },
    });
    const bodyData = await bodyRes.json();
    if (!bodyRes.ok) {
      throw new Error(bodyData?.message ?? `Could not fetch inbound email body for ${emailId}`);
    }
    const emailText = bodyData.text ?? bodyData.html ?? "(empty message)";

    // Route to Priya — customer support is her job. autonomous:true since
    // no CEO is present for this turn, same reasoning as the cron jobs.
    const result = await runAgentTurn({
      workspaceId,
      workspaceName: workspace.name,
      agentSlug: "csm", // Priya's slug
      userId: workspace.owner_id,
      message: `New customer email received.\nFrom: ${fromAddress}\nSubject: ${subject}\n\n${emailText}\n\nDraft and send a reply directly to this customer at ${fromAddress}.`,
      autonomous: true,
    });

    // Send Priya's reply back to the actual customer, not just record it
    // in her chat thread — this is the point of the whole feature.
    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: creds.from_email,
        to: fromAddress,
        subject: subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`,
        text: result.reply,
      }),
    });
    if (!sendRes.ok) {
      const sendErr = await sendRes.json();
      throw new Error(sendErr?.message ?? "Failed to send Priya's reply back to the customer");
    }

    return NextResponse.json({ ok: true, workspaceId, repliedTo: fromAddress });
  } catch (err: any) {
    console.error(`resend-inbound failed for workspace ${workspaceId}:`, err);
    // Still 200 — a 4xx/5xx here makes Resend retry the same webhook
    // repeatedly, which isn't useful once we've already logged the real
    // cause server-side.
    return NextResponse.json({ ok: false, error: err.message });
  }
}
