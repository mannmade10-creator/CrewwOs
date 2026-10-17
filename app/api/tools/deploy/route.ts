// app/api/tools/deploy/route.ts
import { NextRequest } from "next/server";
import { runTool } from "@/lib/route-helpers";
import { execDeploy } from "@/lib/tool-executors";

export async function POST(req: NextRequest) {
  return runTool(req, execDeploy);
}
