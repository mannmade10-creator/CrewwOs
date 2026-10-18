// app/api/agency/apply/route.ts
// POST { name, email, company, phone, clientCount, message, plan }
// Stores the agency lead in contact_leads and sends a confirmation email via Resend.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, company, phone, clientCount, message, plan } = body;

    if (!name || typeof name !== "string" || !email || typeof email !== "string") {
      return NextResponse.json({ error: "name and email are required" }, { status: 400 });
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Store lead in contact_leads
    const { error: dbError } = await supabase.from("contact_leads").insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      company: company?.trim() || null,
      phone: phone?.trim() || null,
      trucks: clientCount ? parseInt(clientCount, 10) || null : null,
      message: message?.trim() || null,
      interest: plan ? `agency:${plan}` : "agency",
    });

    if (dbError) {
      console.error("[agency/apply] DB error:", dbError);
      return NextResponse.json({ error: "Failed to save application" }, { status: 500 });
    }

    // Send confirmation email via Resend (non-blocking — if it fails, lead is still saved)
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "CrewwOS Agency <agency@crewwos.com>",
            to: [email.trim().toLowerCase()],
            bcc: ["mannmade10@gmail.com"],
            subject: "We got your application — CrewwOS Agency Partner",
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060612;font-family:Inter,Arial,sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060612;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Logo -->
        <tr><td style="padding-bottom:32px;">
          <span style="display:inline-flex;align-items:center;gap:8px;font-size:18px;font-weight:700;color:#fff;text-decoration:none;">
            <span style="width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,#00d8c0,#a855f7);display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#000;">C</span>
            CrewwOS
          </span>
        </td></tr>

        <!-- Body card -->
        <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#a855f7;">Agency Partner Program</p>
          <h1 style="margin:0 0 20px;font-size:28px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;">
            Your application is in, ${name.split(" ")[0]}. 🔥
          </h1>
          <p style="margin:0 0 24px;font-size:16px;color:rgba(255,255,255,0.65);line-height:1.7;">
            We received your application for the CrewwOS Agency Partner program${plan ? ` (${plan} plan)` : ""}.
            Our team reviews every application personally — expect to hear back within 1–2 business days.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(168,85,247,0.06);border:1px solid rgba(168,85,247,0.15);border-radius:12px;padding:20px;margin-bottom:28px;">
            <tr><td>
              <p style="margin:0 0 12px;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.4);">What you submitted</p>
              ${company ? `<p style="margin:0 0 6px;font-size:14px;color:rgba(255,255,255,0.7);"><strong style="color:#fff;">Agency:</strong> ${company}</p>` : ""}
              ${clientCount ? `<p style="margin:0 0 6px;font-size:14px;color:rgba(255,255,255,0.7);"><strong style="color:#fff;">Client count:</strong> ${clientCount}</p>` : ""}
              ${plan ? `<p style="margin:0 0 6px;font-size:14px;color:rgba(255,255,255,0.7);"><strong style="color:#fff;">Plan interest:</strong> ${plan}</p>` : ""}
              ${message ? `<p style="margin:0;font-size:14px;color:rgba(255,255,255,0.7);"><strong style="color:#fff;">Message:</strong> ${message}</p>` : ""}
            </td></tr>
          </table>

          <p style="margin:0 0 12px;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.7;">
            While you wait, here's what happens next:
          </p>
          <ul style="margin:0 0 28px;padding-left:20px;color:rgba(255,255,255,0.55);font-size:14px;line-height:2;">
            <li>We review your agency profile and client count</li>
            <li>You'll get a calendar link to book your onboarding call</li>
            <li>We set up your white-label portal and sub-workspaces</li>
            <li>Your clients are live in under 48 hours</li>
          </ul>

          <a href="https://crewwos.com" style="display:inline-block;background:#a855f7;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;">
            Visit CrewwOS →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0;text-align:center;font-size:12px;color:rgba(255,255,255,0.25);">
          © 2026 CrewwOS · M.A.D.E Technologies Inc. · Oklahoma City, OK
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
            `.trim(),
          }),
        });
      } catch (emailErr) {
        // Email failure is non-fatal — lead is already saved
        console.error("[agency/apply] Email error:", emailErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[agency/apply] Unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}