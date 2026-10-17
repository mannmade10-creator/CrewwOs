// app/api/tools/email/send/route.ts
import { NextRequest } from "next/server";
import { runTool } from "@/lib/route-helpers";
import { execEmailSend } from "@/lib/tool-executors";

export async function POST(req: NextRequest) {
  return runTool(req, execEmailSend);
}
