// app/api/cron/mail-sends/route.ts
//
// Daily cron job — fires all scheduled direct-mail sends whose date has arrived.
// Configure in vercel.json:
//   { "crons": [{ "path": "/api/cron/mail-sends", "schedule": "0 10 * * *" }] }
// (runs at 10:00 UTC = 5:00 AM Central every day)

import { NextRequest, NextResponse } from "next/server";
import { processScheduledSends } from "@/lib/contact-triggers";

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processScheduledSends();
    console.log("[cron/mail-sends]", result);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/mail-sends]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
