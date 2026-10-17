// app/api/tools/users/list/route.ts
import { NextRequest } from "next/server";
import { runTool } from "@/lib/route-helpers";
import { execUsersList } from "@/lib/tool-executors";

export async function POST(req: NextRequest) {
  return runTool(req, execUsersList);
}
