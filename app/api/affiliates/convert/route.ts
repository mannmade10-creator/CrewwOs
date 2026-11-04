import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json() as {
      ref: string;
      workspace_id: string;
      product: string;
      plan: string;
      mrr_usd: number;
    };
    const { ref, workspace_id, product, plan, mrr_usd } = body;

    const supabase = supabaseAdmin();

    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id, commission_pct, active")
      .eq("ref_code", ref.toLowerCase())
      .single();

    if (!affiliate?.active) {
      return NextResponse.json({ ok: false, reason: "unknown_ref" });
    }

    const commission_pct = Number(affiliate.commission_pct);
    const commission_usd = Math.round((mrr_usd * commission_pct / 100) * 100) / 100;

    const { error } = await supabase.from("affiliate_conversions").insert({
      aff_id:         affiliate.id,
      workspace_id,
      product,
      plan,
      mrr_usd,
      commission_pct,
      commission_usd,
      status: "pending",
    });

    if (error) throw error;

    return NextResponse.json({ ok: true, commission_usd });
  } catch (err: unknown) {
    console.error("[affiliates/convert] error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
