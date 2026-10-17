// app/api/tools/reports/generate/route.ts
import { NextRequest } from "next/server";
import { runTool } from "@/lib/route-helpers";
import { execReportsGenerate } from "@/lib/tool-executors";

export async function POST(req: NextRequest) {
  return runTool(req, execReportsGenerate);
}
