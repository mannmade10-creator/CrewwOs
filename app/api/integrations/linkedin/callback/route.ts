// app/api/integrations/linkedin/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { setIntegrationCredentials, getIntegrationCredentials } from "@/lib/integrations";
import { logAuditEvent } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    console.error("[linkedin/callback] OAuth error:", error, searchParams.get("error_description"));
    return NextResponse.redirect(new URL("/dashboard?linkedin_error=denied", req.url));
  }

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const workspaceId = state?.startsWith("crewwos_linkedin:")
    ? state.split(":")[1]
    : null;

  let clientId     = process.env.LINKEDIN_CLIENT_ID     ?? "";
  let clientSecret = process.env.LINKEDIN_CLIENT_SECRET ?? "";

  if (workspaceId) {
    try {
      const existing = await getIntegrationCredentials(workspaceId, "linkedin");
      if (existing.client_id)     clientId     = existing.client_id as string;
      if (existing.client_secret) clientSecret = existing.client_secret as string;
    } catch {
      // Not yet connected — use env vars if available
    }
  }

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "LinkedIn client credentials not found. Connect LinkedIn via the Integrations page first." },
      { status: 400 }
    );
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://crewwos.com"}/api/integrations/linkedin/callback`;

  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "authorization_code",
      code,
      redirect_uri:  redirectUri,
      client_id:     clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error("[linkedin/callback] token exchange failed:", tokenRes.status, body);
    return NextResponse.json({ error: "LinkedIn token exchange failed", detail: body }, { status: 502 });
  }

  const tokenData = await tokenRes.json() as { access_token?: string; expires_in?: number };
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return NextResponse.json({ error: "No access_token in LinkedIn response" }, { status: 502 });
  }

  if (workspaceId) {
    try {
      await setIntegrationCredentials(workspaceId, "linkedin", {
        access_token:  accessToken,
        client_id:     clientId,
        client_secret: clientSecret,
      });
      await logAuditEvent({
        req,
        workspaceId,
        actorId: "linkedin_oauth_callback",
        action:  "integration.connect",
        target:  "linkedin",
        metadata: { method: "oauth_callback" },
      });
      return NextResponse.redirect(
        new URL(`/dashboard/${workspaceId}/integrations?linkedin=connected`, req.url)
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[linkedin/callback] failed to save credentials:", msg);
      return NextResponse.json({ error: "Failed to save LinkedIn credentials" }, { status: 500 });
    }
  }

  return NextResponse.json({ access_token: accessToken, expires_in: tokenData.expires_in });
}
