// app/api/tools/leads/search/route.ts
import { NextRequest } from "next/server";
import { runTool } from "@/lib/route-helpers";
import { execLeadsSearch } from "@/lib/tool-executors";

export async function POST(req: NextRequest) {
  return runTool(req, execLeadsSearch);
}
