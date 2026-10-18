import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const SUPABASE_URL         = process.env.CREWOS_SUPABASE_URL         ?? "";
const SUPABASE_SERVICE_KEY = process.env.CREWOS_SUPABASE_SERVICE_KEY ?? "";
const WEBHOOK_SECRET       = process.env.CREWOS_WEBHOOK_SECRET        ?? "";
const RESEND_API_KEY       = process.env.RESEND_API_KEY              ?? "";
const FROM_EMAIL           = process.env.BOOKING_FROM_EMAIL          ?? "noreply@notifications.crewwos.com";

function verifySignature(body: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return !WEBHOOK_SECRET;
  const expected = createHmac("sha1", WEBHOOK_SECRET).update(body).digest("hex");
  return signature === expected;
}

async function updateWorkspaceStatus(
  projectId: string,
  status: "live" | "error",
  deploymentUrl?: string
) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  const patch: Record<string, string> = { status };
  if (deploymentUrl) patch.vercel_deployment_url = `https://${deploymentUrl}`;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/workspaces?vercel_project_id=eq.${encodeURIComponent(projectId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(patch),
    }
  );
  if (!res.ok) {
    console.error("[vercel-webhook] Supabase PATCH failed:", res.status, await res.text());
    return null;
  }
  const rows = await res.json();
  return rows[0] ?? null;
}

async function sendLiveEmail(ownerEmail: string, ownerName: string, bizName: string, url: string) {
  if (!RESEND_API_KEY || !ownerEmail) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: ownerEmail,
      subject: `Your site is live -- ${bizName}`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <h1 style="font-size:24px;font-weight:800;color:#0c4a6e;margin:0 0 8px">Your site is live, ${ownerName}!</h1>
        <p style="color:#334155;font-size:15px;margin:0 0 24px">
          <strong>${bizName}</strong> just finished deploying. Your site is ready for visitors right now.
        </p>
        <a href="${url}" style="display:inline-block;background:#0ea5e9;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;margin-bottom:32px">
          Visit Your Live Site
        </a>
        <ul style="color:#334155;font-size:14px;line-height:2;padding-left:20px;margin:0 0 24px">
          <li>Your site URL: <a href="${url}" style="color:#0ea5e9">${url}</a></li>
          <li>Add a custom domain in your Vercel dashboard</li>
          <li>Enable bookings from your CrewwOS dashboard</li>
        </ul>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
        <p style="font-size:12px;color:#94a3b8;margin:0">Sent by CrewwOS - Built by M.A.D.E Technologies</p>
      </div>`,
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-vercel-signature");
    if (!verifySignature(rawBody, signature)) {
      console.warn("[vercel-webhook] Invalid signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = JSON.parse(rawBody);
    const { type, payload: data } = payload;
    if (!type?.startsWith("deployment.")) {
      return NextResponse.json({ ok: true, ignored: true });
    }
    const projectId: string = data?.projectId ?? data?.project?.id ?? "";
    const deploymentUrl: string = data?.url ?? "";
    const deploymentState: string = data?.readyState ?? data?.state ?? "";
    if (!projectId) return NextResponse.json({ ok: true, ignored: true, reason: "no projectId" });
    console.log(`[vercel-webhook] ${type} | project=${projectId} | state=${deploymentState}`);
    if (type === "deployment.succeeded" || deploymentState === "READY") {
      const workspace = await updateWorkspaceStatus(projectId, "live", deploymentUrl);
      if (workspace?.owner_email) {
        await sendLiveEmail(
          workspace.owner_email,
          workspace.owner_name ?? "there",
          workspace.business_name ?? "Your business",
          deploymentUrl ? `https://${deploymentUrl}` : workspace.vercel_deployment_url
        );
      }
      return NextResponse.json({ ok: true, action: "marked_live", projectId });
    }
    if (type === "deployment.error" || deploymentState === "ERROR") {
      await updateWorkspaceStatus(projectId, "error");
      return NextResponse.json({ ok: true, action: "marked_error", projectId });
    }
    return NextResponse.json({ ok: true, ignored: true, type });
  } catch (err: unknown) {
    console.error("[vercel-webhook] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}