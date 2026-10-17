// app/api/tools/github/commit/route.ts
import { NextRequest } from "next/server";
import { runTool } from "@/lib/route-helpers";
import { execGithubCommit } from "@/lib/tool-executors";

export async function POST(req: NextRequest) {
  return runTool(req, execGithubCommit);
}
