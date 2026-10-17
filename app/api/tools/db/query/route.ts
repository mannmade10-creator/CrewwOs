// app/api/tools/db/query/route.ts
import { NextRequest } from "next/server";
import { runTool } from "@/lib/route-helpers";
import { execDbQuery } from "@/lib/tool-executors";

export async function POST(req: NextRequest) {
  return runTool(req, execDbQuery);
}
