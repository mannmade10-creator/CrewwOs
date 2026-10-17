import { NextRequest } from "next/server";
import { runTool } from "@/lib/route-helpers";
import { execShopifyInventoryUpdate } from "@/lib/tool-executors";

export async function POST(req: NextRequest) {
  return runTool(req, execShopifyInventoryUpdate);
}
