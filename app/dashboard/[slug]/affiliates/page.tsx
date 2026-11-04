import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";

const SUPERADMIN_ID = "user_3KssQdrEnCwzR428Q5nmtYKYqHF";

export default async function AffiliatesPage() {
  const { userId } = await auth();
  if (userId !== SUPERADMIN_ID) redirect("/dashboard");

  const supabase = supabaseAdmin();

  const { data: affiliates } = await supabase
    .from("affiliates")
    .select("id, ref_code, name, email, commission_pct, products, active, created_at")
    .order("created_at", { ascending: false });

  const { data: clicks } = await supabase
    .from("affiliate_clicks")
    .select("affiliate_id, product");

  const { data: conversions } = await supabase
    .from("affiliate_conversions")
    .select("aff_id, product, plan, mrr_usd, commission_usd, status, converted_at");

  const clickMap: Record<string, number> = {};
  (clicks ?? []).forEach(c => {
    clickMap[c.affiliate_id] = (clickMap[c.affiliate_id] ?? 0) + 1;
  });

  const convMap: Record<string, typeof conversions> = {};
  (conversions ?? []).forEach(c => {
    if (!convMap[c.aff_id]) convMap[c.aff_id] = [];
    convMap[c.aff_id]!.push(c);
  });

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px 40px", background: "#07071a", minHeight: "100vh" }}>
      <div style={{ color: "#ffffff88", fontSize: 11, letterSpacing: 2, marginBottom: 4 }}>AFFILIATES</div>
      <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Affiliate Tracking</div>
      <div style={{ color: "#ffffff55", fontSize: 12, marginBottom: 28 }}>
        3% commission per converting customer. Superadmin view only.
      </div>

      {(affiliates ?? []).map(aff => {
        const myClicks = clickMap[aff.id] ?? 0;
        const myConversions = convMap[aff.id] ?? [];
        const pendingUsd = myConversions
          .filter(c => c.status === "pending")
          .reduce((sum, c) => sum + Number(c.commission_usd ?? 0), 0);
        const paidUsd = myConversions
          .filter(c => c.status === "paid")
          .reduce((sum, c) => sum + Number(c.commission_usd ?? 0), 0);

        return (
          <div key={aff.id} style={{ background: "#0d0d1a", border: "1px solid #ffffff18", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{aff.name}</span>
                <span style={{ color: "#ffffff55", fontSize: 12, marginLeft: 10 }}>?ref={aff.ref_code}</span>
              </div>
              <div style={{ fontSize: 9, padding: "3px 10px", borderRadius: 20, background: aff.active ? "#10B98122" : "#ff444411", color: aff.active ? "#10B981" : "#ff6666" }}>
                {aff.active ? "● ACTIVE" : "○ INACTIVE"}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Commission", value: `${aff.commission_pct}%` },
                { label: "Clicks", value: myClicks },
                { label: "Conversions", value: myConversions.length },
                { label: "Pending Payout", value: `$${pendingUsd.toFixed(2)}` },
              ].map(stat => (
                <div key={stat.label} style={{ background: "#060612", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ color: "#ffffff44", fontSize: 10, marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>{stat.value}</div>
                </div>
              ))}
            </div>

            <div style={{ color: "#ffffff44", fontSize: 11, marginBottom: 8 }}>PRODUCTS: {aff.products.join(", ")}</div>

            {myConversions.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ color: "#ffffff44", textAlign: "left" }}>
                    <th style={{ padding: "4px 8px" }}>Product</th>
                    <th style={{ padding: "4px 8px" }}>Plan</th>
                    <th style={{ padding: "4px 8px" }}>MRR</th>
                    <th style={{ padding: "4px 8px" }}>Commission</th>
                    <th style={{ padding: "4px 8px" }}>Status</th>
                    <th style={{ padding: "4px 8px" }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {myConversions.map((c, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #ffffff0a", color: "#ffffff88" }}>
                      <td style={{ padding: "6px 8px" }}>{c.product}</td>
                      <td style={{ padding: "6px 8px" }}>{c.plan ?? "—"}</td>
                      <td style={{ padding: "6px 8px" }}>${Number(c.mrr_usd ?? 0).toFixed(2)}</td>
                      <td style={{ padding: "6px 8px", color: "#10B981" }}>${Number(c.commission_usd ?? 0).toFixed(2)}</td>
                      <td style={{ padding: "6px 8px" }}>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: c.status === "paid" ? "#10B98122" : "#FF6B3522", color: c.status === "paid" ? "#10B981" : "#FF6B35" }}>{c.status}</span>
                      </td>
                      <td style={{ padding: "6px 8px" }}>{new Date(c.converted_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {paidUsd > 0 && (
              <div style={{ color: "#10B981", fontSize: 11, marginTop: 8 }}>Total paid out: ${paidUsd.toFixed(2)}</div>
            )}
          </div>
        );
      })}

      {(affiliates ?? []).length === 0 && (
        <div style={{ color: "#ffffff44", fontSize: 14 }}>No affiliates yet.</div>
      )}
    </div>
  );
}
