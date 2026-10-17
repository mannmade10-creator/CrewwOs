// app/api/tools/users/manage/route.ts
import { NextRequest } from "next/server";
import { runTool } from "@/lib/route-helpers";
import { execUsersManage } from "@/lib/tool-executors";

export async function POST(req: NextRequest) {
  return runTool(req, execUsersManage);
}
