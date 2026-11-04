import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createHash } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      ref: string;
      product: string;
      landing_url?: string;
      referrer?: string;
    };
    const { ref, product, landing_url, referrer } = body;
    if (!ref || !product) {
      return NextResponse.json({ error: "ref and product required" }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id, active")
      .eq("ref_code", ref.toLowerCase())
      .single();

    if (!affiliate?.active) {
      return NextResponse.json({ ok: false, reason: "unknown_ref" });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    const ip_hash = createHash("sha256").update(ip).digest("hex").slice(0, 16);

    await supabase.from("affiliate_clicks").insert({
      affiliate_id: affiliate.id,
      product,
      landing_url: landing_url ?? null,
      referrer: referrer ?? null,
      ip_hash,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[affiliates/track] error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
