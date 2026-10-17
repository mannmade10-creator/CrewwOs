// app/api/tools/db/write/route.ts
import { NextRequest } from "next/server";
import { runTool } from "@/lib/route-helpers";
import { execDbWrite } from "@/lib/tool-executors";

export async function POST(req: NextRequest) {
  return runTool(req, execDbWrite);
}
