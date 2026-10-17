// app/api/tools/outreach/sequence/route.ts
import { NextRequest } from "next/server";
import { runTool } from "@/lib/route-helpers";
import { execOutreachSequence } from "@/lib/tool-executors";

export async function POST(req: NextRequest) {
  return runTool(req, execOutreachSequence);
}
