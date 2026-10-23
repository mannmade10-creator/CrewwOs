// lib/tool-executors.ts
// The actual side-effecting logic behind each tool. Called both by the
// agent-chat tool_use loop and by the standalone /api/tools/* routes.
//
// NOTE: these hit the *client's* connected integrations (Section 10),
// not CrewOS's own Supabase project. Credentials are fetched through
// lib/integrations.ts, which decrypts them (lib/crypto.ts) — this file
// never touches ciphertext or plaintext storage directly.
//
// EXCEPTION: execScoutCandidateSave / execScoutCandidatesList intentionally
// write to CrewOS's OWN Supabase project via supabaseAdmin() — same pattern
// as execTeamActivity — because scout_candidates is a CrewOS-side table,
// not a client-connected one.

import { getIntegrationCredentials, getAllowedTables } from "./integrations";

export async function execDbQuery(workspaceId: string, input: { table: string; filters?: Record<string, any>; limit?: number }) {
  const allowed = await getAllowedTables(workspaceId, "supabase");
  if (!allowed.includes(input.table)) {
    throw new Error(`"${input.table}" isn't in this workspace's allowed-tables list. Add it on the Integrations page before agents can query it.`);
  }
  const creds = await getIntegrationCredentials(workspaceId, "supabase");
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(creds.url, creds.service_role_key);
  let q = client.from(input.table).select("*").limit(input.limit ?? 50);
  if (input.filters) {
    for (const [k, v] of Object.entries(input.filters)) q = q.eq(k, v);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function execDbWrite(workspaceId: string, input: { table: string; operation: "insert" | "update"; data: Record<string, any>; match?: Record<string, any> }) {
  const allowed = await getAllowedTables(workspaceId, "supabase");
  if (!allowed.includes(input.table)) {
    throw new Error(`"${input.table}" isn't in this workspace's allowed-tables list. Add it on the Integrations page before agents can write to it.`);
  }
  const creds = await getIntegrationCredentials(workspaceId, "supabase");
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(creds.url, creds.service_role_key);
  if (input.operation === "insert") {
    const { data, error } = await client.from(input.table).insert(input.data).select();
    if (error) throw error;
    return data;
  } else {
    if (!input.match) throw new Error("`match` is required for update operations.");
    let q = client.from(input.table).update(input.data);
    for (const [k, v] of Object.entries(input.match)) q = q.eq(k, v);
    const { data, error } = await q.select();
    if (error) throw error;
    return data;
  }
}

export async function execDeploy(workspaceId: string, input: { project: string; reason?: string }) {
  const creds = await getIntegrationCredentials(workspaceId, "vercel");
  const res = await fetch(`https://api.vercel.com/v13/deployments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: input.project, target: "production" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Vercel deploy failed");
  return { url: data.url, id: data.id, reason: input.reason ?? "Manual trigger via CrewOS agent" };
}

export async function execEmailSend(workspaceId: string, input: { to: string; subject: string; body: string }) {
  const creds = await getIntegrationCredentials(workspaceId, "resend");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: creds.from_email ?? "crew@crewos.ai",
      to: input.to,
      subject: input.subject,
      html: input.body,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? "Resend send failed");
  return data;
}

export async function execSmsSend(workspaceId: string, input: { to: string; body: string }) {
  const creds = await getIntegrationCredentials(workspaceId, "twilio");
  const auth = Buffer.from(`${creds.account_sid}:${creds.auth_token}`).toString("base64");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${creds.account_sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: creds.phone_number, To: input.to, Body: input.body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? "Twilio send failed");
  return data;
}

export async function execUsersList(workspaceId: string, input: { limit?: number }) {
  return execDbQuery(workspaceId, { table: "users", limit: input.limit ?? 50 });
}

export async function execUsersManage(workspaceId: string, input: { action: "create" | "suspend" | "update"; user_id?: string; data?: Record<string, any> }) {
  if (input.action === "create") {
    return execDbWrite(workspaceId, { table: "users", operation: "insert", data: input.data ?? {} });
  }
  if (input.action === "suspend") {
    return execDbWrite(workspaceId, { table: "users", operation: "update", data: { status: "suspended" }, match: { id: input.user_id } });
  }
  return execDbWrite(workspaceId, { table: "users", operation: "update", data: input.data ?? {}, match: { id: input.user_id } });
}

export async function execReportsGenerate(workspaceId: string, input: { metric: string; period?: string }) {
  const { getMetricSeries, getTaskSummary } = await import("./reports");

  if (input.metric === "task_completion") {
    return { metric: input.metric, period: input.period ?? "recent", ...(await getTaskSummary(workspaceId)) };
  }

  const series = await getMetricSeries(workspaceId, input.metric);
  return { metric: input.metric, period: input.period ?? "all_time", series };
}

export async function execLeadsSearch(workspaceId: string, input: { title?: string; industry?: string; company_size?: string; limit?: number }) {
  const creds = await getIntegrationCredentials(workspaceId, "apollo");
  const res = await fetch("https://api.apollo.io/v1/mixed_people/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: creds.api_key,
      person_titles: input.title ? [input.title] : undefined,
      organization_industry_tag_ids: input.industry ? [input.industry] : undefined,
      per_page: input.limit ?? 25,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Apollo search failed");
  return data.people ?? [];
}

export async function execOutreachSequence(workspaceId: string, input: { name: string; steps: string[]; recipients: string[] }) {
  const creds = await getIntegrationCredentials(workspaceId, "replyio");
  const res = await fetch("https://api.reply.io/v1/campaigns", {
    method: "POST",
    headers: {
      "x-api-key": creds.api_key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: input.name, steps: input.steps.map(body => ({ body })) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? "Reply.io campaign creation failed");
  return data;
}

export async function execGithubCommit(workspaceId: string, input: { repo: string; branch?: string; path: string; content: string; message: string }) {
  const creds = await getIntegrationCredentials(workspaceId, "github");
  const branch = input.branch ?? "main";
  const getRes = await fetch(`https://api.github.com/repos/${input.repo}/contents/${input.path}?ref=${branch}`, {
    headers: { Authorization: `Bearer ${creds.token}` },
  });
  const existing = getRes.ok ? await getRes.json() : null;

  const res = await fetch(`https://api.github.com/repos/${input.repo}/contents/${input.path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${creds.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: input.message,
      content: Buffer.from(input.content).toString("base64"),
      branch,
      sha: existing?.sha,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? "GitHub commit failed");
  return { commit: data.commit?.sha, url: data.content?.html_url };
}

export async function execSecurityScan(workspaceId: string, _input: {}) {
  const { runSecurityScan } = await import("./security-scan");
  return runSecurityScan(workspaceId);
}

export async function execVoiceCall(workspaceId: string, input: { to_number: string; reason: string; context?: Record<string, any> }) {
  const creds = await getIntegrationCredentials(workspaceId, "retell");
  const res = await fetch("https://api.retellai.com/v2/create-phone-call", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from_number: creds.from_number,
      to_number: input.to_number,
      override_agent_id: creds.agent_id,
      metadata: { crewos_workspace_id: workspaceId, reason: input.reason },
      retell_llm_dynamic_variables: { call_reason: input.reason, ...(input.context ?? {}) },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? "Retell call failed to start");
  return { call_id: data.call_id, status: data.call_status, to: input.to_number };
}

export async function execTeamActivity(workspaceId: string, input: { agent_slug?: string; limit?: number }) {
  const { supabaseAdmin } = await import("./supabase");
  const supabase = supabaseAdmin();

  let q = supabase
    .from("tasks")
    .select("title, status, result, created_at, completed_at, agents(slug, name, role)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 20);

  const { data, error } = await q;
  if (error) throw error;

  let rows = data ?? [];
  if (input.agent_slug) {
    rows = rows.filter((r: any) => r.agents?.slug === input.agent_slug);
  }

  return rows.map((r: any) => ({
    agent: r.agents?.name ?? "unknown",
    role: r.agents?.role,
    title: r.title,
    status: r.status,
    result_preview: r.result ? String(r.result).slice(0, 200) : null,
    at: r.created_at,
  }));
}

export async function execProductTrendLookup(workspaceId: string, input: { keyword: string; timeframe?: string }) {
  const creds = await getIntegrationCredentials(workspaceId, "serpapi");
  const params = new URLSearchParams({
    engine: "google_trends",
    q: input.keyword,
    date: input.timeframe ?? "today 3-m",
    api_key: creds.api_key,
  });
  const res = await fetch(`https://serpapi.com/search?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "SerpApi trends lookup failed");
  return { keyword: input.keyword, interest_over_time: data.interest_over_time ?? null };
}

async function getCjAccessToken(apiKey: string): Promise<string> {
  const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const data = await res.json();
  if (!res.ok || data.result === false || !data.data?.accessToken) {
    throw new Error(data?.message ?? "CJ Dropshipping authentication failed — check the API Key saved in Integrations.");
  }
  return data.data.accessToken;
}

export async function execProductSupplierLookup(workspaceId: string, input: { keyword: string; limit?: number }) {
  const creds = await getIntegrationCredentials(workspaceId, "cjdropshipping");
  const accessToken = await getCjAccessToken(creds.api_key);

  let lastError: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 1200 * attempt));
    const res = await fetch(
      `https://developers.cjdropshipping.com/api2.0/v1/product/list?productNameEn=${encodeURIComponent(input.keyword)}&pageSize=${input.limit ?? 10}`,
      { headers: { "CJ-Access-Token": accessToken } }
    );
    const data = await res.json();
    if (res.ok && data.result !== false) {
      return (data.data?.list ?? []).map((p: any) => ({
        pid: p.pid,
        name: p.productNameEn,
        source_url: p.productUrl,
        supplier: "cjdropshipping",
        landed_cost: p.sellPrice,
        image: p.productImage,
      }));
    }
    lastError = data?.message ?? "CJ Dropshipping lookup failed";
    if (!String(lastError).toLowerCase().includes("too many requests") && !String(lastError).toLowerCase().includes("qps")) {
      throw new Error(lastError);
    }
  }
  throw new Error(`CJ Dropshipping lookup failed after retries: ${lastError}`);
}

export async function execCheckSupplierStock(workspaceId: string, input: { pid: string }) {
  const creds = await getIntegrationCredentials(workspaceId, "cjdropshipping");
  const accessToken = await getCjAccessToken(creds.api_key);

  const detailRes = await fetch(
    `https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=${encodeURIComponent(input.pid)}`,
    { headers: { "CJ-Access-Token": accessToken } }
  );
  const detailData = await detailRes.json();
  if (!detailRes.ok || detailData.result === false) {
    throw new Error(detailData?.message ?? `CJ product detail lookup failed for pid ${input.pid}`);
  }
  const variants = detailData.data?.variants ?? [];
  if (variants.length === 0) throw new Error(`No variants found on CJ for pid ${input.pid} — cannot check stock.`);

  const results = [];
  for (const v of variants) {
    await new Promise(r => setTimeout(r, 1100));
    const stockRes = await fetch(
      `https://developers.cjdropshipping.com/api2.0/v1/product/stock/queryByVid?vid=${encodeURIComponent(v.vid)}`,
      { headers: { "CJ-Access-Token": accessToken } }
    );
    const stockData = await stockRes.json();
    const variantInv = stockData?.data?.variantInventories?.find((vi: any) => vi.vid === v.vid);
    const totalInventory = (variantInv?.inventory ?? []).reduce((sum: number, w: any) => sum + (w.totalInventory ?? 0), 0);
    results.push({ vid: v.vid, sku: v.variantSku ?? v.sku, total_inventory: totalInventory });
  }

  return {
    pid: input.pid,
    variants: results,
    total_inventory_all_variants: results.reduce((sum, r) => sum + r.total_inventory, 0),
  };
}

export async function execScoutCandidateSave(
  workspaceId: string,
  input: {
    product_name: string;
    source_url?: string;
    supplier?: string;
    landed_cost?: number;
    suggested_retail?: number;
    trend_score?: number;
    margin_score?: number;
    competition_score?: number;
    repeat_purchase_score?: number;
    total_score?: number;
    raw_signals?: Record<string, any>;
  }
) {
  const { supabaseAdmin } = await import("./supabase");
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("scout_candidates")
    .insert({ ...input, workspace_id: workspaceId })
    .select();
  if (error) throw error;
  return data;
}

export async function execScoutCandidatesList(workspaceId: string, input: { status?: string; limit?: number }) {
  const { supabaseAdmin } = await import("./supabase");
  const supabase = supabaseAdmin();
  let q = supabase
    .from("scout_candidates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("total_score", { ascending: false })
    .limit(input.limit ?? 20);
  if (input.status) q = q.eq("status", input.status);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

const SHOPIFY_API_VERSION = "2024-01";

function shopifyUrl(shopDomain: string, path: string) {
  return `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/${path}`;
}

async function getShopifyAccessToken(shopDomain: string, clientId: string, clientSecret: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });
  } catch (err: any) {
    const cause = err?.cause ? ` — cause: ${err.cause.code ?? err.cause.message ?? JSON.stringify(err.cause)}` : "";
    throw new Error(`Shopify token exchange network request failed: ${err.message}${cause}`);
  }
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data?.error_description ?? data?.error ?? "Shopify authentication failed — check the Client ID and Client Secret saved in Integrations.");
  }
  return data.access_token;
}

export async function execShopifyProductCreate(
  workspaceId: string,
  input: {
    title: string;
    description_html?: string;
    price: number;
    compare_at_price?: number;
    sku?: string;
    image_url?: string;
    inventory_quantity?: number;
    publish?: boolean;
  }
) {
  const creds = await getIntegrationCredentials(workspaceId, "shopify");
  const accessToken = await getShopifyAccessToken(creds.shop_domain, creds.client_id, creds.client_secret);
  const res = await fetch(shopifyUrl(creds.shop_domain, "products.json"), {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product: {
        title: input.title,
        body_html: input.description_html ?? "",
        status: input.publish ? "active" : "draft",
        variants: [
          {
            price: input.price.toFixed(2),
            compare_at_price: input.compare_at_price?.toFixed(2),
            sku: input.sku,
            inventory_management: "shopify",
            inventory_quantity: input.inventory_quantity ?? 25,
          },
        ],
        images: input.image_url ? [{ src: input.image_url }] : undefined,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.errors ? JSON.stringify(data.errors) : "Shopify product create failed");
  const product = data.product;
  return {
    product_id: product.id,
    variant_id: product.variants?.[0]?.id,
    admin_url: `https://${creds.shop_domain}/admin/products/${product.id}`,
    status: product.status,
    published: product.status === "active",
  };
}

export async function execShopifyProductPerformance(workspaceId: string, input: { days_live_at_least?: number }) {
  const creds = await getIntegrationCredentials(workspaceId, "shopify");
  const accessToken = await getShopifyAccessToken(creds.shop_domain, creds.client_id, creds.client_secret);
  const minDaysLive = input.days_live_at_least ?? 14;
  const cutoff = new Date(Date.now() - minDaysLive * 24 * 60 * 60 * 1000);

  const productsRes = await fetch(shopifyUrl(creds.shop_domain, "products.json?status=active&limit=100"), {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  const productsData = await productsRes.json();
  if (!productsRes.ok) throw new Error(productsData?.errors ? JSON.stringify(productsData.errors) : "Could not list Shopify products");

  const eligibleProducts = (productsData.products ?? []).filter((p: any) => new Date(p.created_at) <= cutoff);
  if (eligibleProducts.length === 0) return { message: `No active products have been live for ${minDaysLive}+ days yet.`, products: [] };

  const earliestCreatedAt = eligibleProducts.reduce((min: string, p: any) => (p.created_at < min ? p.created_at : min), eligibleProducts[0].created_at);
  const ordersRes = await fetch(
    shopifyUrl(creds.shop_domain, `orders.json?status=any&financial_status=paid&created_at_min=${encodeURIComponent(earliestCreatedAt)}&limit=250`),
    { headers: { "X-Shopify-Access-Token": accessToken } }
  );
  const ordersData = await ordersRes.json();
  if (!ordersRes.ok) throw new Error(ordersData?.errors ? JSON.stringify(ordersData.errors) : "Could not list Shopify orders");

  const salesByProductId: Record<string, { units: number; revenue: number }> = {};
  for (const order of ordersData.orders ?? []) {
    for (const li of order.line_items ?? []) {
      if (!li.product_id) continue;
      const key = String(li.product_id);
      if (!salesByProductId[key]) salesByProductId[key] = { units: 0, revenue: 0 };
      salesByProductId[key].units += li.quantity;
      salesByProductId[key].revenue += parseFloat(li.price) * li.quantity;
    }
  }

  return {
    days_live_at_least: minDaysLive,
    note: "units/revenue reflect real paid orders only. No page-view/traffic data available (requires Shopify Plus).",
    products: eligibleProducts.map((p: any) => ({
      product_id: p.id,
      title: p.title,
      created_at: p.created_at,
      days_live: Math.floor((Date.now() - new Date(p.created_at).getTime()) / (24 * 60 * 60 * 1000)),
      units_sold: salesByProductId[String(p.id)]?.units ?? 0,
      revenue: salesByProductId[String(p.id)]?.revenue ?? 0,
    })),
  };
}

export async function execShopifyProductArchive(workspaceId: string, input: { product_id: string; reason: string }) {
  const creds = await getIntegrationCredentials(workspaceId, "shopify");
  const accessToken = await getShopifyAccessToken(creds.shop_domain, creds.client_id, creds.client_secret);
  const res = await fetch(shopifyUrl(creds.shop_domain, `products/${input.product_id}.json`), {
    method: "PUT",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ product: { id: input.product_id, status: "draft" } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.errors ? JSON.stringify(data.errors) : "Shopify product archive failed");
  return { product_id: input.product_id, status: data.product?.status, reason: input.reason };
}

export async function execShopifyFinancialSummary(workspaceId: string, input: { days?: number }) {
  const creds = await getIntegrationCredentials(workspaceId, "shopify");
  const accessToken = await getShopifyAccessToken(creds.shop_domain, creds.client_id, creds.client_secret);
  const days = input.days ?? 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const ordersRes = await fetch(
    shopifyUrl(creds.shop_domain, `orders.json?status=any&financial_status=paid&created_at_min=${encodeURIComponent(since)}&limit=250`),
    { headers: { "X-Shopify-Access-Token": accessToken } }
  );
  const ordersData = await ordersRes.json();
  if (!ordersRes.ok) throw new Error(ordersData?.errors ? JSON.stringify(ordersData.errors) : "Could not list Shopify orders");
  const orders = ordersData.orders ?? [];

  const { supabaseAdmin } = await import("./supabase");
  const supabase = supabaseAdmin();
  const { data: candidates } = await supabase
    .from("scout_candidates")
    .select("product_name, landed_cost")
    .eq("workspace_id", workspaceId);

  function findLandedCost(lineItemTitle: string): number | null {
    const norm = lineItemTitle.toLowerCase();
    const match = (candidates ?? []).find(
      (c: any) => c.landed_cost != null && (norm.includes(c.product_name.toLowerCase()) || c.product_name.toLowerCase().includes(norm))
    );
    return match ? Number(match.landed_cost) : null;
  }

  let totalRevenue = 0;
  let totalKnownCogs = 0;
  let unitsWithKnownCogs = 0;
  let unitsWithUnknownCogs = 0;
  const unmatchedTitles = new Set<string>();
  const perProduct: Record<string, { units: number; revenue: number; cogs: number; cogs_known: boolean }> = {};

  for (const order of orders) {
    for (const li of order.line_items ?? []) {
      const revenue = parseFloat(li.price) * li.quantity;
      totalRevenue += revenue;
      const landedCost = findLandedCost(li.title);
      if (!perProduct[li.title]) perProduct[li.title] = { units: 0, revenue: 0, cogs: 0, cogs_known: landedCost != null };
      perProduct[li.title].units += li.quantity;
      perProduct[li.title].revenue += revenue;
      if (landedCost != null) {
        const cogs = landedCost * li.quantity;
        totalKnownCogs += cogs;
        unitsWithKnownCogs += li.quantity;
        perProduct[li.title].cogs += cogs;
      } else {
        unitsWithUnknownCogs += li.quantity;
        unmatchedTitles.add(li.title);
      }
    }
  }

  return {
    period_days: days,
    order_count: orders.length,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    known_cogs: Math.round(totalKnownCogs * 100) / 100,
    gross_profit_on_known_cogs_only: Math.round((totalRevenue - totalKnownCogs) * 100) / 100,
    units_with_known_cogs: unitsWithKnownCogs,
    units_with_unknown_cogs: unitsWithUnknownCogs,
    products_with_unknown_cogs: Array.from(unmatchedTitles),
    by_product: perProduct,
    important_limitation: "This is GROSS profit on matched COGS only. It does NOT include ad spend, Shopify transaction fees, supplier shipping costs, or CJ Dropshipping order costs — none of those are tracked yet. Do not call this net profit or true profit.",
  };
}

export async function execShopifyInventoryRead(workspaceId: string, input: { product_id?: string }) {
  const creds = await getIntegrationCredentials(workspaceId, "shopify");
  const accessToken = await getShopifyAccessToken(creds.shop_domain, creds.client_id, creds.client_secret);
  const graphqlUrl = shopifyUrl(creds.shop_domain, "graphql.json").replace(SHOPIFY_API_VERSION, "2024-10");

  const query = input.product_id
    ? `query($id: ID!) {
        product(id: $id) {
          id
          title
          variants(first: 10) { edges { node { id title inventoryQuantity } } }
        }
      }`
    : `query {
        products(first: 100, query: "status:active") {
          edges {
            node {
              id
              title
              variants(first: 10) { edges { node { id title inventoryQuantity } } }
            }
          }
        }
      }`;

  const variables = input.product_id ? { id: `gid://shopify/Product/${input.product_id}` } : {};

  const res = await fetch(graphqlUrl, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data?.errors) throw new Error(`GraphQL inventory read errors: ${JSON.stringify(data.errors)}`);

  function flattenProduct(node: any) {
    return {
      product_id: node.id.split("/").pop(),
      title: node.title,
      variants: (node.variants?.edges ?? []).map((e: any) => ({
        variant_id: e.node.id.split("/").pop(),
        variant_title: e.node.title,
        inventory_quantity: e.node.inventoryQuantity,
      })),
    };
  }

  if (input.product_id) {
    const product = data?.data?.product;
    if (!product) throw new Error(`Product ${input.product_id} not found.`);
    return flattenProduct(product);
  }

  const products = (data?.data?.products?.edges ?? []).map((e: any) => flattenProduct(e.node));
  return { count: products.length, products };
}

export async function execShopifyInventoryPolicySet(
  workspaceId: string,
  input: { product_id: string; policy: "continue" | "deny"; reason: string }
) {
  const creds = await getIntegrationCredentials(workspaceId, "shopify");
  const accessToken = await getShopifyAccessToken(creds.shop_domain, creds.client_id, creds.client_secret);
  const graphqlUrl = shopifyUrl(creds.shop_domain, "graphql.json").replace(SHOPIFY_API_VERSION, "2024-10");
  const productGid = `gid://shopify/Product/${input.product_id}`;

  const lookupRes = await fetch(graphqlUrl, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query($id: ID!) { product(id: $id) { variants(first: 25) { edges { node { id } } } } }`,
      variables: { id: productGid },
    }),
  });
  const lookupData = await lookupRes.json();
  if (lookupData?.errors) throw new Error(`GraphQL lookup errors: ${JSON.stringify(lookupData.errors)}`);
  const variantIds: string[] = (lookupData?.data?.product?.variants?.edges ?? []).map((e: any) => e.node.id);
  if (variantIds.length === 0) throw new Error(`Product ${input.product_id} has no variants found — cannot set policy.`);

  const setRes = await fetch(graphqlUrl, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants { id inventoryPolicy }
          userErrors { field message }
        }
      }`,
      variables: {
        productId: productGid,
        variants: variantIds.map(id => ({ id, inventoryPolicy: input.policy === "continue" ? "CONTINUE" : "DENY" })),
      },
    }),
  });
  const setData = await setRes.json();
  const userErrors = setData?.data?.productVariantsBulkUpdate?.userErrors;
  if (userErrors?.length) throw new Error(JSON.stringify(userErrors));
  if (setData?.errors) throw new Error(JSON.stringify(setData.errors));

  return {
    product_id: input.product_id,
    policy: input.policy,
    reason: input.reason,
    variants_updated: setData?.data?.productVariantsBulkUpdate?.productVariants?.length ?? 0,
  };
}

export async function execShopifyInventoryUpdate(workspaceId: string, input: { product_id: string; quantity: number }) {
  const creds = await getIntegrationCredentials(workspaceId, "shopify");
  const accessToken = await getShopifyAccessToken(creds.shop_domain, creds.client_id, creds.client_secret);
  const graphqlUrl = shopifyUrl(creds.shop_domain, "graphql.json").replace(SHOPIFY_API_VERSION, "2024-10");

  async function diagnosticFetch(url: string, opts: any) {
    try {
      return await fetch(url, opts);
    } catch (err: any) {
      const cause = err?.cause ? ` — cause: ${err.cause.code ?? err.cause.message ?? JSON.stringify(err.cause)}` : "";
      throw new Error(`Network request to Shopify failed: ${err.message}${cause}`);
    }
  }

  const lookupRes = await diagnosticFetch(graphqlUrl, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query($id: ID!) {
        product(id: $id) {
          id
          variants(first: 5) {
            edges { node { id inventoryItem { id } } }
          }
        }
      }`,
      variables: { id: `gid://shopify/Product/${input.product_id}` },
    }),
  });
  const lookupData = await lookupRes.json();
  if (lookupData?.errors) throw new Error(`GraphQL product lookup errors: ${JSON.stringify(lookupData.errors)}`);
  const variantEdge = lookupData?.data?.product?.variants?.edges?.[0];
  if (!variantEdge) {
    throw new Error(`Product ${input.product_id} found no variants via GraphQL. Raw response: ${JSON.stringify(lookupData)}`);
  }
  const inventoryItemGid = variantEdge.node.inventoryItem.id;

  const setRes = await diagnosticFetch(graphqlUrl, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `mutation($input: InventorySetQuantitiesInput!) {
        inventorySetQuantities(input: $input) {
          inventoryAdjustmentGroup { createdAt }
          userErrors { field message }
        }
      }`,
      variables: {
        input: {
          name: "available",
          reason: "correction",
          ignoreCompareQuantity: true,
          quantities: [
            {
              inventoryItemId: inventoryItemGid,
              locationId: `gid://shopify/Location/${creds.location_id}`,
              quantity: input.quantity,
            },
          ],
        },
      },
    }),
  });
  const setData = await setRes.json();
  const userErrors = setData?.data?.inventorySetQuantities?.userErrors;
  if (userErrors?.length) throw new Error(JSON.stringify(userErrors));
  if (setData?.errors) throw new Error(JSON.stringify(setData.errors));

  return { variant_id: variantEdge.node.id, quantity: input.quantity, updated_at: setData?.data?.inventorySetQuantities?.inventoryAdjustmentGroup?.createdAt };
}

export async function execShopifyOrdersList(
  workspaceId: string,
  input: { status?: string; fulfillment_status?: string; limit?: number }
) {
  const creds = await getIntegrationCredentials(workspaceId, "shopify");
  const accessToken = await getShopifyAccessToken(creds.shop_domain, creds.client_id, creds.client_secret);
  const params = new URLSearchParams({
    status: input.status ?? "open",
    limit: String(input.limit ?? 20),
  });
  if (input.fulfillment_status) params.set("fulfillment_status", input.fulfillment_status);

  const res = await fetch(shopifyUrl(creds.shop_domain, `orders.json?${params}`), {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.errors ? JSON.stringify(data.errors) : "Shopify orders list failed");
  return (data.orders ?? []).map((o: any) => ({
    id: o.id,
    order_number: o.order_number,
    customer_email: o.email,
    total_price: o.total_price,
    fulfillment_status: o.fulfillment_status,
    financial_status: o.financial_status,
    created_at: o.created_at,
    line_items: (o.line_items ?? []).map((li: any) => ({ title: li.title, quantity: li.quantity, sku: li.sku })),
  }));
}

export async function execShopifyOrderFulfill(
  workspaceId: string,
  input: { order_id: string; tracking_number?: string; tracking_company?: string; notify_customer?: boolean }
) {
  const creds = await getIntegrationCredentials(workspaceId, "shopify");
  const accessToken = await getShopifyAccessToken(creds.shop_domain, creds.client_id, creds.client_secret);

  const foRes = await fetch(shopifyUrl(creds.shop_domain, `orders/${input.order_id}/fulfillment_orders.json`), {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  const foData = await foRes.json();
  if (!foRes.ok) throw new Error(foData?.errors ?? "Could not look up Shopify fulfillment orders");
  const fulfillmentOrderId = foData.fulfillment_orders?.[0]?.id;
  if (!fulfillmentOrderId) throw new Error("No open fulfillment order found for this order — it may already be fulfilled or cancelled.");

  const res = await fetch(shopifyUrl(creds.shop_domain, "fulfillments.json"), {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fulfillment: {
        line_items_by_fulfillment_order: [{ fulfillment_order_id: fulfillmentOrderId }],
        tracking_info: input.tracking_number
          ? { number: input.tracking_number, company: input.tracking_company }
          : undefined,
        notify_customer: input.notify_customer ?? true,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.errors ? JSON.stringify(data.errors) : "Shopify order fulfill failed");
  return { fulfillment_id: data.fulfillment?.id, status: data.fulfillment?.status };
}

export async function execShopifyOrderLookup(workspaceId: string, input: { email?: string; order_number?: string }) {
  const creds = await getIntegrationCredentials(workspaceId, "shopify");
  const accessToken = await getShopifyAccessToken(creds.shop_domain, creds.client_id, creds.client_secret);
  if (!input.email && !input.order_number) throw new Error("Provide either an email or an order_number to search by.");

  const params = new URLSearchParams({ status: "any", limit: "10" });
  if (input.email) params.set("email", input.email);
  if (input.order_number) params.set("name", input.order_number.startsWith("#") ? input.order_number : `#${input.order_number}`);

  const res = await fetch(shopifyUrl(creds.shop_domain, `orders.json?${params}`), {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.errors ? JSON.stringify(data.errors) : "Shopify order lookup failed");
  const orders = data.orders ?? [];
  if (orders.length === 0) return { found: false, message: "No matching order found." };

  return {
    found: true,
    orders: orders.map((o: any) => ({
      id: o.id,
      order_number: o.name,
      created_at: o.created_at,
      days_since_order: Math.floor((Date.now() - new Date(o.created_at).getTime()) / (24 * 60 * 60 * 1000)),
      total_price: o.total_price,
      financial_status: o.financial_status,
      fulfillment_status: o.fulfillment_status,
      tracking: (o.fulfillments ?? []).map((f: any) => ({ number: f.tracking_number, company: f.tracking_company, url: f.tracking_url })),
      line_items: (o.line_items ?? []).map((li: any) => ({ title: li.title, quantity: li.quantity })),
    })),
  };
}

export async function execShopifyOrderRefund(
  workspaceId: string,
  input: { order_id: string; amount: number; reason: string; manager_approved?: boolean }
) {
  const creds = await getIntegrationCredentials(workspaceId, "shopify");
  const accessToken = await getShopifyAccessToken(creds.shop_domain, creds.client_id, creds.client_secret);

  const orderRes = await fetch(shopifyUrl(creds.shop_domain, `orders/${input.order_id}.json`), {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  const orderData = await orderRes.json();
  if (!orderRes.ok) throw new Error(orderData?.errors ? JSON.stringify(orderData.errors) : "Could not look up order for refund");
  const order = orderData.order;
  const daysSinceOrder = Math.floor((Date.now() - new Date(order.created_at).getTime()) / (24 * 60 * 60 * 1000));

  if (daysSinceOrder > 7 && !input.manager_approved) {
    throw new Error(
      `This order is ${daysSinceOrder} days old — refund authority only covers orders 7 days or younger without explicit approval. Get the CEO's explicit approval in this conversation first, then retry with manager_approved=true.`
    );
  }

  const txRes = await fetch(shopifyUrl(creds.shop_domain, `orders/${input.order_id}/transactions.json`), {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  const txData = await txRes.json();
  if (!txRes.ok) throw new Error(txData?.errors ? JSON.stringify(txData.errors) : "Could not look up order transactions for refund");
  const parentTx = (txData.transactions ?? []).find((t: any) => t.kind === "sale" || t.kind === "capture");
  if (!parentTx) throw new Error("No successful payment transaction found on this order to refund against.");

  const refundRes = await fetch(shopifyUrl(creds.shop_domain, `orders/${input.order_id}/refunds.json`), {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refund: {
        currency: parentTx.currency,
        notify: true,
        note: input.reason,
        transactions: [
          {
            parent_id: parentTx.id,
            amount: input.amount.toFixed(2),
            kind: "refund",
            gateway: parentTx.gateway,
          },
        ],
      },
    }),
  });
  const refundData = await refundRes.json();
  if (!refundRes.ok) throw new Error(refundData?.errors ? JSON.stringify(refundData.errors) : "Shopify refund failed");

  return {
    refund_id: refundData.refund?.id,
    amount: input.amount,
    reason: input.reason,
    days_since_order: daysSinceOrder,
    auto_approved: daysSinceOrder <= 7,
  };
}

// ── TikTok Ads ────────────────────────────────────────────────────────────────

const TIKTOK_API_BASE = "https://business-api.tiktok.com/open_api/v1.3";

export async function execTikTokCampaignCreate(
  workspaceId: string,
  input: { campaign_name: string; objective: string; daily_budget: number; reason: string }
) {
  const creds = await getIntegrationCredentials(workspaceId, "tiktok");

  const cap = Number(creds.daily_spend_cap ?? 0);
  if (!cap || cap <= 0) {
    throw new Error(
      "TikTok ad spend is not enabled for this workspace (daily_spend_cap is $0 or unset). The CEO must explicitly set a real cap on the TikTok integration (Integrations page) before any campaign can be created. This is intentional — do not attempt to work around it."
    );
  }
  if (input.daily_budget > cap) {
    throw new Error(`Requested daily_budget ($${input.daily_budget}) exceeds the configured cap ($${cap}). Reduce the budget or ask the CEO to raise the cap first.`);
  }
  if (input.daily_budget < 50) {
    throw new Error("TikTok requires a minimum $50/day ad group budget — this is a real platform rule, not something CrewOS can override.");
  }

  const res = await fetch(`${TIKTOK_API_BASE}/campaign/create/`, {
    method: "POST",
    headers: { "Access-Token": creds.access_token, "Content-Type": "application/json" },
    body: JSON.stringify({
      advertiser_id: creds.advertiser_id,
      campaign_name: input.campaign_name,
      objective_type: input.objective,
      budget_mode: "BUDGET_MODE_DAY",
      budget: input.daily_budget,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.code !== 0) throw new Error(data?.message ?? "TikTok campaign creation failed");

  return { campaign_id: data.data?.campaign_id, campaign_name: input.campaign_name, daily_budget: input.daily_budget, reason: input.reason };
}

export async function execTikTokCampaignPerformance(workspaceId: string, input: { days?: number }) {
  const creds = await getIntegrationCredentials(workspaceId, "tiktok");
  const days = input.days ?? 7;
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const params = new URLSearchParams({
    advertiser_id: creds.advertiser_id,
    report_type: "BASIC",
    dimensions: JSON.stringify(["campaign_id"]),
    metrics: JSON.stringify(["spend", "impressions", "clicks", "conversion"]),
    start_date: startDate,
    end_date: endDate,
  });

  const res = await fetch(`${TIKTOK_API_BASE}/report/integrated/get/?${params}`, {
    headers: { "Access-Token": creds.access_token },
  });
  const data = await res.json();
  if (!res.ok || data.code !== 0) throw new Error(data?.message ?? "TikTok performance report failed");

  return { period_days: days, campaigns: data.data?.list ?? [] };
}

// ── Meta Ads ──────────────────────────────────────────────────────────────────

const META_API_BASE = "https://graph.facebook.com/v21.0";

export async function execMetaCampaignCreate(
  workspaceId: string,
  input: { campaign_name: string; objective: string; daily_budget: number; reason: string }
) {
  const creds = await getIntegrationCredentials(workspaceId, "meta");

  const cap = Number(creds.daily_spend_cap ?? 0);
  if (!cap || cap <= 0) {
    throw new Error(
      "Meta ad spend is not enabled for this workspace (daily_spend_cap is $0 or unset). The CEO must explicitly set a real cap on the Meta integration (Integrations page) before any campaign can be created. This is intentional — do not attempt to work around it."
    );
  }
  if (input.daily_budget > cap) {
    throw new Error(`Requested daily_budget ($${input.daily_budget}) exceeds the configured cap ($${cap}). Reduce the budget or ask the CEO to raise the cap first.`);
  }

  const campaignRes = await fetch(`${META_API_BASE}/act_${creds.ad_account_id}/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: creds.access_token,
      name: input.campaign_name,
      objective: input.objective,
      status: "PAUSED",
      special_ad_categories: [],
    }),
  });
  const campaignData = await campaignRes.json();
  if (campaignData?.error) throw new Error(campaignData.error.message ?? "Meta campaign creation failed");

  const adsetRes = await fetch(`${META_API_BASE}/act_${creds.ad_account_id}/adsets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: creds.access_token,
      name: `${input.campaign_name} - Ad Set`,
      campaign_id: campaignData.id,
      daily_budget: Math.round(input.daily_budget * 100),
      billing_event: "IMPRESSIONS",
      optimization_goal: input.objective === "OUTCOME_SALES" ? "OFFSITE_CONVERSIONS" : "LINK_CLICKS",
      status: "PAUSED",
      targeting: { geo_locations: { countries: ["US"] } },
    }),
  });
  const adsetData = await adsetRes.json();
  if (adsetData?.error) throw new Error(adsetData.error.message ?? "Meta ad set creation failed");

  return {
    campaign_id: campaignData.id,
    adset_id: adsetData.id,
    status: "PAUSED",
    daily_budget: input.daily_budget,
    reason: input.reason,
    note: "Created PAUSED. Needs ad creative + an Ad object added, and manual review/activation in Meta Ads Manager, before it can actually run.",
  };
}

export async function execMetaCampaignPerformance(workspaceId: string, input: { days?: number }) {
  const creds = await getIntegrationCredentials(workspaceId, "meta");
  const days = input.days ?? 7;
  const params = new URLSearchParams({
    access_token: creds.access_token,
    fields: "campaign_name,spend,impressions,clicks,actions",
    date_preset: days <= 7 ? "last_7d" : days <= 30 ? "last_30d" : "last_90d",
    level: "campaign",
  });
  const res = await fetch(`${META_API_BASE}/act_${creds.ad_account_id}/insights?${params}`);
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message ?? "Meta performance report failed");
  return { period_days: days, campaigns: data.data ?? [] };
}

// ── Google Ads ────────────────────────────────────────────────────────────────

const GOOGLE_ADS_API_VERSION = "v18";

async function getGoogleAdsAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error(data?.error_description ?? "Google OAuth token refresh failed");
  return data.access_token;
}

export async function execGoogleAdsCampaignCreate(
  workspaceId: string,
  input: { campaign_name: string; channel_type: string; daily_budget: number; reason: string }
) {
  const creds = await getIntegrationCredentials(workspaceId, "google_ads");

  const cap = Number(creds.daily_spend_cap ?? 0);
  if (!cap || cap <= 0) {
    throw new Error(
      "Google Ads spend is not enabled for this workspace (daily_spend_cap is $0 or unset). The CEO must explicitly set a real cap on the Google Ads integration (Integrations page) before any campaign can be created. This is intentional — do not attempt to work around it."
    );
  }
  if (input.daily_budget > cap) {
    throw new Error(`Requested daily_budget ($${input.daily_budget}) exceeds the configured cap ($${cap}). Reduce the budget or ask the CEO to raise the cap first.`);
  }

  const accessToken = await getGoogleAdsAccessToken(creds.oauth_client_id, creds.oauth_client_secret, creds.oauth_refresh_token);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": creds.developer_token,
    "Content-Type": "application/json",
  };
  if (creds.login_customer_id) headers["login-customer-id"] = creds.login_customer_id;

  const baseUrl = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${creds.customer_id}`;

  const budgetRes = await fetch(`${baseUrl}/campaignBudgets:mutate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      operations: [{ create: { name: `${input.campaign_name} Budget`, amount_micros: Math.round(input.daily_budget * 1_000_000), delivery_method: "STANDARD" } }],
    }),
  });
  const budgetData = await budgetRes.json();
  if (!budgetRes.ok) throw new Error(budgetData?.error?.message ?? JSON.stringify(budgetData));
  const budgetResourceName = budgetData.results?.[0]?.resourceName;
  if (!budgetResourceName) throw new Error(`Budget creation didn't return a resource name: ${JSON.stringify(budgetData)}`);

  const campaignRes = await fetch(`${baseUrl}/campaigns:mutate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      operations: [{
        create: {
          name: input.campaign_name,
          advertisingChannelType: input.channel_type,
          status: "PAUSED",
          campaignBudget: budgetResourceName,
        },
      }],
    }),
  });
  const campaignData = await campaignRes.json();
  if (!campaignRes.ok) throw new Error(campaignData?.error?.message ?? JSON.stringify(campaignData));

  return {
    campaign_resource: campaignData.results?.[0]?.resourceName,
    status: "PAUSED",
    daily_budget: input.daily_budget,
    reason: input.reason,
    note: "Created PAUSED, as a campaign shell only — still needs ad groups and ads added before it can run.",
  };
}

export async function execGoogleAdsCampaignPerformance(workspaceId: string, input: { days?: number }) {
  const creds = await getIntegrationCredentials(workspaceId, "google_ads");
  const accessToken = await getGoogleAdsAccessToken(creds.oauth_client_id, creds.oauth_client_secret, creds.oauth_refresh_token);
  const days = input.days ?? 7;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": creds.developer_token,
    "Content-Type": "application/json",
  };
  if (creds.login_customer_id) headers["login-customer-id"] = creds.login_customer_id;

  const gaql = `SELECT campaign.name, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM campaign WHERE segments.date DURING LAST_${days}_DAYS`;
  const res = await fetch(`https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${creds.customer_id}/googleAds:search`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: gaql }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? JSON.stringify(data));

  return {
    period_days: days,
    campaigns: (data.results ?? []).map((r: any) => ({
      name: r.campaign?.name,
      spend: (r.metrics?.costMicros ?? 0) / 1_000_000,
      impressions: r.metrics?.impressions,
      clicks: r.metrics?.clicks,
      conversions: r.metrics?.conversions,
    })),
  };
}

// ── Outbound Marketing: Brevo ─────────────────────────────────────────────────

export async function execBrevoEmailSend(workspaceId: string, input: { to: string; to_name?: string; subject: string; body: string }) {
  const creds = await getIntegrationCredentials(workspaceId, "brevo");
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": creds.api_key, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { email: creds.from_email, name: creds.from_name ?? creds.from_email },
      to: [{ email: input.to, name: input.to_name ?? input.to }],
      subject: input.subject,
      htmlContent: input.body,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? "Brevo email send failed");
  return { message_id: data.messageId, to: input.to };
}

export async function execBrevoEmailList(workspaceId: string, input: { limit?: number; unread_only?: boolean }) {
  const creds = await getIntegrationCredentials(workspaceId, "brevo");
  const params = new URLSearchParams({ limit: String(input.limit ?? 20), sort: "desc" });
  const res = await fetch(`https://api.brevo.com/v3/smtp/emails?${params}`, {
    headers: { "api-key": creds.api_key },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? "Brevo email list failed");
  return data.transactionalEmails ?? [];
}

export async function execBrevoEmailReply(workspaceId: string, input: { reply_to_message_id: string; to: string; to_name?: string; subject: string; body: string }) {
  const creds = await getIntegrationCredentials(workspaceId, "brevo");
  const subject = input.subject.startsWith("Re:") ? input.subject : `Re: ${input.subject}`;
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": creds.api_key, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { email: creds.from_email, name: creds.from_name ?? creds.from_email },
      to: [{ email: input.to, name: input.to_name ?? input.to }],
      subject,
      htmlContent: input.body,
      headers: { "In-Reply-To": input.reply_to_message_id, References: input.reply_to_message_id },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? "Brevo email reply failed");
  return { message_id: data.messageId, to: input.to, in_reply_to: input.reply_to_message_id };
}

export async function execBrevoCampaignCreate(
  workspaceId: string,
  input: { name: string; subject: string; body: string; list_id?: number; schedule_at?: string }
) {
  const creds = await getIntegrationCredentials(workspaceId, "brevo");
  const listId = input.list_id ?? Number(creds.default_list_id ?? 2);

  const res = await fetch("https://api.brevo.com/v3/emailCampaigns", {
    method: "POST",
    headers: { "api-key": creds.api_key, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      subject: input.subject,
      sender: { email: creds.from_email, name: creds.from_name ?? creds.from_email },
      type: "classic",
      htmlContent: input.body,
      recipients: { listIds: [listId] },
      ...(input.schedule_at ? { scheduledAt: input.schedule_at } : {}),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? "Brevo campaign create failed");

  // If no schedule, send immediately
  if (!input.schedule_at) {
    const sendRes = await fetch(`https://api.brevo.com/v3/emailCampaigns/${data.id}/sendNow`, {
      method: "POST",
      headers: { "api-key": creds.api_key },
    });
    if (!sendRes.ok) {
      const sendData = await sendRes.json();
      throw new Error(sendData?.message ?? "Brevo campaign send failed");
    }
  }

  return { campaign_id: data.id, name: input.name, list_id: listId, scheduled_at: input.schedule_at ?? "immediate" };
}

// ── Outbound Marketing: Vapi ──────────────────────────────────────────────────

export async function execVapiOutboundCall(
  workspaceId: string,
  input: { to_number: string; reason: string; lead_name?: string; company?: string; context?: string }
) {
  const creds = await getIntegrationCredentials(workspaceId, "vapi");
  const res = await fetch("https://api.vapi.ai/call/phone", {
    method: "POST",
    headers: { Authorization: `Bearer ${creds.api_key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      assistantId: creds.assistant_id,
      phoneNumberId: creds.phone_number_id,
      customer: { number: input.to_number, name: input.lead_name },
      assistantOverrides: {
        variableValues: {
          call_reason: input.reason,
          lead_name: input.lead_name ?? "there",
          company: input.company ?? "",
          context: input.context ?? "",
        },
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? "Vapi outbound call failed");
  return { call_id: data.id, status: data.status, to: input.to_number, reason: input.reason };
}

// ── Outbound Marketing: CRM ───────────────────────────────────────────────────

export async function execCrmLeadCreate(
  workspaceId: string,
  input: {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    product_interest?: string;
    status?: string;
    assigned_agent?: string;
    next_action?: string;
    notes?: string;
    source?: string;
  }
) {
  const { supabaseAdmin } = await import("./supabase");
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("crm_leads")
    .insert({ ...input, status: input.status ?? "new", workspace_id: workspaceId })
    .select();
  if (error) throw error;
  return data?.[0];
}

export async function execCrmLeadUpdate(
  workspaceId: string,
  input: {
    lead_id: string;
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
    product_interest?: string;
    status?: string;
    assigned_agent?: string;
    next_action?: string;
    demo_scheduled_at?: string;
    notes?: string;
  }
) {
  const { supabaseAdmin } = await import("./supabase");
  const supabase = supabaseAdmin();
  const { lead_id, ...fields } = input;
  const { data, error } = await supabase
    .from("crm_leads")
    .update(fields)
    .eq("id", lead_id)
    .eq("workspace_id", workspaceId)
    .select();
  if (error) throw error;
  return data?.[0];
}

export async function execCrmLeadsList(
  workspaceId: string,
  input: { status?: string; assigned_agent?: string; product_interest?: string; limit?: number }
) {
  const { supabaseAdmin } = await import("./supabase");
  const supabase = supabaseAdmin();
  let q = supabase
    .from("crm_leads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 50);
  if (input.status) q = q.eq("status", input.status);
  if (input.assigned_agent) q = q.eq("assigned_agent", input.assigned_agent);
  if (input.product_interest) q = q.ilike("product_interest", `%${input.product_interest}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

// ── Outbound Marketing: Google Calendar ──────────────────────────────────────

export async function execCalendarBookDemo(
  workspaceId: string,
  input: {
    lead_name: string;
    lead_email: string;
    product: string;
    start_time: string;
    host_name?: string;
    host_email?: string;
    notes?: string;
    duration_minutes?: number;
  }
) {
  const creds = await getIntegrationCredentials(workspaceId, "google_calendar");
  const durationMs = (input.duration_minutes ?? 30) * 60 * 1000;
  const startDt = new Date(input.start_time);
  const endDt = new Date(startDt.getTime() + durationMs);

  const attendees: { email: string; displayName?: string }[] = [{ email: input.lead_email, displayName: input.lead_name }];
  if (input.host_email) attendees.push({ email: input.host_email, displayName: input.host_name });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(creds.calendar_id ?? "primary")}/events?conferenceDataVersion=1`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: `${input.product} Demo — ${input.lead_name}`,
        description: input.notes ?? `Product demo for ${input.lead_name} at ${input.lead_email}`,
        start: { dateTime: startDt.toISOString(), timeZone: creds.timezone ?? "UTC" },
        end: { dateTime: endDt.toISOString(), timeZone: creds.timezone ?? "UTC" },
        attendees,
        conferenceData: { createRequest: { requestId: `crewos-${Date.now()}`, conferenceSolutionKey: { type: "hangoutsMeet" } } },
        reminders: { useDefault: false, overrides: [{ method: "email", minutes: 60 }, { method: "popup", minutes: 15 }] },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Google Calendar event creation failed");
  return {
    event_id: data.id,
    meet_link: data.hangoutLink ?? data.conferenceData?.entryPoints?.[0]?.uri,
    calendar_link: data.htmlLink,
    start: data.start?.dateTime,
    end: data.end?.dateTime,
  };
}

// ── Rex / Higgsfield: MCP passthrough shims ───────────────────────────────────
// Rex calls Higgsfield directly through the agent runtime's MCP tool routing.
// These executor shims return a _route object that the agent runtime detects
// and forwards to the appropriate mcp__Higgsfield__* tool.

export async function execAdCopyResearch(
  _workspaceId: string,
  input: { product_title: string; product_url?: string; target_audience?: string; key_benefits?: string[]; tone?: string; platforms?: string[] }
) {
  const hooks = [
    `POV: You just found the thing that fixes ${input.product_title} forever`,
    `I was skeptical… until I tried ${input.product_title}`,
    `This ${input.product_title} hack is going viral for a reason`,
    `Why is nobody talking about ${input.product_title}?`,
    `${input.product_title} just changed how I do this completely`,
  ];
  const ctas = ["Shop Now", "Get Yours Today", "Limited Stock", "See Why Everyone's Switching", "Try It Risk-Free"];
  const hashtags = input.platforms?.includes("tiktok")
    ? ["#fyp", "#foryou", "#viral", "#tiktokmademebuyit", `#${input.product_title.toLowerCase().replace(/\s+/g, "")}`, "#trending", "#musthave", "#productreview"]
    : ["#ad", "#sponsored", "#musthave", `#${input.product_title.toLowerCase().replace(/\s+/g, "")}`];

  return {
    product: input.product_title,
    target_audience: input.target_audience ?? "general consumers",
    recommended_hooks: hooks,
    recommended_ctas: ctas,
    hashtags,
    tone_notes: `Use ${input.tone ?? "energetic"} tone. Lead with the hook in the first 3 seconds. Show transformation or before/after where possible.`,
    platform_tips: {
      tiktok: "9:16, first 3 sec critical, trending audio recommended, UGC style performs best",
      instagram_reels: "9:16, captions on-screen, hook text overlay, 15-30s ideal",
      meta_ads: "1:1 or 4:5, clear product shot in first frame, strong CTA at end",
    },
  };
}

export async function execHiggsfieldBrandCreate(_workspaceId: string, input: any) {
  return { _route: "mcp__Higgsfield__ads_studio_create_brand", _input: input };
}

export async function execHiggsfieldBrandList(_workspaceId: string, input: any) {
  return { _route: "mcp__Higgsfield__ads_studio_list_brands", _input: input };
}

export async function execHiggsfieldProductAdd(_workspaceId: string, input: any) {
  return { _route: "mcp__Higgsfield__ads_studio_add_product", _input: input };
}

export async function execHiggsfieldProductList(_workspaceId: string, input: any) {
  return { _route: "mcp__Higgsfield__ads_studio_list_products", _input: input };
}

export async function execHiggsfieldAdQuote(_workspaceId: string, input: any) {
  return { _route: "mcp__Higgsfield__ads_studio_quote", _input: input };
}

export async function execHiggsfieldAdStudioGenerate(_workspaceId: string, input: any) {
  return { _route: "mcp__Higgsfield__ads_studio_generate", _input: input };
}

export async function execHiggsfieldAdStatus(_workspaceId: string, input: any) {
  return { _route: "mcp__Higgsfield__ads_studio_get_run", _input: input };
}

export async function execHiggsfieldVideoGenerate(_workspaceId: string, input: any) {
  return { _route: "mcp__Higgsfield__generate_video", _input: input };
}

export async function execHiggsfieldJobWait(_workspaceId: string, input: any) {
  return { _route: "mcp__Higgsfield__jobs_wait", _input: input };
}

export async function execTikTokPublish(_workspaceId: string, input: any) {
  return { _route: "mcp__Higgsfield__tiktok_prepare_publish", _input: input };
}

// ── App Builder ───────────────────────────────────────────────────────────────

export async function execAppScaffold(
  workspaceId: string,
  input: { app_name: string; slug: string; description: string; app_type: string; features: string[]; color_scheme?: string; business_type?: string }
) {
  const { supabaseAdmin } = await import("./supabase");
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("app_builds")
    .insert({
      workspace_id: workspaceId,
      app_name: input.app_name,
      slug: input.slug,
      description: input.description,
      app_type: input.app_type,
      features: input.features,
      color_scheme: input.color_scheme ?? "blue",
      business_type: input.business_type ?? "custom",
      status: "scaffolding",
    })
    .select();
  if (error) throw error;
  const build = data?.[0];
  return { build_id: build.id, slug: input.slug, status: "scaffolding", message: `Build registered. Hand build_id ${build.id} to Sam to deploy.` };
}

export async function execAppBuildGenerate(
  workspaceId: string,
  input: { build_id: string; github_token?: string; vercel_token?: string; supabase_project_ref?: string }
) {
  const { supabaseAdmin } = await import("./supabase");
  const supabase = supabaseAdmin();

  const { data: buildData, error: buildError } = await supabase
    .from("app_builds")
    .select("*")
    .eq("id", input.build_id)
    .eq("workspace_id", workspaceId)
    .single();
  if (buildError || !buildData) throw new Error(`Build ${input.build_id} not found.`);

  const ghCreds = input.github_token
    ? { token: input.github_token }
    : await getIntegrationCredentials(workspaceId, "github");
  const vcCreds = input.vercel_token
    ? { token: input.vercel_token }
    : await getIntegrationCredentials(workspaceId, "vercel");

  // Create GitHub repo from template
  const repoRes = await fetch("https://api.github.com/repos/mannmade10-creator/crewos-app-template/generate", {
    method: "POST",
    headers: { Authorization: `Bearer ${ghCreds.token}`, "Content-Type": "application/json", Accept: "application/vnd.github+json" },
    body: JSON.stringify({
      owner: ghCreds.org ?? "mannmade10-creator",
      name: buildData.slug,
      description: buildData.description,
      private: false,
      include_all_branches: false,
    }),
  });
  const repoData = await repoRes.json();
  if (!repoRes.ok) throw new Error(repoData?.message ?? "GitHub repo creation from template failed");

  // Deploy to Vercel
  const deployRes = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: { Authorization: `Bearer ${vcCreds.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: buildData.slug,
      gitSource: { type: "github", repoId: repoData.id, ref: "main" },
      target: "production",
    }),
  });
  const deployData = await deployRes.json();
  if (!deployRes.ok) throw new Error(deployData?.error?.message ?? "Vercel deployment failed");

  await supabase
    .from("app_builds")
    .update({ status: "deploying", github_repo: repoData.html_url, vercel_deployment_id: deployData.id, app_url: `https://${buildData.slug}.vercel.app` })
    .eq("id", input.build_id);

  return {
    build_id: input.build_id,
    github_repo: repoData.html_url,
    vercel_deployment_id: deployData.id,
    app_url: `https://${buildData.slug}.vercel.app`,
    status: "deploying",
  };
}

export async function execAppBuildStatus(workspaceId: string, input: { build_id: string }) {
  const { supabaseAdmin } = await import("./supabase");
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("app_builds")
    .select("*")
    .eq("id", input.build_id)
    .eq("workspace_id", workspaceId)
    .single();
  if (error || !data) throw new Error(`Build ${input.build_id} not found.`);
  return data;
}

export async function execAppBuildsList(workspaceId: string, input: { status?: string }) {
  const { supabaseAdmin } = await import("./supabase");
  const supabase = supabaseAdmin();
  let q = supabase.from("app_builds").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
  if (input.status) q = q.eq("status", input.status);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function execAppBuildEnvSet(workspaceId: string, input: { build_id: string; env_vars: Record<string, string> }) {
  const { supabaseAdmin } = await import("./supabase");
  const supabase = supabaseAdmin();
  const { data: buildData, error: buildError } = await supabase
    .from("app_builds")
    .select("vercel_deployment_id, slug")
    .eq("id", input.build_id)
    .eq("workspace_id", workspaceId)
    .single();
  if (buildError || !buildData) throw new Error(`Build ${input.build_id} not found.`);

  const vcCreds = await getIntegrationCredentials(workspaceId, "vercel");
  const envEntries = Object.entries(input.env_vars).map(([key, value]) => ({
    key,
    value,
    type: "encrypted",
    target: ["production", "preview"],
  }));

  const res = await fetch(`https://api.vercel.com/v10/projects/${buildData.slug}/env`, {
    method: "POST",
    headers: { Authorization: `Bearer ${vcCreds.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(envEntries),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Vercel env set failed");
  return { build_id: input.build_id, vars_set: Object.keys(input.env_vars), status: "ok" };
}

export async function execAppBuildDomainAdd(workspaceId: string, input: { build_id: string; domain: string }) {
  const { supabaseAdmin } = await import("./supabase");
  const supabase = supabaseAdmin();
  const { data: buildData, error: buildError } = await supabase
    .from("app_builds")
    .select("slug")
    .eq("id", input.build_id)
    .eq("workspace_id", workspaceId)
    .single();
  if (buildError || !buildData) throw new Error(`Build ${input.build_id} not found.`);

  const vcCreds = await getIntegrationCredentials(workspaceId, "vercel");
  const res = await fetch(`https://api.vercel.com/v10/projects/${buildData.slug}/domains`, {
    method: "POST",
    headers: { Authorization: `Bearer ${vcCreds.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: input.domain }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Vercel domain add failed");

  return {
    build_id: input.build_id,
    domain: input.domain,
    dns_records: [
      { type: "CNAME", name: input.domain.split(".").slice(0, -2).join(".") || "@", value: "cname.vercel-dns.com" },
      { type: "A", name: "@", value: "76.76.21.21" },
    ],
    message: "Domain added. Client must set the DNS records above at their registrar.",
  };
}

// ── Direct Mail ───────────────────────────────────────────────────────────────

export async function execFlyerGenerate(
  _workspaceId: string,
  input: { business_name: string; business_type: string; headline: string; offer?: string; phone?: string; address?: string; website?: string; logo_url?: string; style?: string; color_scheme?: string; format?: string }
) {
  const format = input.format ?? "postcard_front";
  const style = input.style ?? "professional";
  const colors = input.color_scheme ?? "red and black";

  const prompt = `Create a ${format.replace(/_/g, " ")} design for ${input.business_name}, a ${input.business_type}. Style: ${style}. Color scheme: ${colors}. Main headline: "${input.headline}". ${input.offer ? `Offer text: "${input.offer}".` : ""} ${input.phone ? `Phone: ${input.phone}.` : ""} ${input.address ? `Address: ${input.address}.` : ""} ${input.website ? `Website: ${input.website}.` : ""} ${input.logo_url ? `Include logo from: ${input.logo_url}.` : ""} The design should be eye-catching, print-ready at 300 DPI, with strong visual hierarchy. Bold headline, clear offer, prominent contact info.`;

  return {
    prompt,
    recommended_size: format === "postcard_front" ? "6x9 inches at 300 DPI" : "8.5x11 inches at 300 DPI",
    next_step: "Pass this prompt to higgsfield_video_generate or another image generation tool, then use the resulting image URL as front_url in direct_mail_send.",
  };
}

export async function execDirectMailEstimate(
  _workspaceId: string,
  input: { mail_type: string; size?: string; quantity: number; zip_codes?: string[]; target_type: string }
) {
  const pricing: Record<string, Record<string, number>> = {
    postcard: { "4x6": 0.45, "6x9": 0.68, "6x11": 0.85 },
    letter: { us_letter: 1.10 },
  };
  const size = input.size ?? (input.mail_type === "postcard" ? "6x9" : "us_letter");
  const unitCost = pricing[input.mail_type]?.[size] ?? 0.68;

  let quantity = input.quantity;
  if (input.target_type === "zip_code" && input.zip_codes?.length) {
    quantity = input.zip_codes.length * 800; // ~800 addresses per zip EDDM
  }

  const subtotal = unitCost * quantity;
  const postage = input.target_type === "zip_code" ? quantity * 0.203 : quantity * 0.27; // EDDM rate vs first-class
  const total = subtotal + postage;

  return {
    mail_type: input.mail_type,
    size,
    quantity,
    unit_cost: unitCost,
    postage_per_piece: input.target_type === "zip_code" ? 0.203 : 0.27,
    postage_type: input.target_type === "zip_code" ? "EDDM (Every Door Direct Mail)" : "First Class",
    subtotal: Math.round(subtotal * 100) / 100,
    postage_total: Math.round(postage * 100) / 100,
    total_estimate: Math.round(total * 100) / 100,
    zip_codes_targeted: input.zip_codes ?? [],
    note: "Estimate only. Final price from Lob.com may vary slightly. Always get CEO approval before calling direct_mail_send.",
  };
}

export async function execDirectMailSend(
  workspaceId: string,
  input: {
    mail_type: string;
    size?: string;
    front_url: string;
    back_url?: string;
    target_type: string;
    zip_codes?: string[];
    addresses?: any[];
    from_name: string;
    from_address_line1: string;
    from_city: string;
    from_state: string;
    from_zip: string;
    description?: string;
    send_date?: string;
  }
) {
  const creds = await getIntegrationCredentials(workspaceId, "lob");
  const auth = `Basic ${Buffer.from(creds.api_key + ":").toString("base64")}`;
  const size = input.size ?? "6x9";

  if (input.target_type === "zip_code" && input.zip_codes?.length) {
    // EDDM via Lob
    const results = [];
    for (const zip of input.zip_codes) {
      const res = await fetch("https://api.lob.com/v1/postcards", {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          description: input.description ?? `EDDM campaign — ${zip}`,
          size,
          front: input.front_url,
          back: input.back_url ?? input.front_url,
          to: { zip_code: zip },
          from: { name: input.from_name, address_line1: input.from_address_line1, address_city: input.from_city, address_state: input.from_state, address_zip: input.from_zip },
          ...(input.send_date ? { send_date: input.send_date } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? `Lob EDDM failed for zip ${zip}`);
      results.push({ zip, postcard_id: data.id, expected_delivery_date: data.expected_delivery_date });
    }
    return { target_type: "zip_code", zip_campaigns: results, total_zips: results.length };
  }

  // Address list
  if (!input.addresses?.length) throw new Error("Provide either zip_codes (for EDDM) or addresses (for address list targeting).");
  const results = [];
  for (const addr of input.addresses) {
    const res = await fetch("https://api.lob.com/v1/postcards", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        description: input.description ?? "CrewOS direct mail",
        size,
        front: input.front_url,
        back: input.back_url ?? input.front_url,
        to: { name: addr.name, address_line1: addr.address_line1, address_city: addr.city, address_state: addr.state, address_zip: addr.zip },
        from: { name: input.from_name, address_line1: input.from_address_line1, address_city: input.from_city, address_state: input.from_state, address_zip: input.from_zip },
        ...(input.send_date ? { send_date: input.send_date } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? `Lob postcard failed for ${addr.name}`);
    results.push({ name: addr.name, postcard_id: data.id, expected_delivery_date: data.expected_delivery_date });
  }
  return { target_type: "address_list", sent: results, total_sent: results.length };
}

export async function execDirectMailTrack(workspaceId: string, input: { postcard_id: string }) {
  const creds = await getIntegrationCredentials(workspaceId, "lob");
  const auth = `Basic ${Buffer.from(creds.api_key + ":").toString("base64")}`;
  const res = await fetch(`https://api.lob.com/v1/postcards/${input.postcard_id}`, {
    headers: { Authorization: auth },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Lob postcard tracking failed");
  return {
    postcard_id: data.id,
    status: data.status,
    expected_delivery_date: data.expected_delivery_date,
    tracking_events: data.tracking_events ?? [],
    send_date: data.send_date,
  };
}

// ── REAL ESTATE / MLS ─────────────────────────────────────────────────────────
// Uses RapidAPI — Rentcast API (api.rentcast.io via RapidAPI)
// Requires integration "rentcast" with field: rapidapi_key

async function rentcastFetch(workspaceId: string, path: string) {
  const creds = await getIntegrationCredentials(workspaceId, "rentcast");
  const res = await fetch(`https://api.rentcast.io/v1${path}`, {
    headers: {
      "X-Api-Key": creds.rapidapi_key,
      Accept: "application/json",
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? `Rentcast error: ${res.status}`);
  return data;
}

export async function execMlsPropertySearch(
  workspaceId: string,
  input: {
    city?: string;
    state?: string;
    zip_code?: string;
    min_price?: number;
    max_price?: number;
    min_beds?: number;
    max_beds?: number;
    property_type?: string;
    limit?: number;
  }
) {
  const params = new URLSearchParams();
  if (input.city) params.set("city", input.city);
  if (input.state) params.set("state", input.state);
  if (input.zip_code) params.set("zipCode", input.zip_code);
  if (input.min_price) params.set("minListPrice", String(input.min_price));
  if (input.max_price) params.set("maxListPrice", String(input.max_price));
  if (input.min_beds) params.set("bedrooms", String(input.min_beds));
  if (input.property_type) params.set("propertyType", input.property_type);
  params.set("limit", String(input.limit ?? 20));
  const data = await rentcastFetch(workspaceId, `/listings/sale?${params}`);
  return data;
}

export async function execMlsPropertyDetail(
  workspaceId: string,
  input: { address: string; city?: string; state?: string; zip_code?: string }
) {
  const params = new URLSearchParams({ address: input.address });
  if (input.city) params.set("city", input.city);
  if (input.state) params.set("state", input.state);
  if (input.zip_code) params.set("zipCode", input.zip_code);
  const data = await rentcastFetch(workspaceId, `/properties?${params}`);
  return data;
}

export async function execPropertyValuation(
  workspaceId: string,
  input: { address: string; city?: string; state?: string; zip_code?: string; property_type?: string; bedrooms?: number; bathrooms?: number; square_footage?: number }
) {
  const params = new URLSearchParams({ address: input.address });
  if (input.city) params.set("city", input.city);
  if (input.state) params.set("state", input.state);
  if (input.zip_code) params.set("zipCode", input.zip_code);
  if (input.property_type) params.set("propertyType", input.property_type);
  if (input.bedrooms) params.set("bedrooms", String(input.bedrooms));
  if (input.bathrooms) params.set("bathrooms", String(input.bathrooms));
  if (input.square_footage) params.set("squareFootage", String(input.square_footage));
  const data = await rentcastFetch(workspaceId, `/avm/value?${params}`);
  return data;
}

export async function execRentEstimate(
  workspaceId: string,
  input: { address: string; city?: string; state?: string; zip_code?: string; property_type?: string; bedrooms?: number; bathrooms?: number; square_footage?: number }
) {
  const params = new URLSearchParams({ address: input.address });
  if (input.city) params.set("city", input.city);
  if (input.state) params.set("state", input.state);
  if (input.zip_code) params.set("zipCode", input.zip_code);
  if (input.property_type) params.set("propertyType", input.property_type);
  if (input.bedrooms) params.set("bedrooms", String(input.bedrooms));
  if (input.bathrooms) params.set("bathrooms", String(input.bathrooms));
  if (input.square_footage) params.set("squareFootage", String(input.square_footage));
  const data = await rentcastFetch(workspaceId, `/avm/rent/long-term?${params}`);
  return data;
}

export async function execPropertyComps(
  workspaceId: string,
  input: { address: string; city?: string; state?: string; zip_code?: string; radius_miles?: number; days_old?: number; limit?: number }
) {
  const params = new URLSearchParams({ address: input.address });
  if (input.city) params.set("city", input.city);
  if (input.state) params.set("state", input.state);
  if (input.zip_code) params.set("zipCode", input.zip_code);
  if (input.radius_miles) params.set("radius", String(input.radius_miles));
  if (input.days_old) params.set("daysOld", String(input.days_old));
  params.set("limit", String(input.limit ?? 10));
  const data = await rentcastFetch(workspaceId, `/sales/comps?${params}`);
  return data;
}

export async function execOwnerLookup(
  workspaceId: string,
  input: { address: string; city?: string; state?: string; zip_code?: string }
) {
  const params = new URLSearchParams({ address: input.address });
  if (input.city) params.set("city", input.city);
  if (input.state) params.set("state", input.state);
  if (input.zip_code) params.set("zipCode", input.zip_code);
  const data = await rentcastFetch(workspaceId, `/properties?${params}`);
  // Extract owner fields from property record
  return {
    owner_name: data?.ownerName ?? data?.owner?.name ?? null,
    owner_occupied: data?.ownerOccupied ?? null,
    mailing_address: data?.ownerAddress ?? null,
    last_sale_date: data?.lastSaleDate ?? null,
    last_sale_price: data?.lastSalePrice ?? null,
    property: {
      address: data?.formattedAddress ?? data?.address,
      type: data?.propertyType,
      bedrooms: data?.bedrooms,
      bathrooms: data?.bathrooms,
      square_footage: data?.squareFootage,
      year_built: data?.yearBuilt,
    },
  };
}

export async function execMlsRentalListings(
  workspaceId: string,
  input: { city?: string; state?: string; zip_code?: string; min_price?: number; max_price?: number; min_beds?: number; property_type?: string; limit?: number }
) {
  const params = new URLSearchParams();
  if (input.city) params.set("city", input.city);
  if (input.state) params.set("state", input.state);
  if (input.zip_code) params.set("zipCode", input.zip_code);
  if (input.min_price) params.set("minListPrice", String(input.min_price));
  if (input.max_price) params.set("maxListPrice", String(input.max_price));
  if (input.min_beds) params.set("bedrooms", String(input.min_beds));
  if (input.property_type) params.set("propertyType", input.property_type);
  params.set("limit", String(input.limit ?? 20));
  const data = await rentcastFetch(workspaceId, `/listings/rental/long-term?${params}`);
  return data;
}

// ── RESTAURANT ────────────────────────────────────────────────────────────────
// Uses Toast POS API (integration: "toast") + Yelp Fusion API (integration: "yelp")

async function toastFetch(workspaceId: string, path: string, method = "GET", body?: any) {
  const creds = await getIntegrationCredentials(workspaceId, "toast");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${creds.api_token}`,
    "Toast-Restaurant-External-ID": creds.restaurant_guid,
    Accept: "application/json",
  };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`https://ws-api.toasttab.com${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? `Toast API error: ${res.status}`);
  return data;
}

export async function execPosOrdersList(
  workspaceId: string,
  input: { start_date?: string; end_date?: string; status?: string; limit?: number }
) {
  const params = new URLSearchParams();
  if (input.start_date) params.set("startDate", input.start_date);
  if (input.end_date) params.set("endDate", input.end_date);
  if (input.status) params.set("status", input.status);
  if (input.limit) params.set("pageSize", String(input.limit));
  const data = await toastFetch(workspaceId, `/orders/v2/orders?${params}`);
  return data;
}

export async function execMenuItemsList(
  workspaceId: string,
  input: { category?: string; availability?: string }
) {
  const data = await toastFetch(workspaceId, "/config/v2/menus");
  const menus = Array.isArray(data) ? data : [data];
  // Flatten menu items
  const items: any[] = [];
  for (const menu of menus) {
    for (const group of menu?.menuGroups ?? []) {
      for (const item of group?.menuItems ?? []) {
        if (!input.category || group.name?.toLowerCase().includes(input.category.toLowerCase())) {
          items.push({
            name: item.name,
            description: item.description,
            price: item.price,
            category: group.name,
            calories: item.calories,
            guid: item.guid,
          });
        }
      }
    }
  }
  return { total: items.length, items };
}

export async function execReservationList(
  workspaceId: string,
  input: { date?: string; status?: string; limit?: number }
) {
  const params = new URLSearchParams();
  if (input.date) params.set("date", input.date);
  if (input.status) params.set("status", input.status);
  if (input.limit) params.set("pageSize", String(input.limit));
  // Toast uses different endpoint for reservations
  const data = await toastFetch(workspaceId, `/reservations/v1/reservations?${params}`);
  return data;
}

export async function execPosRevenueReport(
  workspaceId: string,
  input: { start_date: string; end_date: string }
) {
  const params = new URLSearchParams({ startDate: input.start_date, endDate: input.end_date });
  const data = await toastFetch(workspaceId, `/reporting/v1/reports/cash?${params}`);
  return data;
}

export async function execYelpReviewsGet(
  workspaceId: string,
  input: { business_id?: string; business_name?: string; location?: string; limit?: number }
) {
  const creds = await getIntegrationCredentials(workspaceId, "yelp");
  let businessId = input.business_id;

  if (!businessId && input.business_name) {
    // Search for the business first
    const searchParams = new URLSearchParams({
      term: input.business_name,
      location: input.location ?? "USA",
      limit: "1",
    });
    const searchRes = await fetch(`https://api.yelp.com/v3/businesses/search?${searchParams}`, {
      headers: { Authorization: `Bearer ${creds.api_key}` },
    });
    const searchData = await searchRes.json();
    if (!searchRes.ok) throw new Error(searchData?.error?.description ?? "Yelp search failed");
    businessId = searchData?.businesses?.[0]?.id;
    if (!businessId) throw new Error(`No Yelp business found for "${input.business_name}"`);
  }

  if (!businessId) throw new Error("Provide business_id or business_name");

  const reviewsRes = await fetch(
    `https://api.yelp.com/v3/businesses/${businessId}/reviews?limit=${input.limit ?? 10}`,
    { headers: { Authorization: `Bearer ${creds.api_key}` } }
  );
  const reviewsData = await reviewsRes.json();
  if (!reviewsRes.ok) throw new Error(reviewsData?.error?.description ?? "Yelp reviews failed");

  // Also get business info (rating, review count)
  const bizRes = await fetch(`https://api.yelp.com/v3/businesses/${businessId}`, {
    headers: { Authorization: `Bearer ${creds.api_key}` },
  });
  const bizData = await bizRes.json();

  return {
    business_id: businessId,
    name: bizData?.name,
    rating: bizData?.rating,
    review_count: bizData?.review_count,
    reviews: (reviewsData?.reviews ?? []).map((r: any) => ({
      id: r.id,
      rating: r.rating,
      text: r.text,
      time_created: r.time_created,
      user: r.user?.name,
    })),
  };
}

// ── GOOGLE BUSINESS / LOCAL SEO ───────────────────────────────────────────────
// Uses Google Business Profile API (integration: "google_business")

export async function execGoogleBusinessReviews(
  workspaceId: string,
  input: { location_name?: string; page_token?: string; limit?: number }
) {
  const creds = await getIntegrationCredentials(workspaceId, "google_business");
  const params = new URLSearchParams({ pageSize: String(input.limit ?? 20) });
  if (input.page_token) params.set("pageToken", input.page_token);

  // List all accounts first to find account ID if not stored
  if (!creds.account_id || !creds.location_id) {
    throw new Error("Google Business integration requires account_id and location_id to be set in your integration credentials.");
  }
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/accounts/${creds.account_id}/locations/${creds.location_id}/reviews?${params}`,
    { headers: { Authorization: `Bearer ${creds.access_token}` } }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Google Business API error");
  return {
    average_rating: data?.averageRating,
    total_review_count: data?.totalReviewCount,
    reviews: (data?.reviews ?? []).map((r: any) => ({
      name: r.name,
      reviewer: r.reviewer?.displayName,
      star_rating: r.starRating,
      comment: r.comment,
      create_time: r.createTime,
      reply: r.reviewReply?.comment,
    })),
    next_page_token: data?.nextPageToken,
  };
}

export async function execGoogleBusinessReplyReview(
  workspaceId: string,
  input: { review_name: string; reply_text: string }
) {
  const creds = await getIntegrationCredentials(workspaceId, "google_business");
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${input.review_name}/reply`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment: input.reply_text }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Google Business reply failed");
  return { success: true, reply: data };
}

export async function execGoogleBusinessUpdateHours(
  workspaceId: string,
  input: { monday?: string; tuesday?: string; wednesday?: string; thursday?: string; friday?: string; saturday?: string; sunday?: string }
) {
  const creds = await getIntegrationCredentials(workspaceId, "google_business");
  if (!creds.account_id || !creds.location_id) {
    throw new Error("Google Business integration requires account_id and location_id.");
  }
  // Build periods
  const dayMap: Record<string, string> = {
    monday: "MONDAY", tuesday: "TUESDAY", wednesday: "WEDNESDAY",
    thursday: "THURSDAY", friday: "FRIDAY", saturday: "SATURDAY", sunday: "SUNDAY",
  };
  const periods: any[] = [];
  for (const [day, hours] of Object.entries(input)) {
    if (!hours) continue;
    const [open, close] = (hours as string).split("-").map(t => t.trim());
    if (!open || !close) continue;
    const [openH, openM] = open.split(":").map(Number);
    const [closeH, closeM] = close.split(":").map(Number);
    periods.push({
      openDay: dayMap[day],
      openTime: { hours: openH, minutes: openM ?? 0 },
      closeDay: dayMap[day],
      closeTime: { hours: closeH, minutes: closeM ?? 0 },
    });
  }
  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/accounts/${creds.account_id}/locations/${creds.location_id}?updateMask=regularHours`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ regularHours: { periods } }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Google Business hours update failed");
  return { success: true, location: data };
}

// ── EXECUTORS map ─────────────────────────────────────────────────────────────

export const EXECUTORS: Record<string, (workspaceId: string, input: any) => Promise<any>> = {
  // Original 36
  db_query: execDbQuery,
  db_write: execDbWrite,
  deploy: execDeploy,
  email_send: execEmailSend,
  sms_send: execSmsSend,
  users_list: execUsersList,
  users_manage: execUsersManage,
  reports_generate: execReportsGenerate,
  leads_search: execLeadsSearch,
  outreach_sequence: execOutreachSequence,
  github_commit: execGithubCommit,
  security_scan: execSecurityScan,
  voice_call: execVoiceCall,
  team_activity: execTeamActivity,
  product_trend_lookup: execProductTrendLookup,
  product_supplier_lookup: execProductSupplierLookup,
  check_supplier_stock: execCheckSupplierStock,
  scout_candidate_save: execScoutCandidateSave,
  scout_candidates_list: execScoutCandidatesList,
  shopify_product_create: execShopifyProductCreate,
  shopify_inventory_read: execShopifyInventoryRead,
  shopify_inventory_policy_set: execShopifyInventoryPolicySet,
  shopify_inventory_update: execShopifyInventoryUpdate,
  shopify_orders_list: execShopifyOrdersList,
  shopify_order_fulfill: execShopifyOrderFulfill,
  shopify_product_performance: execShopifyProductPerformance,
  shopify_product_archive: execShopifyProductArchive,
  shopify_financial_summary: execShopifyFinancialSummary,
  shopify_order_lookup: execShopifyOrderLookup,
  shopify_order_refund: execShopifyOrderRefund,
  tiktok_campaign_create: execTikTokCampaignCreate,
  tiktok_campaign_performance: execTikTokCampaignPerformance,
  meta_campaign_create: execMetaCampaignCreate,
  meta_campaign_performance: execMetaCampaignPerformance,
  google_ads_campaign_create: execGoogleAdsCampaignCreate,
  google_ads_campaign_performance: execGoogleAdsCampaignPerformance,
  // Outbound Marketing (9)
  brevo_email_send: execBrevoEmailSend,
  brevo_email_list: execBrevoEmailList,
  brevo_email_reply: execBrevoEmailReply,
  brevo_campaign_create: execBrevoCampaignCreate,
  vapi_outbound_call: execVapiOutboundCall,
  crm_lead_create: execCrmLeadCreate,
  crm_lead_update: execCrmLeadUpdate,
  crm_leads_list: execCrmLeadsList,
  calendar_book_demo: execCalendarBookDemo,
  // Rex / Higgsfield (11)
  ad_copy_research: execAdCopyResearch,
  higgsfield_brand_list: execHiggsfieldBrandList,
  higgsfield_brand_create: execHiggsfieldBrandCreate,
  higgsfield_product_add: execHiggsfieldProductAdd,
  higgsfield_product_list: execHiggsfieldProductList,
  higgsfield_ad_quote: execHiggsfieldAdQuote,
  higgsfield_ad_generate: execHiggsfieldAdStudioGenerate,
  higgsfield_ad_status: execHiggsfieldAdStatus,
  higgsfield_video_generate: execHiggsfieldVideoGenerate,
  higgsfield_job_wait: execHiggsfieldJobWait,
  tiktok_publish: execTikTokPublish,
  // App Builder (6)
  app_scaffold: execAppScaffold,
  app_build_generate: execAppBuildGenerate,
  app_build_status: execAppBuildStatus,
  app_builds_list: execAppBuildsList,
  app_build_env_set: execAppBuildEnvSet,
  app_build_domain_add: execAppBuildDomainAdd,
  // Direct Mail (4)
  flyer_generate: execFlyerGenerate,
  direct_mail_estimate: execDirectMailEstimate,
  direct_mail_send: execDirectMailSend,
  direct_mail_track: execDirectMailTrack,
  // Real Estate / MLS (7)
  mls_property_search: execMlsPropertySearch,
  mls_property_detail: execMlsPropertyDetail,
  property_valuation: execPropertyValuation,
  rent_estimate: execRentEstimate,
  property_comps: execPropertyComps,
  owner_lookup: execOwnerLookup,
  mls_rental_listings: execMlsRentalListings,
  // Restaurant (5)
  pos_orders_list: execPosOrdersList,
  menu_items_list: execMenuItemsList,
  reservation_list: execReservationList,
  pos_revenue_report: execPosRevenueReport,
  yelp_reviews_get: execYelpReviewsGet,
  // Business (Google My Business) (3)
  google_business_reviews: execGoogleBusinessReviews,
  google_business_reply_review: execGoogleBusinessReplyReview,
  google_business_update_hours: execGoogleBusinessUpdateHours,
  // Trades (16)
  trades_ein_guide: execTradesEinGuide,
  trades_state_registration_guide: execTradesStateRegistrationGuide,
  trades_license_certification_guide: execTradesLicenseCertificationGuide,
  trades_business_email_setup: execTradesBusinessEmailSetup,
  trades_business_address_setup: execTradesBusinessAddressSetup,
  trades_business_phone_setup: execTradesBusinessPhoneSetup,
  trades_business_bank_guide: execTradesBusinessBankGuide,
  trades_insurance_guide: execTradesInsuranceGuide,
  trades_estimate_template: execTradesEstimateTemplate,
  trades_invoice_template: execTradesInvoiceTemplate,
  trades_google_ads_campaign: execTradesGoogleAdsCampaign,
  trades_facebook_ads_campaign: execTradesFacebookAdsCampaign,
  trades_direct_mail_campaign: execTradesDirectMailCampaign,
  trades_yelp_nextdoor_setup: execTradesYelpNextdoorSetup,
  trades_review_request_template: execTradesReviewRequestTemplate,
  trades_promo_campaign_generate: execTradesPromoCampaignGenerate,
  // Restaurant Business Setup (16)
  restaurant_ein_guide: execRestaurantEinGuide,
  restaurant_state_registration_guide: execRestaurantStateRegistrationGuide,
  restaurant_license_permit_guide: execRestaurantLicensePermitGuide,
  restaurant_health_inspection_guide: execRestaurantHealthInspectionGuide,
  restaurant_fire_safety_guide: execRestaurantFireSafetyGuide,
  restaurant_business_email_setup: execRestaurantBusinessEmailSetup,
  restaurant_business_address_setup: execRestaurantBusinessAddressSetup,
  restaurant_business_phone_setup: execRestaurantBusinessPhoneSetup,
  restaurant_business_bank_guide: execRestaurantBusinessBankGuide,
  restaurant_servsafe_guide: execRestaurantServSafeGuide,
  restaurant_insurance_guide: execRestaurantInsuranceGuide,
  restaurant_google_ads_campaign: execRestaurantGoogleAdsCampaign,
  restaurant_facebook_ads_campaign: execRestaurantFacebookAdsCampaign,
  restaurant_menu_marketing: execRestaurantMenuMarketing,
  restaurant_review_request_template: execRestaurantReviewRequestTemplate,
  restaurant_promo_campaign_generate: execRestaurantPromoCampaignGenerate,
  // Business Setup (14)
  business_ein_guide: execBusinessEinGuide,
  business_state_registration_guide: execBusinessStateRegistrationGuide,
  business_license_permit_guide: execBusinessLicensePermitGuide,
  business_email_setup: execBusinessEmailSetup,
  business_address_setup: execBusinessAddressSetup,
  business_phone_setup: execBusinessPhoneSetup,
  business_bank_account_guide: execBusinessBankAccountGuide,
  business_website_guide: execBusinessWebsiteGuide,
  business_google_ads_campaign: execBusinessGoogleAdsCampaign,
  business_facebook_ads_campaign: execBusinessFacebookAdsCampaign,
  business_brand_guide: execBusinessBrandGuide,
  business_social_media_strategy: execBusinessSocialMediaStrategy,
  business_review_request_template: execBusinessReviewRequestTemplate,
  business_promo_campaign_generate: execBusinessPromoCampaignGenerate,
};

// ─────────────────────────────────────────────────────────────────────────────
// Trades executor functions
// ─────────────────────────────────────────────────────────────────────────────

async function execTradesEinGuide(_workspaceId: string, input: any) {
  const { business_name = "your trades business", trade_type = "your trade", owner_name = "the owner", state = "your state" } = input ?? {};
  return {
    guide: "Trades Business EIN Application Guide",
    business_name,
    trade_type,
    owner_name,
    state,
    what_is_ein: "An EIN (Employer Identification Number) is your business's federal tax ID — like a Social Security Number for your company. Required to open a business bank account, hire employees, and file business taxes.",
    cost: "Free — the IRS never charges for EINs. Any site charging a fee is a third-party middleman.",
    steps: [
      { step: 1, action: "Go to IRS.gov/ein", detail: "Navigate to irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online" },
      { step: 2, action: "Click 'Apply Online Now'", detail: "Available Mon–Fri 7am–10pm ET. The session expires after 15 minutes of inactivity, so have your info ready." },
      { step: 3, action: "Select entity type", detail: `Most trade businesses choose LLC or Sole Proprietor. If you've already formed your LLC in ${state}, select LLC. If not yet formed, select Sole Proprietor for now.` },
      { step: 4, action: "Select reason for applying", detail: "Choose 'Started a new business'." },
      { step: 5, action: "Enter business information", detail: `Business name: ${business_name}. State: ${state}. Responsible party: ${owner_name} (use your personal SSN — this is standard and secure).` },
      { step: 6, action: "Confirm and submit", detail: "Review all info, submit, and your EIN is issued instantly on screen. Print or save the EIN confirmation letter (PDF)." },
      { step: 7, action: "Save your EIN confirmation", detail: "You'll need this letter to open your business bank account and for your state business registration." },
    ],
    what_you_need: ["Full legal name (owner)", "SSN or ITIN", "Business name", "Business address", "State of formation", "Type of business entity"],
    after_ein: [
      "Open a business bank account (bring EIN letter + state LLC docs)",
      "Apply for your state contractor license using your EIN",
      "Register for state and local business taxes if required",
      "Set up payroll (if hiring) — QuickBooks, Gusto, or ADP",
    ],
    tip: "The IRS online EIN application is the only official free method. Complete it in one sitting — the session cannot be saved mid-way.",
  };
}

async function execTradesStateRegistrationGuide(_workspaceId: string, input: any) {
  const { business_name = "your trades business", state = "your state", trade_type = "your trade", entity_type = "LLC" } = input ?? {};
  return {
    guide: "Trades Business State Registration Guide",
    business_name,
    state,
    trade_type,
    recommended_entity: entity_type,
    entity_comparison: {
      LLC: {
        pros: ["Personal liability protection — your home and personal assets are protected if sued", "Pass-through taxation (profits taxed once on your personal return)", "Credibility with commercial clients", "Required by many general contractors to sub to you"],
        cons: ["State filing fee ($50–$500 depending on state)", "Annual report/renewal fee in most states", "Minor additional paperwork"],
        best_for: "Most trade contractors — especially once you have employees or are doing commercial work",
      },
      Sole_Proprietor: {
        pros: ["No formation cost or paperwork", "Simplest tax filing"],
        cons: ["Zero liability protection — you are personally liable for all business debts and lawsuits", "Harder to get commercial contracts", "No separation between personal and business credit"],
        best_for: "Very early stage only — upgrade to LLC as soon as possible",
      },
    },
    llc_formation_steps: [
      { step: 1, action: "Choose a business name", detail: `Search ${state}'s Secretary of State website to confirm "${business_name}" is available. Add LLC to the end: "${business_name} LLC"` },
      { step: 2, action: "File Articles of Organization", detail: `Go to your state's Secretary of State website and file online. Cost: $50–$500. Most states approve in 1–5 business days.` },
      { step: 3, action: "Get a Registered Agent", detail: "Every LLC needs a registered agent — a person or service with a physical address in the state to receive legal documents. Options: yourself, a family member, or a service like Northwest Registered Agent ($39–$125/yr)." },
      { step: 4, action: "Create an Operating Agreement", detail: "Not required in all states but strongly recommended. Outlines ownership, how profits are split, and what happens if a member leaves. Free templates at LegalZoom or Rocket Lawyer." },
      { step: 5, action: "Get your EIN", detail: "Apply at IRS.gov after your LLC is formed. Instant and free." },
      { step: 6, action: "Open a business bank account", detail: "Bring your Articles of Organization + EIN confirmation letter to your bank." },
      { step: 7, action: "Register for state taxes", detail: `Visit ${state}'s Department of Revenue website to register for state income tax withholding (if hiring) and sales tax (if selling materials in taxable states).` },
      { step: 8, action: "Get your contractor license", detail: `Apply for your ${state} ${trade_type} contractor license through the state contractor board. Requirements vary — see the trades_license_certification_guide tool for details.` },
    ],
    state_resources: `Search "${state} Secretary of State LLC filing" and "${state} ${trade_type} contractor license board" for your state's exact portal and fee schedule.`,
    timeline: "Typical formation: 1–2 weeks start to finish (LLC approval + EIN + bank account)",
    cost_estimate: "State LLC filing: $50–$500 | Registered agent (if using a service): $39–$125/yr | Operating agreement: Free–$150",
  };
}

async function execTradesLicenseCertificationGuide(_workspaceId: string, input: any) {
  const { trade_type = "General Contractor", state = "your state", experience_level = "Journeyman" } = input ?? {};
  const tradeInfo: Record<string, any> = {
    Electrician: {
      levels: ["Apprentice (4–5 yr apprenticeship)", "Journeyman Electrician", "Master Electrician", "Electrical Contractor (business license)"],
      national_cert: "IBEW (International Brotherhood of Electrical Workers) apprenticeship or NJATC program",
      exam: "Journeyman exam based on NEC (National Electrical Code) — state-specific",
      bonding: "Typically $10k–$25k surety bond required for contractor license",
      insurance: "General liability minimum $500k–$1M; workers' comp if employees",
    },
    Plumber: {
      levels: ["Apprentice (4–5 yr)", "Journeyman Plumber", "Master Plumber", "Plumbing Contractor"],
      national_cert: "UA (United Association) apprenticeship or PHCC programs",
      exam: "State plumbing board exam — covers IPC or UPC code depending on state",
      bonding: "$5k–$25k surety bond",
      insurance: "General liability minimum $500k–$1M",
    },
    HVAC: {
      levels: ["Apprentice", "HVAC Technician", "HVAC Mechanic", "HVAC Contractor"],
      national_cert: "EPA 608 Certification (required federally to handle refrigerants) — North American Technician Excellence (NATE) certification highly valued",
      exam: "EPA 608 exam + state HVAC contractor exam",
      bonding: "$5k–$15k",
      insurance: "General liability + EPA compliance bond",
    },
    Roofer: {
      levels: ["Laborer", "Roofer", "Roofing Contractor"],
      national_cert: "NRCA (National Roofing Contractors Association) certifications; manufacturer certifications (GAF, CertainTeed) add premium job eligibility",
      exam: "Most states require roofing contractor exam; some only require business registration",
      bonding: "$10k–$50k depending on state",
      insurance: "General liability minimum $1M; workers' comp critical for fall risk",
    },
    Carpenter: {
      levels: ["Apprentice", "Carpenter", "Master Carpenter", "General Contractor"],
      national_cert: "UBC (United Brotherhood of Carpenters) apprenticeship; AWI (Architectural Woodwork Institute) for finish work",
      exam: "Most states don't license carpenters separately — General Contractor license covers most work",
      bonding: "$5k–$25k for GC license",
      insurance: "General liability + tools & equipment coverage",
    },
    "General Contractor": {
      levels: ["Subcontractor", "Journeyman in trade", "General Contractor License"],
      national_cert: "No single national cert — state licenses control GC work; NASCLA (National Association of State Contractors Licensing Agencies) exam accepted in many states",
      exam: "NASCLA exam or state-specific GC exam; typically requires 3–5 yrs documented experience",
      bonding: "$10k–$100k depending on state and project size",
      insurance: "General liability $1M minimum; workers' comp if employees; builder's risk for large projects",
    },
  };

  const info = tradeInfo[trade_type] ?? tradeInfo["General Contractor"];
  return {
    guide: `${trade_type} License & Certification Guide — ${state}`,
    trade_type,
    state,
    current_level: experience_level,
    licensing_levels: info.levels,
    national_certifications: info.national_cert,
    exam_info: info.exam,
    bonding_requirement: info.bonding,
    insurance_requirement: info.insurance,
    general_steps: [
      { step: 1, action: "Complete required experience hours", detail: `Most ${trade_type} licenses require documented work experience. Journeyman typically needs 4–5 years; Master/Contractor typically needs 2+ years as Journeyman.` },
      { step: 2, action: "Pass the required exam", detail: `Contact the ${state} contractor licensing board to schedule your exam. Study materials available from PSI Exams, Prometric, or trade-specific prep courses.` },
      { step: 3, action: "Get bonded", detail: `Purchase a surety bond from a licensed surety company. Shop rates at SuretyBonds.com or through your insurance agent. ${info.bonding}` },
      { step: 4, action: "Get insurance", detail: `Purchase general liability and workers' comp BEFORE applying for your license — most states require proof of insurance with the application. ${info.insurance}` },
      { step: 5, action: "Submit your license application", detail: `Apply through the ${state} contractor licensing board website. Typical requirements: proof of experience, exam score, bond certificate, insurance certificate, application fee ($50–$300).` },
      { step: 6, action: "Register your business entity", detail: "Get your LLC formed and EIN before or alongside your license — many states require a business entity for the contractor license, not just your personal name." },
      { step: 7, action: "Renew on schedule", detail: "Most contractor licenses renew every 1–2 years. Set a calendar reminder — lapsed licenses can result in fines and stop-work orders on active jobs." },
    ],
    apprenticeship_programs: `Search "${trade_type} apprenticeship ${state}" or visit the US Dept of Labor's apprenticeship finder at apprenticeship.gov to find registered programs near you.`,
    pro_tip: `Getting manufacturer certifications (e.g., Carrier for HVAC, GAF for roofing, KOHLER for plumbing) lets you offer warranties customers can't get from unlicensed competitors — major selling point for residential work.`,
    state_board_search: `Search "${state} ${trade_type} contractor license board" for your exact state portal, fee schedule, and exam registration.`,
  };
}

async function execTradesBusinessEmailSetup(_workspaceId: string, input: any) {
  const { business_name = "your business", trade_type = "trades", preferred_domain = "" } = input ?? {};
  const domainSuggestion = preferred_domain || `${business_name.toLowerCase().replace(/\s+/g, "")}${trade_type.toLowerCase().replace(/\s+/g, "")}.com`;
  return {
    guide: "Trades Business Email Setup Guide",
    business_name,
    recommended_email: `info@${domainSuggestion}`,
    why_professional_email_matters: "A Gmail or Yahoo address loses commercial jobs. GCs, property managers, and commercial clients expect a domain email. It takes 30 minutes to set up and costs $6–$12/month.",
    step_1_domain: {
      title: "Buy your domain",
      providers: ["Google Domains (domains.google.com) — $12/yr", "Namecheap (namecheap.com) — $8–$15/yr", "GoDaddy (godaddy.com) — $10–$20/yr"],
      tip: `Try: ${domainSuggestion} — if taken, try ${business_name.toLowerCase().replace(/\s+/g, "")}okc.com or ${trade_type.toLowerCase().replace(/\s+/g, "")}pro.com`,
    },
    step_2_email_provider: {
      title: "Set up business email",
      options: [
        { name: "Google Workspace", cost: "$6/user/month", pros: "Gmail interface, Google Drive, Meet, Calendar — most familiar", setup: "workspace.google.com → 'Get started' → enter domain → verify with TXT record" },
        { name: "Microsoft 365 Business Basic", cost: "$6/user/month", pros: "Outlook, Teams, SharePoint", setup: "microsoft.com/microsoft-365 → connect your domain" },
        { name: "Zoho Mail (Free tier)", cost: "Free up to 5 users", pros: "Free forever for small teams", setup: "zoho.com/mail → free plan → add domain" },
      ],
    },
    recommended_email_addresses: [
      `info@${domainSuggestion} — general inquiries and website contact form`,
      `jobs@${domainSuggestion} — job applications and subcontractor outreach`,
      `billing@${domainSuggestion} — invoices and payment questions`,
    ],
    email_signature_template: `[Your Name] | [Title]\n${business_name}\n📞 [Phone] | 🌐 [Website]\n📍 [City, State]\nLicensed & Insured | [License #]`,
    pro_tip: "Add your license number and 'Licensed & Insured' to your email signature — commercial clients look for this before responding.",
  };
}

async function execTradesBusinessAddressSetup(_workspaceId: string, input: any) {
  const { business_name = "your business", state = "your state", use_home_address = false } = input ?? {};
  return {
    guide: "Trades Business Address Setup Guide",
    business_name,
    state,
    home_address_risks: use_home_address ? [
      "Your home address becomes public record when filed with the state",
      "Disqualifies you from some commercial RFPs that require a commercial address",
      "Can create zoning issues if you store equipment or vehicles at home",
      "Personal privacy concern if clients or competitors can look up your home",
    ] : [],
    options: [
      {
        option: "Virtual Mailbox (Recommended)",
        providers: ["PostScan Mail (postscanmail.com) — from $10/mo", "Anytime Mailbox (anytimemailbox.com) — from $10/mo", "iPostal1 (ipostal1.com) — from $9.99/mo"],
        pros: ["Real street address (not PO Box)", "Mail scanned and emailed to you", "Accepted by banks, IRS, and state filings", "Professional appearance"],
        best_for: "Home-based trade contractors who work out of a truck or shop",
      },
      {
        option: "Registered Agent Address",
        providers: ["Northwest Registered Agent — $39–$125/yr", "Incfile — included with LLC formation", "ZenBusiness — included with LLC formation"],
        pros: ["Satisfies state LLC requirement for registered agent", "Legal documents received and forwarded"],
        note: "Cannot use for marketing or Google Business Profile — for state registration only",
      },
      {
        option: "Commercial Office or Co-Working Space",
        examples: ["Regus (regus.com)", "WeWork (wework.com)", "Local co-working spaces"],
        pros: ["Full commercial address for all uses", "Meeting space for client consults", "Professional environment"],
        cost: "$100–$400/month for a business address tier",
      },
      {
        option: "Shop / Warehouse Address",
        note: "If you rent or own a shop, use that address for everything — Google Business Profile, state registration, bank account, license, and marketing materials.",
      },
    ],
    google_business_profile_tip: "Your Google Business Profile address is what shows up in Google Maps. Use a real, verifiable address (not a PO Box) — Google mails a verification postcard to it. Hiding your address is allowed if you're a service-area business.",
    recommended_setup: `For a home-based ${state} trade contractor: virtual mailbox for business address + registered agent service for state registration = fully professional setup for ~$30–$50/month combined.`,
  };
}

async function execTradesBusinessPhoneSetup(_workspaceId: string, input: any) {
  const { business_name = "your business", trade_type = "trades", team_size = 1 } = input ?? {};
  return {
    guide: "Trades Business Phone Setup Guide",
    business_name,
    trade_type,
    team_size,
    why_separate_number: "Never give out your personal cell for business. A dedicated number looks professional, lets you set business hours, and can be handed off if you hire someone to answer calls.",
    options: [
      {
        name: "Google Voice (Free)",
        cost: "Free for personal, $10/user/mo for business",
        pros: ["Free local number", "Rings your cell", "Voicemail transcription", "Simple"],
        cons: ["Limited features", "No call recording on free tier", "No team routing"],
        best_for: "Solo contractor just starting out",
        setup: "voice.google.com → choose a local number → link your cell",
      },
      {
        name: "OpenPhone (Recommended for small teams)",
        cost: "$15/user/month",
        pros: ["Business texting (SMS from your business number)", "Voicemail to email", "Call recording", "Shared inbox for team", "Auto-reply texts"],
        cons: ["Monthly cost"],
        best_for: "Contractors with 1–5 employees",
        setup: "openphone.com → pick a local number → invite team members",
      },
      {
        name: "RingCentral",
        cost: "$20–$35/user/month",
        pros: ["Full business phone system", "Auto-attendant ('Press 1 for service, Press 2 for billing')", "Call routing", "CRM integrations"],
        best_for: `Teams of ${team_size > 5 ? "5+" : "growing"} — when you have a dispatcher or office admin`,
      },
    ],
    voicemail_script: `"Thank you for calling ${business_name}! We're currently on a job or after hours. Please leave your name, number, and a brief description of what you need. We return all calls within [2 hours / same business day]. For urgent service, text us at this number. Thanks — we look forward to earning your business!"`,
    pro_tips: [
      "Enable text messaging — most homeowners prefer texting for quick questions",
      "Set business hours so calls after 7pm roll to voicemail automatically",
      "Use auto-reply text: 'Thanks for calling [Business Name]! We'll call you back within 2 hours. Text us anytime.'",
      "Consider an after-hours answering service (Angi Leads, Patlive) once you're busy enough to not want to miss any call",
    ],
  };
}

async function execTradesBusinessBankGuide(_workspaceId: string, input: any) {
  const { business_name = "your business", state = "your state", annual_revenue_estimate = "under $100k" } = input ?? {};
  return {
    guide: "Trades Business Bank Account Guide",
    business_name,
    state,
    annual_revenue_estimate,
    why_separate_account: "Mixing personal and business money pierces your LLC protection and makes taxes a nightmare. A separate account also builds your business credit history.",
    what_you_need_to_open: [
      "EIN confirmation letter (from IRS.gov)",
      "LLC Articles of Organization (from state filing)",
      "Operating Agreement (if you have one)",
      "Government-issued ID (driver's license)",
      "Initial deposit (varies by bank — $25–$100 typical)",
    ],
    recommended_banks: [
      {
        name: "Chase Business Complete Banking",
        monthly_fee: "$15 (waived with $2k minimum balance)",
        pros: ["Largest bank network", "Zelle for Business", "QuickBooks integration", "Strong business credit card options"],
        best_for: "Contractors wanting a traditional bank with branches everywhere",
      },
      {
        name: "Bank of America Business Advantage",
        monthly_fee: "$16 (waived with $5k average balance)",
        pros: ["Cash Rewards business card (3% back on gas/office, 2% wholesale)", "Preferred Rewards for Business program", "Good lending options"],
        best_for: "Contractors who fuel up trucks and buy materials regularly",
      },
      {
        name: "Relay (relay.fi) — Online Only",
        monthly_fee: "Free",
        pros: ["No fees, no minimums", "Multiple sub-accounts (operating, tax reserve, materials)", "Built for small businesses", "Connects to QuickBooks and Wave"],
        best_for: "Solo contractors who want zero fees and digital-first banking",
      },
      {
        name: "Bluevine Business Checking",
        monthly_fee: "Free",
        pros: ["2% APY on balances (higher than most banks)", "No fees", "Built-in invoicing"],
        best_for: "Contractors who keep cash in the account between jobs",
      },
    ],
    business_credit_card: {
      recommendation: "Apply for a business credit card the same day you open your account",
      top_picks: [
        "Chase Ink Business Cash — 5% back at office supply stores, 2% at gas stations and restaurants",
        "Bank of America Business Advantage — 3% back on a category you choose (gas, contractors supplies, etc.)",
        "Capital One Spark Cash — 2% flat cash back on everything",
      ],
      tip: "Use it for ALL business purchases (fuel, materials, tools, insurance) and pay in full monthly — builds business credit fast",
    },
    accounting_setup: {
      options: [
        { name: "Wave (wave.com)", cost: "Free", best_for: "Solo contractors just starting" },
        { name: "QuickBooks Simple Start", cost: "$17.50/mo", best_for: "Contractors sending 5–20 invoices/month" },
        { name: "QuickBooks Plus", cost: "$49.50/mo", best_for: "Contractors with employees, job costing, or inventory" },
      ],
      tip: "Set up a 'tax reserve' savings account and transfer 25–30% of every payment into it — self-employment tax hits hard if you're not prepared",
    },
  };
}

async function execTradesInsuranceGuide(_workspaceId: string, input: any) {
  const { trade_type = "General Contractor", state = "your state", has_employees = false, has_vehicles = false } = input ?? {};
  return {
    guide: `${trade_type} Business Insurance Guide — ${state}`,
    trade_type,
    state,
    required_coverages: [
      {
        type: "General Liability Insurance",
        required: true,
        description: "Covers property damage or bodily injury you cause to a client or third party on the job. If you drop a ladder through a customer's window — GL pays for it.",
        minimum_recommended: "$1,000,000 per occurrence / $2,000,000 aggregate",
        typical_cost: "$500–$2,500/year depending on revenue and trade",
        note: "Most GCs and property managers will not hire you without a valid GL certificate",
      },
      {
        type: "Workers' Compensation",
        required: has_employees,
        description: "Required by law in almost every state if you have employees. Covers medical bills and lost wages if a worker is injured on the job.",
        typical_cost: "$2–$8 per $100 of payroll, varies by trade risk",
        note: `${has_employees ? "REQUIRED — you have employees." : "Not required if you're truly solo with no W-2 employees, but verify in " + state + " — some states require it even for sole proprietors in high-risk trades."}`,
      },
      {
        type: "Surety Bond",
        required: true,
        description: "Protects clients if you fail to complete a job or cause financial harm. Required for contractor licensing in most states.",
        typical_cost: "$100–$500/year for a $10k–$25k bond",
        note: "Your license application will require proof of bonding",
      },
    ],
    optional_but_recommended: [
      {
        type: "Commercial Auto Insurance",
        needed: has_vehicles,
        description: "Covers vehicles used for business. Your personal auto policy does NOT cover accidents while using your vehicle for work.",
        typical_cost: "$1,200–$3,000/year per vehicle",
      },
      {
        type: "Tools & Equipment Coverage",
        description: "Covers theft or damage to your tools and equipment. A stolen truck full of tools can cost $10k–$50k to replace.",
        typical_cost: "$300–$800/year",
      },
      {
        type: "Commercial Umbrella",
        description: "Extra liability coverage above your GL limits. Important for larger commercial jobs.",
        typical_cost: "$500–$1,000/year for $1M additional coverage",
      },
    ],
    where_to_get_quotes: [
      "Next Insurance (nextinsurance.com) — online quotes in minutes, popular with contractors",
      "Hiscox (hiscox.com) — strong for small contractors",
      "CoverWallet (coverwallet.com) — compares multiple carriers",
      "Local independent insurance agent — best for bundling and customization",
    ],
    pro_tip: `For ${trade_type} work specifically — get your GL certificate of insurance BEFORE you start marketing. Clients will ask for it immediately, and having it shows you're a professional operation.`,
  };
}

async function execTradesEstimateTemplate(_workspaceId: string, input: any) {
  const { business_name = "Your Business", trade_type = "Trades", job_type = "Service Call", client_name = "Client", labor_hours = 8, hourly_rate = 85, materials_cost = 500 } = input ?? {};
  const labor_total = labor_hours * hourly_rate;
  const markup_pct = 0.20;
  const materials_marked_up = materials_cost * (1 + markup_pct);
  const subtotal = labor_total + materials_marked_up;
  const tax_rate = 0.085;
  const tax = subtotal * tax_rate;
  const total = subtotal + tax;
  return {
    template: "Professional Trades Job Estimate",
    business_name,
    client_name,
    job_type,
    trade_type,
    line_items: [
      { description: "Labor", qty: `${labor_hours} hrs`, rate: `$${hourly_rate}/hr`, total: `$${labor_total.toFixed(2)}` },
      { description: "Materials & Supplies", qty: "1", rate: `$${materials_cost.toFixed(2)} + 20% markup`, total: `$${materials_marked_up.toFixed(2)}` },
    ],
    subtotal: `$${subtotal.toFixed(2)}`,
    tax: `$${tax.toFixed(2)} (8.5% — adjust for your state)`,
    estimated_total: `$${total.toFixed(2)}`,
    terms: [
      "This estimate is valid for 30 days from the date issued.",
      "50% deposit required to schedule work. Balance due upon completion.",
      "Materials are subject to price changes from suppliers.",
      "Any work beyond the scope of this estimate will be quoted separately before proceeding.",
      "Estimate does not include permit fees unless stated.",
    ],
    recommended_software: [
      "Jobber (getjobber.com) — built for home service contractors, includes estimates, invoices, scheduling",
      "Housecall Pro (housecallpro.com) — similar to Jobber, strong mobile app",
      "ServiceTitan — enterprise-grade, best for larger operations",
      "QuickBooks + GoProposal — accounting + professional estimates combined",
    ],
    pro_tip: "Always get a signed estimate (digital signature via DocuSign or Jobber) before starting any job. It protects you from scope creep and 'that's not what I wanted' disputes.",
  };
}

async function execTradesInvoiceTemplate(_workspaceId: string, input: any) {
  const { business_name = "Your Business", trade_type = "Trades", client_name = "Client", job_description = "Service performed", total_amount = 1000, deposit_paid = 500, payment_due_days = 15 } = input ?? {};
  const balance_due = total_amount - deposit_paid;
  return {
    template: "Professional Trades Invoice",
    business_name,
    client_name,
    job_description,
    trade_type,
    invoice_fields: {
      invoice_number: "INV-[001] — number sequentially",
      invoice_date: "[Today's Date]",
      due_date: `[Today + ${payment_due_days} days]`,
      client_name,
      client_address: "[Client Address]",
      job_address: "[Job Site Address if different]",
    },
    financials: {
      total_contract: `$${total_amount.toFixed(2)}`,
      deposit_paid: `$${deposit_paid.toFixed(2)}`,
      balance_due: `$${balance_due.toFixed(2)}`,
      due_date: `${payment_due_days} days from invoice date`,
    },
    payment_methods: ["Check payable to: " + business_name, "Zelle: [your business phone/email]", "Venmo Business: @" + business_name.toLowerCase().replace(/\s+/g, ""), "Credit card: [Jobber/Square link]"],
    late_fee_language: `A late fee of 1.5% per month will be applied to any balance unpaid after ${payment_due_days} days.`,
    thank_you_note: `Thank you for choosing ${business_name}! We appreciate your business and look forward to serving you again.`,
    invoice_software: [
      "Jobber — sends professional invoices, tracks payment, auto-reminders",
      "QuickBooks — invoicing + accounting in one",
      "Wave (free) — unlimited invoices at no cost",
      "Square Invoices (free) — accepts card payments directly",
    ],
    pro_tip: "Send the invoice the same day the job is complete — the longer you wait, the longer you wait to get paid. Enable auto-reminders (3 days before due, day of, and 3 days after) in your invoicing software.",
  };
}

async function execTradesGoogleAdsCampaign(_workspaceId: string, input: any) {
  const { business_name = "Your Business", trade_type = "Contractor", service_area = "local area", monthly_budget = 500, services = [] } = input ?? {};
  const serviceList = services.length > 0 ? services : [`${trade_type} services`, "Emergency repairs", "Free estimates"];
  return {
    campaign: `Google Ads Strategy — ${business_name}`,
    trade_type,
    service_area,
    monthly_budget: `$${monthly_budget}`,
    priority_1: {
      name: "Google Local Services Ads (LSAs) — Start Here",
      why: "LSAs show at the very top of Google search results, above regular ads. You only pay when someone calls or messages you directly. The 'Google Guaranteed' badge builds instant trust.",
      how_to_set_up: [
        "Go to ads.google.com/local-services-ads",
        "Select your trade category",
        "Complete background check and license/insurance verification",
        "Set your weekly budget and service area",
        "Google calls you directly when leads come in",
      ],
      cost: "Pay per lead (typically $15–$75 per call depending on trade and market)",
      recommended_budget: `$${Math.round(monthly_budget * 0.5)}/month — 50% of your total budget here first`,
    },
    priority_2: {
      name: "Google Search Ads",
      keywords: serviceList.flatMap((s: string) => [
        `${s} ${service_area}`,
        `${s} near me`,
        `best ${s}`,
        `affordable ${s}`,
        `emergency ${s}`,
        `${s} cost`,
      ]),
      negative_keywords: ["DIY", "how to", "free", "school", "class", "training", "youtube"],
      ad_copy_examples: serviceList.slice(0, 2).map((s: string) => ({
        service: s,
        headline_1: `Expert ${s} in ${service_area}`,
        headline_2: `Licensed & Insured | Free Estimates`,
        headline_3: `Call Now — Same Day Available`,
        description: `${business_name} — trusted ${trade_type.toLowerCase()} serving ${service_area}. Fast response, upfront pricing. Call today for a free estimate!`,
      })),
      recommended_budget: `$${Math.round(monthly_budget * 0.5)}/month`,
    },
    landing_page_tips: [
      "Your Google Business Profile must be complete (photos, reviews, hours) before running ads",
      "Use a click-to-call button prominent on your homepage",
      "Add your license number and 'Licensed & Insured' above the fold",
      "Show real photos of your work — not stock photos",
      "Respond to all leads within 5 minutes during business hours — ads are wasted money if calls go unanswered",
    ],
    roi_expectation: `At $${monthly_budget}/month in ${service_area}, expect 10–25 qualified calls/month depending on competition. Average job value in ${trade_type}: close rate 40–60% means 4–15 new jobs/month.`,
  };
}

async function execTradesFacebookAdsCampaign(_workspaceId: string, input: any) {
  const { business_name = "Your Business", trade_type = "Contractor", service_area = "local area", monthly_budget = 300, campaign_goal = "Lead Generation" } = input ?? {};
  return {
    campaign: `Facebook & Instagram Ads Strategy — ${business_name}`,
    trade_type,
    service_area,
    monthly_budget: `$${monthly_budget}`,
    campaign_goal,
    audience_targeting: {
      location: `${service_area} — set radius to match your service area (10–25 miles)`,
      demographics: "Homeowners age 30–65 (home ownership correlates with age and income)",
      interests: ["Home improvement", "Home & Garden", "Real estate", "House & Home magazine"],
      custom_audiences: [
        "Upload your past customer email list — target them for repeat jobs and referrals",
        "Lookalike audience based on past customers — Facebook finds similar homeowners",
        "Retarget website visitors who didn't call (pixel required on your website)",
      ],
    },
    ad_formats: [
      {
        format: "Before & After Photo Carousel",
        why: "Highest engagement for trade work — people love transformations",
        caption_template: `Before → After: [Job type] in ${service_area} 🔨 Swipe to see the full transformation. Call ${business_name} for a FREE estimate! Licensed & Insured. [Phone]`,
      },
      {
        format: "Video — Job Walkthrough",
        why: "Show your process — builds trust before the first call",
        script_template: `"Hey, I'm [Name] with ${business_name}. Here's a [job type] we just completed in [neighborhood]. [30-sec walkthrough]. We serve all of ${service_area}. Call or text us for a free estimate — link in bio."`,
      },
      {
        format: "Lead Form Ad",
        why: "Homeowner fills out a form without leaving Facebook — captures name, phone, and what they need",
        questions_to_ask: ["What service do you need?", "When would you like it done?", "What's your address or zip code?"],
      },
    ],
    seasonal_campaigns: [
      { season: "Spring (Mar–May)", offer: "Spring tune-up / maintenance special — 15% off", trade_focus: "HVAC, roofing inspection, exterior painting, landscaping" },
      { season: "Summer (Jun–Aug)", offer: "Beat the heat — AC service, cooling system check", trade_focus: "HVAC, plumbing, electrical for pools/outdoor kitchens" },
      { season: "Fall (Sep–Nov)", offer: "Get ready for winter — heating system check, weatherproofing", trade_focus: "HVAC, insulation, roofing, gutters" },
      { season: "Winter (Dec–Feb)", offer: "Emergency service available 24/7 — pipe burst, heating failure", trade_focus: "Plumbing, HVAC, electrical" },
    ],
    budget_allocation: {
      lead_generation_ads: `$${Math.round(monthly_budget * 0.60)}/month`,
      retargeting_website_visitors: `$${Math.round(monthly_budget * 0.25)}/month`,
      brand_awareness_video: `$${Math.round(monthly_budget * 0.15)}/month`,
    },
    pro_tip: "Respond to every Facebook lead within 5 minutes — studies show contact rate drops 10x after 5 minutes. Set up text alerts for new leads and call immediately.",
  };
}

async function execTradesDirectMailCampaign(_workspaceId: string, input: any) {
  const { business_name = "Your Business", trade_type = "Contractor", service_area = "local area", offer = "Free estimate", season = "Year-round" } = input ?? {};
  return {
    campaign: `Direct Mail Campaign Strategy — ${business_name}`,
    trade_type,
    service_area,
    offer,
    season,
    why_direct_mail_works_for_trades: "Homeowners keep a useful postcard on the fridge or bulletin board. A plumber's magnet with your number on it gets calls for years. Direct mail has zero competition in the mailbox on the day it arrives — unlike digital ads.",
    eddm_guide: {
      title: "EDDM — Every Door Direct Mail (USPS)",
      description: "Mail to every home in a zip code or mail carrier route — no list required. USPS delivers it for ~$0.20–$0.23 per piece.",
      steps: [
        "Go to usps.com/eddm",
        "Click 'EDDM Retail'",
        "Search your target zip codes or draw a radius around your shop",
        "Select mail routes (see household count per route)",
        "Design a 6x11 or 6.5x9 postcard (minimum size for EDDM)",
        "Print at Got Print (gotprint.com) or Vistaprint ($0.05–$0.12/card for 1000+)",
        "Bundle in groups of 100 with facing slips, drop at your local post office",
      ],
      cost_estimate: "1,000 postcards: $50–$120 printing + $200–$230 postage = ~$270–$350 total to reach 1,000 homes",
    },
    postcard_copy_template: {
      headline: `🔧 ${offer} — ${business_name}`,
      subheadline: `${trade_type} Services in ${service_area}`,
      body: `Serving homeowners in [city/neighborhood] for [X] years. Licensed & Insured.\n\n✅ Fast response\n✅ Upfront pricing\n✅ 5-star rated\n\n${offer}!`,
      cta: "Call or Text: [Phone Number]",
      footer: `${business_name} | [Phone] | [Website] | License #[Number]`,
    },
    targeting_strategy: {
      best_neighborhoods: "Target zip codes with median home values $200k–$500k — owners have equity and money to maintain/improve",
      best_times: {
        Spring: "February/March drop — catch homeowners before they hire for spring projects",
        Summer: "May drop for AC/cooling work",
        Fall: "August/September — heating prep",
        Winter: "November for holiday lighting, December for emergency services awareness",
      },
      frequency: "Mail the same zip code 3 times over 6 weeks — recognition builds with repetition",
    },
    magnet_alternative: "Consider a business card magnet instead of a postcard — $0.15–$0.25 each but stays on the fridge for years. Great for plumbers, HVAC, electricians — emergency trades where you want to be the first call.",
    pro_tip: "Include a QR code linking to your Google Business Profile so recipients can immediately read reviews and call from their phone.",
  };
}

async function execTradesYelpNextdoorSetup(_workspaceId: string, input: any) {
  const { business_name = "Your Business", trade_type = "Contractor", service_area = "local area", phone_number = "", website = "" } = input ?? {};
  return {
    guide: "Yelp & Nextdoor Setup Guide for Trades Contractors",
    business_name,
    trade_type,
    service_area,
    yelp_setup: {
      why: "Yelp drives high-intent homeowners — people searching Yelp for a contractor are ready to hire, not just browsing.",
      steps: [
        "Go to biz.yelp.com → 'Add your business'",
        `Search for ${business_name} to check if a listing already exists (customers sometimes create them)`,
        "Select your business category (Contractors, Plumbers, Electricians, etc.)",
        "Enter: business name, phone, address, website, service area",
        "Upload at least 5 photos — before/after work, team, truck/equipment",
        "Write a 'From the Business' description: who you are, what you specialize in, years of experience, license number",
        "Verify the listing via phone call or postcard",
        "Request reviews from past happy customers via Yelp's 'Request a Review' email tool",
      ],
      yelp_ads_note: "Yelp will push you to buy ads immediately. Start by optimizing your free profile for 30–60 days first to build reviews before spending on ads — reviews are what convert.",
      responding_to_reviews: "Respond to every review — thank the positives, address negatives professionally. A thoughtful response to a 2-star review often impresses future customers more than a 5-star review.",
    },
    nextdoor_setup: {
      why: "Nextdoor is hyper-local — homeowners asking their actual neighbors for contractor recommendations. A recommendation on Nextdoor from a real neighbor is the highest-trust referral possible.",
      steps: [
        "Go to business.nextdoor.com → 'Claim your free business page'",
        "Verify your business address",
        "Complete your profile: business name, services, service area, phone, website",
        "Add photos and a description",
        "Enable 'Local Deals' to post occasional offers",
        "Ask satisfied customers to recommend you on Nextdoor (huge impact in their neighborhood feed)",
      ],
      nextdoor_strategy: [
        "Ask every completed customer to post a Nextdoor recommendation — it appears to all their neighbors automatically",
        "Monitor for neighborhood posts asking for contractor recommendations — you or a team member can reply",
        "Post before/after photos as 'Business Updates' — appears in local feeds",
        "Run a Nextdoor Local Deal for slow seasons: '$25 off your first service call for Nextdoor neighbors'",
      ],
    },
    google_business_profile: {
      reminder: "Google Business Profile (formerly Google My Business) is more important than both Yelp and Nextdoor combined for contractors. Make sure it is fully set up and verified FIRST before focusing on Yelp and Nextdoor.",
      key_actions: ["Verify your listing", "Add 10+ photos", "Set exact service areas", "Enable messaging", "Respond to every review within 24 hours"],
    },
    review_volume_goal: "Aim for: 10 Google reviews, 5 Yelp reviews, and 3 Nextdoor recommendations in your first 90 days. This establishes credibility that converts visitors into callers.",
  };
}

async function execTradesReviewRequestTemplate(_workspaceId: string, input: any) {
  const { business_name = "Your Business", trade_type = "Contractor", client_name = "there", job_type = "the work", review_platform = "Google" } = input ?? {};
  const platformLinks: Record<string, string> = {
    Google: "your Google Business Profile review link (get it from business.google.com → 'Get more reviews')",
    Yelp: "your Yelp review link (biz.yelp.com → share → write a review link)",
    Facebook: "your Facebook Page review tab link",
    All: "your preferred review platform",
  };
  return {
    templates: {
      sms: {
        send_timing: "Within 2 hours of job completion — before the customer has moved on to the next thing",
        message: `Hi ${client_name}! It was great working with you on ${job_type} today. If you're happy with the work, would you mind leaving us a quick Google review? It only takes 2 minutes and means the world to a small business. Here's the link: [REVIEW LINK]. Thanks so much! — ${business_name}`,
        follow_up_sms: `(3 days later if no review): Hey ${client_name}, just checking in — hope everything with ${job_type} is still going great! If you get a chance, that review would really help us out. [REVIEW LINK] — ${business_name}`,
      },
      email: {
        subject: `How did we do? — ${business_name}`,
        body: `Hi ${client_name},\n\nThank you for trusting ${business_name} with ${job_type}. It was a pleasure working with you!\n\nWe'd love to hear about your experience. If you have 2 minutes, a quick review on ${review_platform} helps other homeowners find a trustworthy contractor — and it means a lot to our small business.\n\n👉 Leave a review here: [${platformLinks[review_platform]}]\n\nIf there's anything we could have done better, please reply to this email directly — we want to make it right.\n\nThank you again!\n[Your Name]\n${business_name}\n[Phone] | [Website]\nLicensed & Insured`,
      },
      in_person_script: `"Hey [client name], glad everything looks good! Hey, would you do me a favor? If you're happy with the work, would you mind leaving us a Google review? I'll text you the link right now — takes about 2 minutes and really helps us out."`,
    },
    platform_link: platformLinks[review_platform],
    timing_strategy: [
      "Best time: Same day as job completion, within 2 hours",
      "SMS performs better than email for review requests (70% open rate vs 20%)",
      "Don't ask on the invoice — ask in person first, then follow up with SMS",
      "Never offer incentives for reviews (violates Google/Yelp ToS)",
      "Aim for 1 new review per week — steady pace looks natural to Google's algorithm",
    ],
    what_to_do_with_reviews: [
      "Screenshot 5-star reviews and post on Instagram/Facebook as social proof",
      "Respond to every review (5-star and below) within 24 hours",
      "Add top reviews to your website testimonials section",
      "Share a 'Thank you' reply on Nextdoor when a neighbor recommends you",
    ],
  };
}

async function execTradesPromoCampaignGenerate(_workspaceId: string, input: any) {
  const { business_name = "Your Business", trade_type = "Contractor", campaign_name = "Seasonal Promo", offer = "15% off", start_date = "TBD", end_date = "TBD", channels = ["Google Ads", "Facebook", "Email", "SMS"] } = input ?? {};
  return {
    campaign: `${campaign_name} — ${business_name}`,
    trade_type,
    offer,
    duration: `${start_date} → ${end_date}`,
    channels,
    campaign_brief: {
      objective: `Drive service calls and booked jobs for ${business_name} during the campaign period`,
      target_audience: `Homeowners in [service area] needing ${trade_type} services`,
      offer_details: offer,
      key_message: `${business_name} — trusted ${trade_type.toLowerCase()} + ${offer}. Licensed & Insured. Book now before spots fill up.`,
      urgency_element: `Offer expires ${end_date} — limited availability`,
    },
    channel_playbook: channels.map((channel: string) => ({
      channel,
      content: channel === "Google Ads"
        ? { action: "Update ad headlines to feature offer", headline: `${offer} — Book Before ${end_date}`, note: "Add promotion extension in Google Ads showing offer and expiry" }
        : channel === "Facebook" || channel === "Instagram"
        ? { action: "Run before/after carousel with offer overlay", caption: `🔥 Limited time: ${offer} on all ${trade_type.toLowerCase()} jobs! Book by ${end_date}. Call ${business_name} today — Licensed & Insured. [Phone]`, budget: "$150–$300 for campaign duration" }
        : channel === "Email"
        ? { subject: `[Limited Time] ${offer} on ${trade_type} Services — ${business_name}`, preview: `Don't miss this — offer ends ${end_date}`, cta: "Book Your Free Estimate", send_schedule: [`Launch day: Full offer announcement`, `Midpoint: 'Only X days left' reminder`, `Final day: 'Last chance' with urgency`] }
        : channel === "SMS"
        ? { message: `🔧 ${business_name}: ${offer} on ${trade_type.toLowerCase()} jobs this month! Reply YES for a free estimate or call [Phone]. Offer ends ${end_date}.`, timing: "Send at 10am on campaign launch day + reminder 3 days before end" }
        : channel === "Direct Mail"
        ? { format: "6x9 postcard", headline: `${offer} — ${campaign_name}`, drop_date: `2 weeks before ${start_date}`, target: "Top zip codes in service area" }
        : { action: `Post campaign offer to ${channel}`, timing: "Launch day and midpoint" },
    })),
    follow_up_sequence: [
      "Day of inquiry: Call back within 5 minutes, mention the specific offer they saw",
      "Same day: Send estimate via text or email with offer amount clearly shown",
      "Day 2 (if no response): Follow-up text: 'Hi [name], just following up on your estimate for [job type]. Happy to answer any questions!'",
      "Day 5: Final follow-up call — 'We have an opening next week, would you like to lock it in before the promotion ends?'",
    ],
    success_metrics: {
      track: ["Number of inbound calls (before/during/after)", "Cost per lead by channel", "Close rate on campaign leads vs. regular leads", "Revenue directly attributed to campaign period"],
      review_after: "7 days into campaign — pause any channel spending less than 1x ROI, double down on what's working",
    },
    pro_tip: `For ${trade_type} businesses, Google LSAs + SMS to your past customer list is typically the highest-ROI combination for a short-term promo campaign. Start there before spending on Facebook or direct mail.`,
  };
}
// ─────────────────────────────────────────────────────────────────────────────
// Restaurant Business Setup executor functions
// ─────────────────────────────────────────────────────────────────────────────

async function execRestaurantEinGuide(_workspaceId: string, input: any) {
  const { business_name = "your restaurant", restaurant_type = "restaurant", owner_name = "the owner", state = "your state" } = input ?? {};
  return {
    guide: "Restaurant Business EIN Application Guide",
    business_name,
    restaurant_type,
    what_is_ein: "An EIN (Employer Identification Number) is your restaurant's federal tax ID — required to open a business bank account, hire staff, set up payroll, apply for licenses, and file business taxes. Free and instant from the IRS.",
    cost: "Free — IRS never charges. Any site charging a fee is a middleman. Only use irs.gov.",
    steps: [
      { step: 1, action: "Go to IRS.gov/ein", detail: "Navigate to irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online — available Mon–Fri 7am–10pm ET." },
      { step: 2, action: "Select entity type", detail: `If you've formed an LLC in ${state}, select LLC. If you're a sole proprietor just starting, select Sole Proprietor. Most restaurant owners should have an LLC for liability protection.` },
      { step: 3, action: "Select reason", detail: "Choose 'Started a new business'." },
      { step: 4, action: "Enter your info", detail: `Business name: ${business_name}. State: ${state}. Responsible party: ${owner_name} (your personal SSN — standard and secure). Business address: your restaurant location or virtual mailbox.` },
      { step: 5, action: "Submit and save your EIN", detail: "EIN is issued instantly. Print or PDF the confirmation letter — you'll need it for your bank account, liquor license application, vendor accounts, and state tax registration." },
    ],
    what_you_need: ["Full legal name", "Social Security Number (SSN) or ITIN", "Business name", "Restaurant address", "State of formation", "Entity type"],
    after_ein: [
      "Open a business bank account — bring EIN letter + LLC Articles of Organization",
      "Register for state sales tax (restaurants typically collect sales tax on food/beverage)",
      "Set up payroll if hiring — Gusto, ADP, or QuickBooks Payroll",
      "Apply for liquor license (if serving alcohol) — requires EIN",
      "Register with your city/county for business license using your EIN",
    ],
    restaurant_specific_tip: `${restaurant_type === "food truck" ? "Food truck operators: register your EIN before applying for your mobile food vendor permit — many cities require it." : "Brick-and-mortar restaurants: your EIN goes on every vendor account, your health department permit application, and your liquor license if applicable."}`,
  };
}

async function execRestaurantStateRegistrationGuide(_workspaceId: string, input: any) {
  const { business_name = "your restaurant", state = "your state", restaurant_type = "restaurant", entity_type = "LLC" } = input ?? {};
  return {
    guide: "Restaurant Business State Registration Guide",
    business_name, state, restaurant_type,
    why_llc_matters_for_restaurants: "Restaurants face higher liability than most businesses — a customer slipping, a foodborne illness claim, or an employee injury can be catastrophic personally if you have no entity protection. An LLC shields your personal home, savings, and assets.",
    llc_formation_steps: [
      { step: 1, action: "Name check", detail: `Search ${state}'s Secretary of State website to confirm "${business_name} LLC" is available.` },
      { step: 2, action: "File Articles of Organization", detail: `File online at your ${state} Secretary of State website. Cost: $50–$500. Approval: 1–10 business days.` },
      { step: 3, action: "Get a Registered Agent", detail: "Required in every state. Options: yourself, Northwest Registered Agent ($39–$125/yr), or your attorney." },
      { step: 4, action: "Create an Operating Agreement", detail: "Defines ownership percentages, how profits are split, who makes decisions. Critical if you have partners or investors." },
      { step: 5, action: "Get your EIN", detail: "Apply at IRS.gov after LLC is formed. Instant and free." },
      { step: 6, action: "Open a business bank account", detail: "Bring Articles of Organization + EIN letter. Never mix personal and restaurant money." },
      { step: 7, action: "Register for state sales tax", detail: `Most states require restaurants to collect sales tax on food and beverage. Register at ${state}'s Department of Revenue website.` },
      { step: 8, action: "Get your local business license", detail: "Your city or county requires a general business license to operate. Apply at your city hall or county clerk's office." },
    ],
    timeline: "LLC formation + EIN + bank account: 1–2 weeks total",
    cost_estimate: "State filing: $50–$500 | Registered agent: $39–$125/yr | Operating agreement: Free–$300",
  };
}

async function execRestaurantLicensePermitGuide(_workspaceId: string, input: any) {
  const { state = "your state", restaurant_type = "restaurant", serves_alcohol = false, is_food_truck = false } = input ?? {};
  return {
    guide: `Restaurant License & Permit Checklist — ${state}`,
    state, restaurant_type,
    critical_note: "Every permit has its own timeline. Some (especially liquor licenses) take 60–120 days. Start the full permit process at least 3–6 months before your target opening date.",
    required_permits: [
      { permit: "Business License", issued_by: "City or County Clerk", timeline: "1–2 weeks", cost: "$50–$400" },
      { permit: "Food Service Establishment Permit / Health Permit", issued_by: `${state} Department of Health`, timeline: "2–6 weeks (includes inspection)", cost: "$100–$1,000" },
      { permit: "Food Handler Cards", issued_by: "State Health Department", timeline: "1–3 days per employee", cost: "$10–$30 per employee" },
      { permit: "Food Manager Certification (ServSafe)", issued_by: "National Restaurant Association", timeline: "1–2 days", cost: "$35–$175" },
      { permit: "Seller's Permit / Sales Tax Permit", issued_by: `${state} Department of Revenue`, timeline: "Immediate to 2 weeks", cost: "Usually free" },
      { permit: "Certificate of Occupancy (CO)", issued_by: "Local Building Department", timeline: "2–8 weeks after build-out", cost: "$100–$500" },
      ...(serves_alcohol ? [{ permit: "Liquor License", issued_by: `${state} ABC Board`, timeline: "60–120 days", cost: "$300–$14,000+" }] : []),
      ...(is_food_truck ? [{ permit: "Mobile Food Vendor Permit", issued_by: "City/County Health Department", timeline: "2–4 weeks", cost: "$100–$500" }] : []),
    ],
    recommended_order: [
      "1. Form your LLC and get your EIN",
      "2. Apply for liquor license IMMEDIATELY if serving alcohol — longest timeline",
      "3. Secure your commercial lease",
      "4. Begin build-out / kitchen installation",
      "5. Apply for business license and seller's permit",
      "6. Complete build-out and schedule health inspection",
      "7. Get all staff food handler cards before health inspection",
      "8. Schedule fire marshal inspection",
      "9. Receive Certificate of Occupancy",
      "10. Open!",
    ],
  };
}

async function execRestaurantHealthInspectionGuide(_workspaceId: string, input: any) {
  const { state = "your state", restaurant_type = "restaurant" } = input ?? {};
  return {
    guide: `Restaurant Health Inspection Prep Guide — ${state}`,
    state, restaurant_type,
    what_inspectors_check: {
      temperature_control: { title: "Temperature Control (Most Common Violations)", items: ["Cold holding: all refrigerated foods at 41°F or below", "Hot holding: cooked food at 135°F or above", "Cooking temps: poultry 165°F, ground beef 155°F, pork/fish 145°F", "Thermometers in every fridge/freezer"] },
      personal_hygiene: { title: "Personal Hygiene", items: ["Handwashing sinks stocked with soap and paper towels", "No bare-hand contact with ready-to-eat food", "Hair restraints for all food handlers", "Sick employee policy in place"] },
      cross_contamination: { title: "Cross-Contamination Prevention", items: ["Color-coded cutting boards by protein type", "Raw meat stored BELOW ready-to-eat foods", "Raw chicken on the BOTTOM shelf of every cooler"] },
      sanitation: { title: "Sanitation & Cleaning", items: ["Three-compartment sink: wash → rinse → sanitize", "Sanitizer test strips visible and in use", "Food contact surfaces sanitized every 4 hours"] },
      pest_control: { title: "Pest Control", items: ["No evidence of rodents or cockroaches", "All gaps and cracks sealed", "Monthly pest control service contract on file"] },
    },
    day_before_checklist: [
      "✅ Check every fridge and freezer temperature",
      "✅ Verify date labels on all stored food",
      "✅ Check sanitizer buckets and test with strips",
      "✅ Restock all handwashing stations",
      "✅ Walk the walk-in cooler — raw meat on bottom",
      "✅ Check under all equipment for debris or pest evidence",
      "✅ Verify probe thermometer is calibrated",
      "✅ Make sure all staff food handler cards are current",
    ],
    pro_tip: "Treat every day like an inspection day — not just the week before. Inspectors can and do show up unannounced.",
  };
}

async function execRestaurantFireSafetyGuide(_workspaceId: string, input: any) {
  const { state = "your state", restaurant_type = "restaurant", seating_capacity = 50 } = input ?? {};
  return {
    guide: `Restaurant Fire Safety & Code Compliance Guide — ${state}`,
    state, restaurant_type, seating_capacity,
    key_systems: [
      { system: "Commercial Hood & Suppression System", required: true, cost: "Installation: $3,000–$10,000+ | Semi-annual inspection: $150–$400", notes: "Required over ALL cooking equipment. Must be inspected every 6 months." },
      { system: "Fire Extinguishers", required: true, cost: "$50–$150 per unit | Annual inspection: $20–$60", notes: "Class K in kitchen (grease fires). Class ABC in dining areas." },
      { system: "Sprinkler System", required: seating_capacity > 49, notes: `Required for most restaurants over 49 occupancy. Cost: $1–$3/sq ft to install.` },
      { system: "Emergency Lighting & Exit Signs", required: true, notes: "All exits marked with illuminated signs. Battery backup required." },
    ],
    inspection_steps: [
      { step: 1, action: "Grease duct cleaning", detail: "High-volume cooking: quarterly. Moderate: semi-annually. Keep cleaning log." },
      { step: 2, action: "Hood system certification", detail: "Get suppression system inspected and tagged. Expired tags = failed inspection." },
      { step: 3, action: "Extinguisher check", detail: "Verify all extinguishers have current annual inspection tags and are mounted/accessible." },
      { step: 4, action: "Exit walk-through", detail: "Doors open freely, signs lit, no obstructions. Test emergency lighting." },
      { step: 5, action: "Schedule fire marshal inspection", detail: "Required before receiving Certificate of Occupancy in most cities." },
    ],
    cost_to_comply: "Existing compliant space: $500–$2,000/year. New build-out: $5,000–$25,000+",
  };
}

async function execRestaurantBusinessEmailSetup(_workspaceId: string, input: any) {
  const { business_name = "your restaurant", restaurant_type = "restaurant", preferred_domain = "" } = input ?? {};
  const slug = business_name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const domainSuggestion = preferred_domain || `${slug}.com`;
  return {
    guide: "Restaurant Business Email Setup Guide",
    business_name, recommended_domain: domainSuggestion,
    why_professional_email: "A Gmail address loses you catering contracts, vendor credit accounts, and credibility. A branded email takes 30 minutes and $6–$12/month.",
    email_provider: { recommended: "Google Workspace", cost: "$6/user/month", setup: "workspace.google.com → Get started → connect your domain" },
    recommended_addresses: [
      `info@${domainSuggestion} — general inquiries`,
      `reservations@${domainSuggestion} — reservation requests`,
      `catering@${domainSuggestion} — catering and private events (major revenue)`,
      `orders@${domainSuggestion} — online order confirmations`,
      `manager@${domainSuggestion} — vendor correspondence`,
    ],
    email_signature_template: `[Name] | [Title]\n${business_name}\n📞 [Phone] | 🌐 [Website]\n📍 [Address] | 🍽️ Hours: [Hours]`,
    catering_tip: "Put catering@domain on your menu, website, and Google Business Profile — catering is the highest-margin revenue for most restaurants.",
  };
}

async function execRestaurantBusinessAddressSetup(_workspaceId: string, input: any) {
  const { business_name = "your restaurant", state = "your state", has_physical_location = true } = input ?? {};
  return {
    guide: "Restaurant Business Address Setup Guide",
    business_name, state,
    primary_address: has_physical_location
      ? { use: "Your restaurant location is your primary business address — use it for LLC filing, EIN, bank account, health permit, Google Business Profile, website, and marketing.", google_business: "Verify your Google Business Profile with the postcard Google mails to your restaurant address. This is the most important local marketing asset you have." }
      : { use: "Food truck or virtual restaurant — you need a physical address for LLC and bank account that is NOT a PO Box.", options: ["Virtual Mailbox (PostScan Mail, Anytime Mailbox) — real street address, from $10/mo", "Commissary kitchen address — many food trucks use their commissary", "Registered Agent address — works for LLC filing but NOT for Google Business Profile"] },
    registered_agent: { description: "Your LLC needs a registered agent with a physical address in your state.", options: ["Yourself (at your restaurant address)", "Northwest Registered Agent ($39–$125/yr)", "Your attorney"] },
  };
}

async function execRestaurantBusinessPhoneSetup(_workspaceId: string, input: any) {
  const { business_name = "your restaurant", restaurant_type = "restaurant", takes_reservations = true } = input ?? {};
  return {
    guide: "Restaurant Business Phone Setup Guide",
    business_name, restaurant_type,
    why_dedicated_phone: "Your personal cell on a restaurant door gets called at 11pm on your day off. A dedicated number lets you set hours, route calls, and hand it off to staff.",
    options: [
      { name: "Google Voice", cost: "Free / $10/user/mo business", best_for: "Food truck or solo operator just starting" },
      { name: "OpenPhone (Recommended)", cost: "$15/user/month", pros: ["Shared number team can all answer", "Business texting", "Auto-reply SMS", "Hours-based routing"], best_for: "Small restaurant team (2–10 staff)" },
      { name: "RingCentral", cost: "$20–$35/user/month", pros: ["Auto-attendant", "Multiple extensions"], best_for: "Larger operation with high phone volume" },
    ],
    voicemail_script: `"Thank you for calling ${business_name}! ${takes_reservations ? "For reservations, press 1 or visit [website]. " : ""}For catering inquiries, press 2. For hours and location, press 3. To speak with someone, please call back during business hours: [hours]."`,
    sms_strategy: ["Text reservation confirmations", "Text VIP customers about daily specials", "Send order-ready notifications for takeout", "Send review requests after dine-in"],
  };
}

async function execRestaurantBusinessBankGuide(_workspaceId: string, input: any) {
  const { business_name = "your restaurant", state = "your state", has_employees = false } = input ?? {};
  return {
    guide: "Restaurant Business Bank Account Guide",
    business_name, state,
    why_separate_account: "Restaurants are high-volume cash businesses. Mixing personal and business money creates a tax nightmare, voids your LLC protection, and makes it impossible to track food cost, labor cost, and profit.",
    what_to_bring: ["EIN confirmation letter (from IRS.gov)", "LLC Articles of Organization", "Operating Agreement", "Government-issued ID", "Initial deposit ($25–$100)"],
    recommended_banks: [
      { name: "Chase Business Complete Banking", monthly_fee: "$15 (waived with $2k min balance)", best_for: "Full-service restaurant with regular cash deposits" },
      { name: "Bank of America Business Advantage", monthly_fee: "$16 (waived with $5k avg balance)", best_for: "Restaurant planning to get SBA loan" },
      { name: "Relay (relay.fi) — Online Only", monthly_fee: "Free", pros: ["Multiple sub-accounts", "No fees or minimums", "Connects to QuickBooks"], best_for: "Lean operation that wants zero fees" },
    ],
    cash_flow_tips: [
      "Set up a 'Tax Reserve' sub-account — transfer 25–30% of net revenue every week",
      "Set up a 'Payroll' sub-account — fund it before each pay period",
      "Set up a 'Food Cost Reserve' sub-account — fund weekly to cover next week's food orders",
      "Review your bank balance EVERY morning",
    ],
    accounting: { recommended: "QuickBooks Online ($17.50–$49.50/mo)", why: "Integrates with Toast, Square, and your bank. Restaurant-specific chart of accounts." },
  };
}

async function execRestaurantServSafeGuide(_workspaceId: string, input: any) {
  const { state = "your state", number_of_staff = 5 } = input ?? {};
  return {
    guide: `ServSafe Food Safety Certification Guide — ${state}`,
    state, number_of_staff,
    two_levels: {
      food_handler: { name: "Food Handler Card", who_needs_it: "Every employee who handles food", how_to_get: ["ServSafe Food Handler (servsafe.com) — online, ~2 hrs, $15", "StateFoodSafety.com — $10–$20"], cost: "$10–$30 per employee", valid_for: "3 years in most states" },
      food_manager: { name: "Food Protection Manager Certification (ServSafe Manager)", who_needs_it: "At least one certified manager per establishment in most states", how_to_get: ["servsafe.com/managers — online or in-person, $179 (includes study materials + proctored exam)", "90 multiple-choice questions, 70% passing score"], cost: "$35–$175 for exam", valid_for: "5 years", study_tip: "The ServSafe Manager textbook IS the exam. Know the book, pass the exam. Allow 8–12 hours of study." },
    },
    staff_budget: `For ${number_of_staff} staff: budget ~$${number_of_staff * 20}–$${number_of_staff * 30} for food handler cards. Keep copies on file — inspectors will ask.`,
    training_plan: {
      new_hire_day_1: ["Personal hygiene and handwashing", "Proper food storage (raw below ready-to-eat, FIFO labeling)", "Temperature requirements for their role"],
      week_1: ["Cross-contamination prevention", "Cleaning and sanitizing procedures"],
      ongoing: "Monthly 10-minute food safety refresher at staff meetings",
    },
  };
}

async function execRestaurantInsuranceGuide(_workspaceId: string, input: any) {
  const { restaurant_type = "restaurant", state = "your state", serves_alcohol = false, has_employees = false } = input ?? {};
  return {
    guide: `Restaurant Insurance Guide — ${state}`,
    restaurant_type, state,
    critical_coverages: [
      { type: "General Liability Insurance", required: true, description: "Covers bodily injury and property damage — a customer slips, staff breaks client property during catering.", minimum_recommended: "$1M per occurrence / $2M aggregate", typical_cost: "$800–$3,000/year", note: "Your commercial landlord requires this before you sign the lease." },
      { type: "Commercial Property Insurance", required: true, description: "Covers equipment, furniture, and inventory against fire, theft, vandalism.", typical_cost: "$1,000–$5,000/year", note: "Make sure your policy covers food spoilage." },
      { type: "Workers' Compensation", required: has_employees, description: "Required by law if you have employees. Covers medical bills for staff injured on the job.", typical_cost: "$3–$8 per $100 of payroll" },
      ...(serves_alcohol ? [{ type: "Liquor Liability Insurance", required: true, description: "Covers claims from serving alcohol — customer accident after drinking at your restaurant.", typical_cost: "$500–$3,000/year", note: "Required for your liquor license application in most states." }] : []),
      { type: "Business Interruption Insurance", required: false, description: "Replaces lost income if you close due to fire, flood, or equipment failure.", typical_cost: "$500–$2,000/year" },
    ],
    restaurant_bop: { name: "Business Owner's Policy (BOP) — Restaurant Package", description: "Bundles GL + property + business interruption at a discount.", typical_cost: "$2,000–$8,000/year for a small restaurant" },
    where_to_quote: ["Next Insurance (nextinsurance.com)", "Hiscox (hiscox.com)", "The Hartford (thehartford.com)", "Local independent insurance agent"],
  };
}

async function execRestaurantGoogleAdsCampaign(_workspaceId: string, input: any) {
  const { business_name = "Your Restaurant", service_area = "local area", monthly_budget = 400, cuisine_type = "food" } = input ?? {};
  return {
    campaign: `Google Ads Strategy — ${business_name}`,
    service_area, monthly_budget: `$${monthly_budget}`,
    priority_1_google_business_profile: {
      title: "Google Business Profile — Do This First (Free)",
      why: "'Restaurants near me' searches show Google Business Profiles before any ads. This is the highest-ROI thing you can do and it's free.",
      steps: ["Claim/create at business.google.com", "Upload 10+ high-quality food photos", "Set exact hours", "Enable Google Messaging", "Add your menu", "Respond to EVERY review within 24 hours", "Post weekly specials and events"],
    },
    search_ads: {
      keywords: [`${cuisine_type} restaurant ${service_area}`, `best ${cuisine_type} ${service_area}`, `${cuisine_type} near me`, `catering ${service_area}`, `private dining ${service_area}`],
      negative_keywords: ["recipe", "how to make", "cook at home", "job", "franchise"],
      ad_copy_example: { headline_1: `${cuisine_type} in ${service_area} — ${business_name}`, headline_2: "Fresh | Flavorful | Open Now", headline_3: "Book a Table or Order Online", description: `${business_name} — serving ${service_area}'s best ${cuisine_type}. Dine in, take out, or catering. Reserve your table today!` },
      budget: `$${Math.round(monthly_budget * 0.60)}/month`,
    },
    remarketing: { description: "Target website visitors who didn't order or reserve. Highest ROI — they already know you.", budget: `$${Math.round(monthly_budget * 0.40)}/month` },
    catering_campaign: { note: "Catering is the highest-margin revenue. Run a dedicated campaign targeting local businesses and event planners.", keywords: [`catering ${service_area}`, `corporate catering ${service_area}`, `event catering ${service_area}`] },
  };
}

async function execRestaurantFacebookAdsCampaign(_workspaceId: string, input: any) {
  const { business_name = "Your Restaurant", service_area = "local area", monthly_budget = 250, cuisine_type = "food", campaign_goal = "Drive foot traffic" } = input ?? {};
  return {
    campaign: `Facebook & Instagram Ads Strategy — ${business_name}`,
    service_area, monthly_budget: `$${monthly_budget}`, campaign_goal,
    audience_targeting: {
      location: `${service_area} — 3–5 mile radius around your restaurant (dining is hyper-local)`,
      demographics: "Adults 25–55 — highest dining frequency demographic",
      interests: ["Food & dining", "Local restaurants", cuisine_type, "Yelp", "OpenTable"],
      behaviors: ["Frequent restaurant-goers", "People who recently moved"],
    },
    ad_formats: [
      { format: "Food Photo Carousel", why: "Beautiful food photos stop the scroll. Show 4–6 dishes with prices.", caption: `🍽️ [Dish name] — only at ${business_name}. ${service_area}. Open [hours]. Order online: [link]` },
      { format: "Video — Kitchen/Behind the Scenes", why: "30-second kitchen video builds authenticity", script: `"This is how we make our [signature dish]. Come see us at ${business_name} — [address]. [Hours]."` },
      { format: "Offer Ad", why: "Drives first-time visits with a low-risk offer", examples: ["'Free appetizer with your first visit'", "'Lunch special: $12 for [dish] + drink'"] },
    ],
    seasonal_highlights: ["February: Valentine's Day prix fixe", "May: Mother's Day (biggest restaurant day)", "November–December: Holiday catering season"],
    budget_allocation: { foot_traffic: `$${Math.round(monthly_budget * 0.50)}/month`, events_and_offers: `$${Math.round(monthly_budget * 0.30)}/month`, retargeting: `$${Math.round(monthly_budget * 0.20)}/month` },
    instagram_tip: "Link Facebook and Instagram ad accounts — one campaign runs both. Instagram Reels ads are the highest-reach format for restaurants right now.",
  };
}

async function execRestaurantMenuMarketing(_workspaceId: string, input: any) {
  const { business_name = "Your Restaurant", cuisine_type = "food", price_point = "Mid-range ($$)" } = input ?? {};
  return {
    guide: `Menu Marketing Guide — ${business_name}`,
    cuisine_type, price_point,
    menu_engineering: {
      description: "Categorize every item by profitability and popularity to maximize revenue per customer.",
      categories: {
        Stars: { definition: "High profit + High popularity", strategy: "Feature prominently — top of page, photos, server recommendations" },
        Plowhorses: { definition: "Low profit + High popularity", strategy: "Consider raising price slightly or bundling with higher-margin add-ons" },
        Puzzles: { definition: "High profit + Low popularity", strategy: "Rename, reposition, add a photo, or have servers suggest them" },
        Dogs: { definition: "Low profit + Low popularity", strategy: "Remove them. Simplify your menu — fewer items = fresher food and lower food cost" },
      },
    },
    menu_design_principles: [
      "Top right of the menu (or top of a column) is where customers look first — put your most profitable items there",
      "Avoid dollar signs ($) — removes them increases average check by ~8%",
      "Anchor pricing — place a high-price item at the top so everything else looks reasonable",
      "Limit items per category to 7 (±2) — too many choices cause decision paralysis",
      "Use descriptive language: 'slow-roasted' beats 'roasted', 'house-made' beats 'homemade'",
      "Photos increase sales of photographed items by 30% — only photo your Stars and Puzzles",
    ],
    upsell_training: [
      "Train servers: 'Would you like to add a [side/drink/dessert]?' for every table",
      "Dessert is the most profitable upsell — train servers to describe it, not just offer it",
      "Wine pairing suggestions increase beverage revenue by 20–40%",
    ],
  };
}

async function execRestaurantReviewRequestTemplate(_workspaceId: string, input: any) {
  const { business_name = "Your Restaurant", review_platform = "Google" } = input ?? {};
  return {
    templates: {
      sms: { send_timing: "30–60 minutes after a dine-in experience, OR at payment for takeout", message: `Hi! Thanks for dining at ${business_name} tonight 🍽️ If you enjoyed your experience, would you take 2 minutes to leave us a review? It helps our small team more than you know. Here's the link: [REVIEW LINK]` },
      email: { subject: `How was your experience at ${business_name}?`, body: `Hi [Guest Name],\n\nThank you for choosing ${business_name}! If you have a moment, we'd love to hear your feedback on ${review_platform}.\n\n👉 Leave a review: [${review_platform} REVIEW LINK]\n\nIf anything wasn't perfect, please reply to this email — we'd love the chance to make it right.\n\nThank you,\n[Your Name]\n${business_name}` },
      table_tent: `Enjoying your meal? 📱 Scan the QR code to leave us a Google review — takes 2 minutes and means the world to our team!`,
      receipt_note: `Love your meal? Review us on Google! [short.link] — thank you! 🙏`,
    },
    collection_strategy: [
      "Train servers to verbally ask: 'If everything was great, we'd appreciate a Google review — I'll text you the link'",
      "Use your POS to send automated post-visit emails to customers who provide their email",
      "Place QR code cards on every table linking to your Google review page",
    ],
    responding_to_reviews: {
      positive: "Thank them by name, reference something specific, invite them back",
      negative: "Respond within 24 hours. Acknowledge, apologize, offer to make it right. NEVER argue publicly.",
    },
    volume_goals: "Target: 10 Google reviews in first 30 days, 25 by 60 days, 50 by 90 days.",
    platforms_priority: ["1. Google (highest SEO impact)", "2. Yelp (high-intent diners)", "3. Facebook", "4. TripAdvisor (tourist-heavy markets)"],
  };
}

async function execRestaurantPromoCampaignGenerate(_workspaceId: string, input: any) {
  const { business_name = "Your Restaurant", restaurant_type = "restaurant", campaign_name = "Seasonal Promo", offer = "20% off", start_date = "TBD", end_date = "TBD", channels = ["Google Ads", "Facebook", "Instagram", "Email", "SMS"] } = input ?? {};
  return {
    campaign: `${campaign_name} — ${business_name}`,
    restaurant_type, offer, duration: `${start_date} → ${end_date}`, channels,
    campaign_brief: {
      objective: `Drive dine-in visits, online orders, and reservations for ${business_name} during the campaign period`,
      target_audience: "Local diners within 3–5 miles, event planners, and past customers",
      key_message: `${business_name} — ${offer}. Dine in, take out, or book a private event.`,
      urgency: `Offer valid through ${end_date} only`,
    },
    channel_playbook: channels.map((channel: string) => ({
      channel,
      content: channel === "Google Ads"
        ? { action: "Add promotion extension", headline: `${offer} — ${campaign_name} at ${business_name}` }
        : channel === "Facebook" || channel === "Instagram"
        ? { format: "Food photo carousel with offer overlay", caption: `🍽️ ${offer} at ${business_name}! Valid through ${end_date}. Dine in or order online.` }
        : channel === "Email"
        ? { subject: `[Limited Time] ${offer} at ${business_name}`, body: `Hi [Name],\n\nWe're excited to offer ${offer} as part of our ${campaign_name}! Offer valid through ${end_date}.\n\n[CTA: Order Now / Reserve a Table]\n\nSee you soon,\n${business_name}` }
        : channel === "SMS"
        ? { message: `🍽️ ${business_name}: ${offer} — ${campaign_name}! Valid through ${end_date}. Reply STOP to opt out. [link]`, timing: "Send at 11am (lunch) or 4pm (dinner)" }
        : { action: `Promote campaign on ${channel}` },
    })),
    grand_opening_extras: campaign_name.toLowerCase().includes("grand opening") ? {
      ribbon_cutting: "Contact your local Chamber of Commerce — they often provide ribbon-cutting ceremonies for press coverage",
      local_press: "Email your local newspaper's food/lifestyle editor with a press release 2 weeks before opening",
      soft_opening: "Run a soft opening 1 week before grand opening — work out operational kinks first",
    } : undefined,
    success_metrics: ["New vs. returning customers (POS data)", "Revenue during campaign vs. same period prior year", "Cost per new customer acquired", "Review count growth during campaign"],
    catering_opportunity: "Every promotional campaign is an opportunity to capture catering leads. Include a catering CTA in all materials.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Business Setup executor functions
// ─────────────────────────────────────────────────────────────────────────────

async function execBusinessEinGuide(_workspaceId: string, input: any) {
  const { business_name = "your business", business_type = "business", owner_name = "the owner", state = "your state", entity_type = "LLC" } = input ?? {};
  return {
    guide: "Business EIN Application Guide",
    business_name, business_type, state, entity_type,
    what_is_ein: "An EIN (Employer Identification Number) is your business's federal tax ID — required to open a business bank account, hire employees, set up payroll, apply for business licenses, and file business taxes. It's free and instant from the IRS.",
    cost: "Free — IRS never charges for an EIN. Any website charging a fee is a third-party middleman. Only use irs.gov.",
    steps: [
      { step: 1, action: "Go to IRS.gov/ein", detail: "Navigate to irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online. Available Mon–Fri 7am–10pm ET." },
      { step: 2, action: "Select your entity type", detail: `Choose: ${entity_type === "LLC" ? "LLC" : entity_type === "Sole Proprietor" ? "Sole Proprietor" : entity_type}. Most new businesses should form an LLC first for liability protection before applying for an EIN.` },
      { step: 3, action: "Select reason", detail: "Choose 'Started a new business'." },
      { step: 4, action: "Enter your information", detail: `Business name: ${business_name}. State: ${state}. Responsible party: ${owner_name} (your personal SSN or ITIN — standard and secure on the IRS website). Business address: your office, home, or virtual mailbox address.` },
      { step: 5, action: "Submit and save your EIN", detail: "Your EIN is issued instantly on screen. Download and save the PDF confirmation letter — you'll need it to open your bank account, apply for business credit, set up payroll, and file taxes." },
    ],
    what_you_need: ["Full legal name", "Social Security Number (SSN) or ITIN", "Business name", "Business address", "State of formation or operation", "Entity type (LLC, Sole Proprietor, etc.)"],
    after_ein: [
      "Open a business bank account — bring your EIN letter and LLC Articles of Organization",
      "Register for state taxes if required (sales tax, payroll tax)",
      "Set up payroll if hiring — Gusto, ADP, or QuickBooks Payroll",
      "Apply for any required business licenses using your EIN",
      "Apply for a business credit card to start building business credit",
    ],
    entity_tip: entity_type === "Sole Proprietor"
      ? "Consider forming an LLC before applying for your EIN — it only costs $50–$500 and protects your personal assets from business debts and lawsuits."
      : `Your ${entity_type} must be formed with your state BEFORE applying for the EIN. The EIN is issued to the entity, not to you personally.`,
  };
}

async function execBusinessStateRegistrationGuide(_workspaceId: string, input: any) {
  const { business_name = "your business", state = "your state", business_type = "business", entity_type = "LLC" } = input ?? {};
  return {
    guide: "Business State Registration & Entity Formation Guide",
    business_name, state, business_type, entity_type,
    entity_comparison: {
      LLC: { pros: ["Personal liability protection", "Pass-through taxation (profits taxed once on your personal return)", "Flexible management structure", "Required by most landlords and lenders", "Easiest to form and maintain"], cons: ["State filing fee ($50–$500)", "Annual report fee in most states"], best_for: "Most small businesses, freelancers, service providers, and startups" },
      Sole_Proprietor: { pros: ["No setup cost or paperwork"], cons: ["Zero liability protection — you are personally liable for all debts and lawsuits", "Cannot open a business bank account at most banks without an LLC or DBA"], best_for: "Only for very low-risk, low-revenue side income before forming an LLC" },
      S_Corp: { pros: ["Can save on self-employment taxes at higher income levels ($50k+ profit)", "Still has liability protection"], cons: ["More complex to set up and maintain", "Payroll required — you must pay yourself a reasonable salary"], best_for: "Profitable established businesses with $50k+ net profit looking to reduce self-employment taxes" },
      C_Corp: { pros: ["Best for venture-backed startups", "Can issue multiple classes of stock", "Investors typically require C-Corp structure"], cons: ["Double taxation on profits", "Most complex and expensive to maintain"], best_for: "Startups planning to raise venture capital" },
    },
    llc_formation_steps: [
      { step: 1, action: "Check name availability", detail: `Search ${state}'s Secretary of State business name database to confirm "${business_name} LLC" is available. Also check for trademark conflicts at USPTO.gov.` },
      { step: 2, action: "File Articles of Organization", detail: `File online at your ${state} Secretary of State website. Cost: $50–$500 depending on state. Approval: 1–10 business days (expedited filing often available for extra fee).` },
      { step: 3, action: "Appoint a Registered Agent", detail: "Every LLC needs a registered agent to receive legal documents. Options: yourself (must have a physical in-state address), Northwest Registered Agent ($39–$125/yr), ZenBusiness ($49/yr), or your attorney." },
      { step: 4, action: "Create an Operating Agreement", detail: "Governs how your LLC runs: ownership percentages, decision-making, profit distribution, what happens if a member leaves. Critical for multi-member LLCs. Free templates at your state's SOS site." },
      { step: 5, action: "Get your EIN from the IRS", detail: "Apply at IRS.gov after your LLC is approved. Free and instant." },
      { step: 6, action: "Open a business bank account", detail: "Bring Articles of Organization + EIN letter + Operating Agreement. Keeping business and personal money separate is required to maintain LLC protection." },
      { step: 7, action: "Register for state and local taxes", detail: `Register with ${state}'s Department of Revenue for sales tax (if you sell taxable products/services) and employer taxes (if you have employees).` },
      { step: 8, action: "Get a local business license", detail: "Most cities and counties require a general business license separate from your LLC. Check your city hall or county clerk's website." },
    ],
    dba_note: "If you want to operate under a name different from your LLC name (e.g., LLC name is 'Smith Services LLC' but you do business as 'OKC Cleaning Co'), you'll need to file a DBA (Doing Business As) or fictitious name registration with your county.",
    timeline: "LLC formation + EIN + bank account: 1–2 weeks total",
    cost_estimate: `${state} LLC filing: $50–$500 | Registered agent: $39–$125/yr | Operating agreement: Free–$300`,
  };
}

async function execBusinessLicensePermitGuide(_workspaceId: string, input: any) {
  const { state = "your state", business_type = "business", is_home_based = false, is_online_only = false, sells_physical_products = false, requires_professional_license = false } = input ?? {};
  return {
    guide: `Business License & Permit Checklist — ${business_type} in ${state}`,
    state, business_type,
    universal_requirements: [
      { permit: "General Business License", issued_by: "City or County Clerk", timeline: "1–2 weeks", cost: "$50–$400/year", notes: "Required in most cities before you can legally operate. Separate from your LLC/state registration." },
      { permit: "EIN (Federal Tax ID)", issued_by: "IRS (irs.gov)", timeline: "Instant", cost: "Free", notes: "Required to open a bank account, hire employees, and file business taxes." },
      { permit: "State Business Registration / LLC", issued_by: `${state} Secretary of State`, timeline: "1–10 business days", cost: "$50–$500", notes: "Your legal entity registration. Required before most other licenses." },
    ],
    conditional_requirements: [
      ...(sells_physical_products ? [{ permit: "Seller's Permit / Sales Tax Permit", issued_by: `${state} Department of Revenue`, timeline: "Immediate (online) to 2 weeks", cost: "Usually free", notes: "Required if you sell physical products. Allows you to collect and remit sales tax." }] : []),
      ...(is_home_based ? [{ permit: "Home Occupation Permit", issued_by: "City/County Zoning Department", timeline: "1–4 weeks", cost: "$25–$200", notes: "Required in most cities if you operate a business from your home. May restrict signage, customer visits, and deliveries." }] : []),
      ...(requires_professional_license ? [{ permit: "Professional / Occupational License", issued_by: `${state} Licensing Board (varies by profession)`, timeline: "Weeks to months depending on exams/requirements", cost: "Varies widely", notes: `Required for licensed professions: contractors, real estate agents, cosmetologists, electricians, plumbers, accountants, attorneys, healthcare providers, etc. Search "${state} [profession] license" for your specific board.` }] : []),
      ...(is_online_only ? [{ permit: "Sales Tax Nexus Registration (multiple states)", issued_by: "Each state's Department of Revenue", timeline: "Varies", cost: "Usually free", notes: "If you sell online across state lines and exceed $100k in sales or 200 transactions in a state, you may need to collect and remit that state's sales tax (economic nexus rules post-South Dakota v. Wayfair)." }] : []),
    ],
    industry_specific_note: `Search "${state} ${business_type} license requirements" for any industry-specific permits beyond the universal requirements above. Industries with frequent additional requirements include: food service, childcare, healthcare, construction/trades, financial services, transportation, and cannabis.`,
    recommended_order: ["1. Form LLC and get EIN", "2. Apply for general business license", "3. Register for seller's permit (if selling products)", "4. Apply for any professional licenses", "5. Get home occupation permit (if home-based)", "6. Apply for any industry-specific permits"],
  };
}

async function execBusinessEmailSetup(_workspaceId: string, input: any) {
  const { business_name = "your business", business_type = "business", preferred_domain = "", team_size = 1 } = input ?? {};
  const slug = business_name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const domainSuggestion = preferred_domain || `${slug}.com`;
  return {
    guide: "Business Email Setup Guide",
    business_name, business_type, team_size,
    recommended_domain: domainSuggestion,
    why_professional_email: "A Gmail or Yahoo address signals that you're not serious. A branded email (you@yourbusiness.com) is required for vendor accounts, business bank accounts at some banks, and builds immediate credibility with clients and partners.",
    domain_setup: {
      where_to_buy: ["Google Domains ($12/yr) — integrates cleanly with Google Workspace", "Namecheap ($8–$15/yr) — affordable and reliable", "GoDaddy ($10–$20/yr) — most popular, easy to use"],
      tips: [`Try ${domainSuggestion}. If taken: try get${slug}.com, ${slug}co.com, ${slug}hq.com, or include your city.`, "Always buy the .com if available — .net and .co are fine backups."],
    },
    email_providers: [
      { name: "Google Workspace (Recommended)", cost: "$6/user/month", why: "Gmail interface everyone knows, shared drives, Meet for video calls, Calendar, Sheets — everything a team needs", setup: "workspace.google.com → Get started → enter your domain → verify ownership (add a TXT record to your domain DNS)", best_for: "Any business, especially teams already using Google tools" },
      { name: "Microsoft 365 Business Basic", cost: "$6/user/month", why: "Outlook + Teams + SharePoint — ideal if your clients or team uses Microsoft", best_for: "Businesses in industries that use Microsoft heavily (legal, finance, healthcare)" },
      { name: "Zoho Mail", cost: "Free for up to 5 users / $1–$4/user/month", why: "Solid free option for solo operators", best_for: "Solo founder wanting professional email with zero monthly cost" },
    ],
    recommended_address_structure: [
      `you@${domainSuggestion} — your primary email`,
      `info@${domainSuggestion} — general inquiries and website contact forms`,
      `hello@${domainSuggestion} — friendly customer-facing alias`,
      `billing@${domainSuggestion} — invoices and payment correspondence`,
      `support@${domainSuggestion} — customer service (can be an alias to your main inbox)`,
      ...(team_size > 3 ? [`team@${domainSuggestion} — internal team distribution list`] : []),
    ],
    email_signature_template: `[Your Name]\n[Title] | ${business_name}\n📞 [Phone Number]\n🌐 [Website URL]\n📍 [City, State]\n\n[LinkedIn URL] | [Instagram URL]`,
    pro_tips: [
      "Set up email forwarding so all aliases go to one inbox — less to check",
      "Enable two-factor authentication on your email account immediately — your email is the key to every other account you own",
      "Use Google Workspace's shared drive from day one — keeps all business files organized and accessible from any device",
    ],
  };
}

async function execBusinessAddressSetup(_workspaceId: string, input: any) {
  const { business_name = "your business", state = "your state", business_type = "business", has_physical_location = false, is_home_based = false } = input ?? {};
  return {
    guide: "Business Address Setup Guide",
    business_name, state, business_type,
    why_it_matters: "Your business address appears on your LLC filing, EIN, bank account, business license, website, Google Business Profile, and all marketing materials. Using your personal home address on public business records can create privacy and zoning issues.",
    options: {
      physical_office: has_physical_location ? {
        use: "Use your physical business address for everything — LLC filing, EIN, bank, Google Business Profile, website footer.",
        google_business: "Verify your Google Business Profile immediately — it's the most important local visibility tool. Google will mail a postcard to verify.",
        tip: "Make sure your address is formatted identically everywhere (same abbreviations, suite format) — inconsistencies hurt your local SEO.",
      } : null,
      home_based: is_home_based ? {
        privacy_risk: "Your home address becomes public record when used for LLC filing. Anyone can look up your business address and find where you live.",
        solution: "Use a virtual mailbox or a registered agent address for your LLC filing and EIN — keeps your home address off public records.",
      } : null,
      virtual_mailbox: {
        what_it_is: "A real street address (not a PO Box) where your business mail is received, scanned, and emailed to you.",
        services: [
          { name: "PostScan Mail", cost: "$10–$30/month", pros: "Most affordable, real street address, mail scanning" },
          { name: "Anytime Mailbox", cost: "$10–$30/month", pros: "Large network of locations, choose an address in any city" },
          { name: "iPostal1", cost: "$10–$40/month", pros: "Many locations including UPS Store addresses (looks professional)" },
          { name: "Regus / WeWork Address", cost: "$29–$99/month", pros: "Premium business address in a real office building, includes mail handling" },
        ],
        works_for: ["LLC filing and EIN", "Bank account applications", "Business license", "Business cards and website"],
        does_not_work_for: ["Google Business Profile (requires a physical location where customers can visit or you serve from)"],
      },
    },
    google_business_profile: {
      importance: "The single most important free marketing tool for any local business — shows you in Google Maps and local search results.",
      eligibility: "You must have a real physical location or serve customers at their location (service-area business). Virtual mailboxes don't qualify.",
      setup: "business.google.com → Add your business → choose category → verify by postcard or phone",
    },
    registered_agent_address: {
      note: "Your registered agent's address (required for LLC) is for receiving legal documents only — it cannot be your public business address on marketing materials.",
    },
  };
}

async function execBusinessPhoneSetup(_workspaceId: string, input: any) {
  const { business_name = "your business", business_type = "business", team_size = 1, needs_auto_attendant = false } = input ?? {};
  return {
    guide: "Business Phone Setup Guide",
    business_name, business_type, team_size,
    why_dedicated_number: "Using your personal cell for business means no separation between work and personal life, no professional voicemail, no way to track business calls, and no way to hand the number to an employee.",
    options: [
      { name: "Google Voice", cost: "Free (personal) / $10/user/mo (Google Workspace Business)", pros: ["Free local number", "Voicemail transcription", "Rings on any device"], cons: ["No shared inbox for team", "No auto-attendant on free plan", "Limited business features"], best_for: "Solo founder or very early stage with minimal call volume" },
      { name: "OpenPhone (Recommended for small teams)", cost: "$15/user/month", pros: ["Shared phone number — entire team sees and answers calls", "Business texting with templates", "Call recording", "Auto-reply for missed calls", "Business hours routing — calls go to voicemail after hours"], best_for: `Teams of ${team_size} — everyone can see call history and respond to missed calls`, setup: "openphone.com → sign up → port your existing number or get a new one" },
      { name: "RingCentral", cost: "$20–$35/user/month", pros: ["Auto-attendant ('Press 1 for Sales, Press 2 for Support')", "Multiple extensions", "Call queues", "CRM integrations", "Desk phone support"], best_for: "Growing business needing a full phone system with extensions" },
      { name: "Grasshopper", cost: "$26–$80/month", pros: ["Virtual extensions for a team", "Works on your existing phones", "No desk phone needed"], best_for: "Small team wanting extensions without buying new hardware" },
    ],
    auto_attendant_script: needs_auto_attendant ? `"Thank you for calling ${business_name}! For [Department/Service 1], press 1. For [Department/Service 2], press 2. For billing and accounts, press 3. To speak with someone, press 0 or stay on the line. Our hours are [hours]. We look forward to serving you!"` : null,
    voicemail_script: `"You've reached ${business_name}. We're unable to take your call right now, but your call is important to us. Please leave your name, number, and a brief message and we'll get back to you within [timeframe]. You can also reach us at [email] or visit us at [website]. Thank you!"`,
    sms_strategy: [
      "Enable texting on your business number — most customers prefer texting over calling",
      "Set up auto-reply for missed calls: 'Hi! You reached [Business]. We missed your call — text us here and we'll respond shortly!'",
      "Use SMS for appointment reminders, order updates, and follow-ups",
      "Review requests via text get 5x higher response rates than email",
    ],
    number_type: "Get a local area code matching your market — local numbers have higher answer rates than toll-free for small businesses.",
  };
}

async function execBusinessBankAccountGuide(_workspaceId: string, input: any) {
  const { business_name = "your business", state = "your state", business_type = "business", monthly_revenue_estimate = "under $10,000", has_employees = false, accepts_payments_online = false } = input ?? {};
  return {
    guide: "Business Bank Account Setup Guide",
    business_name, state, business_type,
    why_separate_account: "Mixing personal and business finances: voids your LLC liability protection, makes tax time a nightmare, prevents you from tracking real business profitability, and makes you look unprofessional to vendors and clients.",
    what_to_bring: ["EIN confirmation letter (from IRS.gov)", "LLC Articles of Organization (from your state filing)", "Operating Agreement (if you have one)", "Government-issued photo ID", "Initial deposit ($25–$100 for most business accounts)"],
    recommended_banks: [
      { name: "Chase Business Complete Banking", monthly_fee: "$15 (waived with $2k minimum or $2k/mo deposits)", pros: ["Largest branch and ATM network", "Strong business credit card program", "Built-in payment processing (Chase QuickAccept)", "SBA loan partner"], best_for: "Any business that deposits cash or checks regularly" },
      { name: "Bank of America Business Advantage Fundamentals", monthly_fee: "$16 (waived with $5k avg balance)", pros: ["Strong business credit program", "Preferred SBA lender", "Business line of credit available"], best_for: "Business planning to build credit or apply for a loan" },
      { name: "Mercury (mercury.com) — Online Only", monthly_fee: "Free", pros: ["No fees or minimums", "API access for fintech integration", "Virtual cards", "Great for tech/online businesses"], best_for: "Online businesses, tech startups, e-commerce" },
      { name: "Relay (relay.fi) — Online Only", monthly_fee: "Free", pros: ["Up to 20 checking accounts", "Sub-accounts for payroll/taxes/expenses", "Connects to QuickBooks and Xero"], best_for: "Service businesses wanting clean cash flow separation" },
    ],
    payment_processing: accepts_payments_online ? {
      options: [
        { name: "Stripe", fees: "2.9% + $0.30/transaction", why: "Best for online/e-commerce, subscription billing, and developer-friendly integrations" },
        { name: "Square", fees: "2.6% + $0.10 (in-person) / 2.9% + $0.30 (online)", why: "Best for in-person retail, easy setup, free POS software" },
        { name: "PayPal Business", fees: "3.49% + $0.49 (standard)", why: "Good when clients expect PayPal; higher fees than Stripe/Square" },
      ],
      tip: "If you process $30k+/month, negotiate your rate directly with the processor — advertised rates are not fixed.",
    } : null,
    cash_flow_system: [
      "Operating account — where revenue comes in and bills are paid",
      `Tax reserve account — transfer ${business_type.includes("LLC") ? "25–30%" : "30–35%"} of net revenue weekly for quarterly estimated taxes`,
      "Payroll account — fund before each pay period if you have employees",
      "Savings/emergency fund — build 3 months of operating expenses",
    ],
    accounting: { recommended: "QuickBooks Online ($17.50–$49.50/mo) or Wave (free)", tip: "Connect your bank account to QuickBooks from day one — automated transaction categorization saves hours at tax time and gives you real profit/loss visibility.", bookkeeper_note: "Once you're doing $5k+/month in revenue, hiring a bookkeeper ($200–$500/mo) pays for itself in tax savings alone." },
  };
}

async function execBusinessWebsiteGuide(_workspaceId: string, input: any) {
  const { business_name = "your business", business_type = "business", sells_products_online = false, budget = "under $100/mo" } = input ?? {};
  return {
    guide: "Business Website Launch Guide",
    business_name, business_type, budget,
    why_website_matters: "Your website is your 24/7 salesperson, credibility signal, and home base for all marketing. Even if you get most business from referrals, everyone Googles you before calling. A missing or poor website loses you business every day.",
    platform_recommendations: [
      { name: "Squarespace", cost: "$16–$49/month", difficulty: "Easy", best_for: "Service businesses, portfolios, simple e-commerce. Beautiful templates. No coding required.", link: "squarespace.com" },
      { name: "Webflow", cost: "$14–$39/month", difficulty: "Medium", best_for: "Professional/agency-quality sites with more design control. No coding but more powerful than Squarespace.", link: "webflow.com" },
      { name: "WordPress + Elementor", cost: "$10–$25/month (hosting) + free Elementor or $59/yr Pro", difficulty: "Medium", best_for: "Maximum flexibility, strong SEO, thousands of plugins. Most popular platform in the world.", link: "wordpress.org (self-hosted)" },
      { name: "Shopify", cost: "$29–$79/month", difficulty: "Easy", best_for: "Product-based e-commerce. Best platform for selling physical or digital products online.", link: "shopify.com", recommended_for_ecommerce: sells_products_online },
    ],
    must_have_pages: [
      { page: "Home", purpose: "Clear headline: who you are, what you do, who you serve, and a call to action (Call Now, Get a Quote, Shop Now)" },
      { page: "About", purpose: "Your story, your team, your mission. People buy from people — make it personal." },
      { page: "Services / Products", purpose: "What you offer, how it works, and what it costs (or at least a starting price). No pricing loses leads." },
      { page: "Contact", purpose: "Phone number, email, address, contact form, and business hours. Make it effortless to reach you." },
      { page: "Testimonials / Reviews", purpose: "Social proof is the #1 conversion driver. Embed Google reviews or add written testimonials with photos." },
    ],
    seo_basics: [
      "Include your city and service in your page titles: 'OKC Cleaning Services | [Business Name]'",
      "Add your business to Google Business Profile — it feeds your local search visibility",
      "Write a meta description for every page (the text that shows under your link in Google results)",
      "Make sure your site loads fast — use Google PageSpeed Insights to check",
      "Mobile-first: most visitors are on phones. Test your site on a phone before launching.",
    ],
    launch_checklist: ["Domain connected and SSL certificate active (https://)", "Contact form tested — make sure submissions reach your email", "Phone number clickable on mobile", "Google Analytics connected", "Google Search Console verified", "Social media links in footer", "Privacy Policy page (required if you collect any data)"],
  };
}

async function execBusinessGoogleAdsCampaign(_workspaceId: string, input: any) {
  const { business_name = "Your Business", business_type = "business", service_area = "local area", monthly_budget = 500, target_customer = "local customers" } = input ?? {};
  return {
    campaign: `Google Ads Strategy — ${business_name}`,
    business_type, service_area, monthly_budget: `$${monthly_budget}`,
    priority_1_google_business_profile: {
      title: "Google Business Profile — Do This First (Free)",
      why: "Local search results show Google Business Profiles before paid ads. This is the most important free marketing step for any local business.",
      steps: ["Claim/create at business.google.com", "Fill out every field completely", "Upload 10+ high-quality photos", "Set exact hours (including holidays)", "Enable Google Messaging", "Post weekly updates (offers, news, events)", "Respond to every review within 24 hours"],
    },
    search_ads: {
      keywords: [`${business_type} ${service_area}`, `best ${business_type} ${service_area}`, `${business_type} near me`, `hire ${business_type} ${service_area}`, `${business_type} services ${service_area}`],
      negative_keywords: ["free", "DIY", "how to", "job", "career", "salary", "course", "template"],
      ad_copy: { headline_1: `${business_name} — ${service_area}`, headline_2: "Trusted | Professional | Results-Driven", headline_3: "Get a Free Quote Today", description: `${business_name} serves ${target_customer} in ${service_area}. Professional service, fast turnaround, satisfaction guaranteed. Contact us today!` },
      budget: `$${Math.round(monthly_budget * 0.65)}/month`,
    },
    remarketing: { description: "Show ads to people who visited your website but didn't convert. 3–5x cheaper than prospecting.", budget: `$${Math.round(monthly_budget * 0.35)}/month` },
    conversion_tracking: ["Set up conversion tracking in Google Ads before spending a dollar", "Track: phone calls from website, contact form submissions, and direction requests", "Without conversion tracking you're flying blind — you can't tell which keywords make the phone ring"],
    landing_page_tips: ["Your ad should link to a specific page about what the ad promises — not your homepage", "Include your phone number, a contact form, and a clear call to action above the fold", "Add 3–5 testimonials on the landing page — social proof converts"],
  };
}

async function execBusinessFacebookAdsCampaign(_workspaceId: string, input: any) {
  const { business_name = "Your Business", business_type = "business", service_area = "local area", monthly_budget = 300, target_customer = "local customers", campaign_goal = "Lead generation" } = input ?? {};
  return {
    campaign: `Facebook & Instagram Ads Strategy — ${business_name}`,
    business_type, service_area, monthly_budget: `$${monthly_budget}`, campaign_goal,
    audience_targeting: {
      location: `${service_area} — radius around your business location (5–15 miles for local services, broader for online businesses)`,
      demographics: "Set by your ideal customer profile — age, income level, homeowner status, etc.",
      interests: [`${business_type}`, "Small business owners", "Homeowners", "Related industry interests"],
      behaviors: ["Business decision makers (for B2B)", "Recently moved (great for home services)", "Small business owners"],
      lookalike: "Upload your customer email list — Facebook finds people similar to your best customers in your area. Most powerful targeting available.",
    },
    ad_formats: [
      { format: "Lead Generation Ad", why: "Best for service businesses — customer fills out a form without leaving Facebook. Lower friction = more leads.", fields_to_collect: ["Name", "Phone number", "Email", "Brief description of what they need"] },
      { format: "Video Ad (15–30 seconds)", why: "Video builds trust faster than any other format. Show your work, your team, your results.", script: `"[Problem your customer has]. At ${business_name}, we [solution you provide]. [Result/outcome]. [Call to action — call now, get a free quote, shop now]."` },
      { format: "Before/After Carousel", why: "Extremely effective for visual businesses (cleaning, landscaping, construction, design, etc.). Shows proof of results.", tip: "Make the 'before' relatable and the 'after' aspirational" },
      { format: "Testimonial/Social Proof Ad", why: "A real customer talking about their experience converts better than any ad copy you write.", copy: `"[Customer name]: '[Quote about their experience with ${business_name}]'"` },
    ],
    budget_allocation: {
      prospecting: `$${Math.round(monthly_budget * 0.60)}/month — targeting cold audiences who haven't heard of you`,
      retargeting: `$${Math.round(monthly_budget * 0.40)}/month — targeting website visitors, video viewers, and people who engaged with your page`,
    },
    content_calendar: ["Week 1: Introduction / who you are and what you do", "Week 2: Social proof / testimonial or case study", "Week 3: Offer or promotion", "Week 4: Behind the scenes / team / process content"],
    instagram_note: "Link your Facebook and Instagram — one campaign runs both. Instagram Stories and Reels have the highest organic reach right now. Post Reels consistently even without paid ads.",
  };
}

async function execBusinessBrandGuide(_workspaceId: string, input: any) {
  const { business_name = "Your Business", business_type = "business", target_customer = "local customers", brand_personality = "professional" } = input ?? {};
  return {
    guide: `Brand Identity Guide — ${business_name}`,
    business_name, business_type, target_customer, brand_personality,
    brand_foundation: {
      mission: `What ${business_name} does and why it matters — in one sentence. Example: "We help [target customer] achieve [outcome] so they can [bigger benefit]."`,
      vision: "What success looks like in 5 years.",
      values: "3–5 words that describe how you operate: Integrity, Quality, Speed, Innovation, Community, etc.",
      brand_voice: {
        professional: "Clear, confident, authoritative. Avoids jargon. Gets to the point.",
        playful: "Conversational, fun, uses humor. Feels approachable and energetic.",
        luxury: "Elegant, precise, exclusivity-focused. Every word is intentional.",
        approachable: "Warm, friendly, community-focused. Like advice from a trusted neighbor.",
      }[brand_personality] ?? "Clear, confident, and authentic to your industry.",
    },
    visual_identity: {
      logo_direction: {
        tips: ["Keep it simple — a logo that works at 16px (favicon) and 1600px is a strong logo", "Avoid clip art or overly complex illustrations", "Wordmark (just your name in a distinctive font) is perfectly professional for most businesses"],
        tools: ["Canva Pro ($13/mo) — good for DIY logos with templates", "Looka ($65–$80 one-time) — AI logo generator with brand kit", "99designs ($299–$1,299) — crowdsourced professional design", "Fiverr ($50–$500) — hire a designer directly"],
      },
      color_palette: {
        structure: "Choose 1 primary color, 1 secondary color, and 2 neutral colors (usually white/light + dark gray/black)",
        by_personality: {
          professional: "Navy blue or dark green primary — signals trust and stability",
          playful: "Bright orange, yellow, or teal primary — signals energy and approachability",
          luxury: "Black, deep navy, or burgundy primary with gold accent — signals premium",
          approachable: "Warm orange or sky blue primary — signals friendliness",
        }[brand_personality] ?? "Choose a color that stands out in your industry while feeling appropriate for your target customer",
        tools: ["coolors.co — color palette generator", "brandmark.io — see your colors in use"],
      },
      typography: { body_font: "Clean and readable: Inter, Lato, Open Sans, or Nunito (all free on Google Fonts)", heading_font: "More distinctive: Playfair Display (classic), Poppins (modern), Raleway (elegant), Montserrat (professional)" },
    },
    brand_standards: [
      "Use the same logo, colors, and fonts on everything — website, business cards, social media, invoices, email signature",
      "Save your brand assets in a shared folder: logo files (PNG with transparent background, SVG), color hex codes, font files",
      "Create a simple one-page brand guide you can share with contractors and collaborators",
    ],
    naming_tip: `"${business_name}" — make sure it's available as a .com domain and on Instagram/Facebook before fully committing. Run a quick trademark search at USPTO.gov to avoid conflicts.`,
  };
}

async function execBusinessSocialMediaStrategy(_workspaceId: string, input: any) {
  const { business_name = "Your Business", business_type = "business", target_customer = "local customers", team_size = 1, posting_frequency = "3x per week" } = input ?? {};
  return {
    guide: `Social Media Strategy — ${business_name}`,
    business_type, target_customer, team_size, posting_frequency,
    platform_selection: {
      choose_based_on_customer: {
        local_consumers: ["Facebook (35+ audience, community groups)", "Instagram (visual content, under 40)", "Nextdoor (hyper-local, neighbors)"],
        young_consumers: ["Instagram (primary)", "TikTok (fastest growth, under 35)", "YouTube Shorts"],
        business_owners: ["LinkedIn (B2B primary)", "Facebook (secondary)", "Instagram (brand awareness)"],
        visual_industries: ["Instagram (primary)", "Pinterest (home, food, fashion)", "TikTok (behind-the-scenes)"],
      },
      recommendation: `For a ${business_type} targeting ${target_customer}: Focus on 2 platforms maximum. Master those before expanding.`,
    },
    content_pillars: [
      { pillar: "Educational (40%)", description: "Teach your audience something valuable about your industry", examples: ["'3 things to look for when choosing a [business type]'", "'Common mistakes [target customer] make'", "'How [your process] works'"] },
      { pillar: "Social Proof (30%)", description: "Show that real customers trust and love you", examples: ["Customer testimonials and reviews", "Before/after results", "Case studies", "User-generated content"] },
      { pillar: "Behind the Scenes (20%)", description: "Build personal connection and trust", examples: ["Your team at work", "Your process", "Day in the life", "Meet the team"] },
      { pillar: "Promotional (10%)", description: "Direct offers and calls to action", examples: ["Special offers", "New service announcements", "Grand opening promos"] },
    ],
    posting_schedule: {
      frequency: posting_frequency,
      best_times: { Instagram: "Tue–Fri, 9am–11am or 2pm–4pm", Facebook: "Wed–Fri, 1pm–4pm", LinkedIn: "Tue–Thu, 8am–10am or 12pm" },
      tools: ["Buffer ($15/mo) — schedule posts across platforms", "Later ($18/mo) — best for Instagram scheduling", "Meta Business Suite (free) — Facebook + Instagram scheduling directly from Meta"],
    },
    content_creation: {
      tools: ["Canva Pro ($13/mo) — professional graphics without a designer", "CapCut (free) — best free video editing for Reels/TikTok", "ChatGPT — draft caption copy quickly"],
      batch_shooting: `${team_size <= 2 ? "Dedicate 2 hours every other week to batch-shoot content for the next 2 weeks. This is faster than creating daily." : "Assign content creation to a team member or hire a part-time social media person ($15–$25/hr)."}`,
    },
    growth_tactics: [
      "Respond to every comment and DM within 24 hours — algorithm rewards engagement",
      "Engage with 10–20 accounts in your niche daily (comment genuinely, not just emojis)",
      "Tag your location in every post — massive for local discovery",
      "Collaborate with complementary businesses for cross-promotion",
      "Run a monthly giveaway to grow your following — require follow + tag a friend",
    ],
  };
}

async function execBusinessReviewRequestTemplate(_workspaceId: string, input: any) {
  const { business_name = "Your Business", business_type = "business", review_platform = "Google", service_description = "our services" } = input ?? {};
  return {
    templates: {
      sms: {
        send_timing: "Send 1–2 hours after service completion or product delivery",
        message: `Hi [Customer Name]! Thank you for choosing ${business_name}. We hope you're happy with ${service_description}! If you have a moment, a quick review on ${review_platform} would mean a lot to our team: [REVIEW LINK]. Thank you! 🙏`,
        follow_up: `Hi [Customer Name], just following up — we'd still love to hear about your experience with ${business_name}! [REVIEW LINK] — takes less than 2 minutes. Thank you!`,
      },
      email: {
        subject: `How was your experience with ${business_name}?`,
        body: `Hi [Customer Name],\n\nThank you for choosing ${business_name}! It was a pleasure working with you.\n\nWe're always looking to improve, and your feedback helps us serve customers like you better. If you have 2 minutes, we'd really appreciate a review on ${review_platform}:\n\n👉 [${review_platform} REVIEW LINK]\n\nYour honest feedback helps other people find a business they can trust — and helps us keep doing what we love.\n\nIf there's anything we could have done better, please reply to this email. We'd love the chance to make it right.\n\nThank you again,\n[Your Name]\n${business_name}\n[Phone] | [Website]`,
      },
      in_person_script: `"[Customer Name], we really appreciate your business today. If you're happy with [the service/your purchase], we'd love it if you could leave us a quick Google review — it really helps our small business. I can text you the link right now if that's easier?"`,
      invoice_footer: `Enjoyed working with us? Leave us a review on ${review_platform}: [SHORT LINK]. It takes 2 minutes and means the world to our team. Thank you! ⭐`,
    },
    collection_strategy: [
      `Ask every customer, every time — make it part of your process (end of job, checkout, invoice sent)`,
      "Text beats email for review requests — 98% open rate vs. 20% for email",
      "Make the link as short as possible — use bit.ly or your link-shortener of choice",
      "Set up a QR code that links to your review page — print it on receipts, business cards, and signs",
      `${review_platform === "Google" ? "For Google: search your business name on Google, click 'Write a review', copy that URL and shorten it" : `Find your ${review_platform} review link in your business profile settings`}`,
    ],
    responding_to_reviews: {
      five_star: "Thank by name, reference something specific they mentioned, invite them back: 'Thank you so much, [Name]! We're thrilled you had a great experience. We'd love to work with you again!'",
      one_to_three_star: "Respond within 24 hours. Never be defensive. Acknowledge → Apologize → Offer to resolve: 'We're so sorry your experience wasn't what it should have been. We'd love the opportunity to make this right — please reach out to us at [contact] so we can address this directly.'",
      golden_rule: "Never argue or be defensive in a public reply — a graceful response to a negative review impresses future customers more than the review itself hurts you.",
    },
    review_volume_goals: "0–10 reviews: get to 10 as fast as possible (under 10 looks inactive). 10–50 reviews: builds steady trust. 50+ reviews: strong social proof that drives conversions.",
    platforms_by_industry: {
      local_service: "Google first, then Yelp and Facebook",
      restaurant: "Google, Yelp, TripAdvisor",
      retail: "Google, Facebook, industry-specific sites",
      b2b: "Google, LinkedIn, G2 or Clutch (for SaaS/agencies)",
    },
  };
}

async function execBusinessPromoCampaignGenerate(_workspaceId: string, input: any) {
  const { business_name = "Your Business", business_type = "business", campaign_name = "Promotional Campaign", offer = "Special offer", start_date = "TBD", end_date = "TBD", target_customer = "local customers", channels = ["Google Ads", "Facebook", "Instagram", "Email", "SMS"] } = input ?? {};
  return {
    campaign: `${campaign_name} — ${business_name}`,
    business_type, offer, duration: `${start_date} → ${end_date}`, channels, target_customer,
    campaign_brief: {
      objective: `Drive new customer acquisition and revenue for ${business_name} during the campaign period`,
      target_audience: target_customer,
      key_message: `${business_name} — ${offer}. Professional service, proven results. [Call to action].`,
      urgency: `Offer valid through ${end_date} only`,
    },
    channel_playbook: channels.map((channel: string) => ({
      channel,
      content: channel === "Google Ads"
        ? { action: "Add promotion extension to all active campaigns", headline: `${offer} — Limited Time at ${business_name}`, note: "Increase bids by 20% during campaign window to capture more impressions" }
        : channel === "Facebook" || channel === "Instagram"
        ? { format: "Video or photo ad with offer overlay", caption: `🎉 ${offer} at ${business_name}! ${campaign_name} — valid through ${end_date}. [Link in bio / Shop Now / Contact Us]`, budget: `$${Math.round(300 * 0.50)}/month`, audience: "3–15 mile radius + lookalike of past customers" }
        : channel === "Email"
        ? { subject: `[Limited Time] ${offer} — ${campaign_name}`, preview_text: `Don't miss this — ends ${end_date}`, body: `Hi [Name],\n\nFor a limited time, ${business_name} is offering ${offer} as part of our ${campaign_name}.\n\nThis offer is only valid through ${end_date}, so don't wait.\n\n[CTA BUTTON: Claim Your Offer]\n\nThank you for your continued support,\n[Your Name]\n${business_name}`, tip: "Send to your full list on Day 1, then resend to non-openers on Day 4 with a subject line like 'Did you see this?'" }
        : channel === "SMS"
        ? { message: `🎉 ${business_name}: ${offer}! ${campaign_name} — valid through ${end_date}. Tap to claim: [link]. Reply STOP to opt out.`, timing: "Send Tuesday–Thursday 10am–noon — highest open rates for promotional SMS" }
        : channel === "LinkedIn"
        ? { post: `Excited to announce our ${campaign_name} at ${business_name}! We're offering ${offer} for ${target_customer}. If you know someone who could benefit, please tag them or share this post. Offer valid through ${end_date}. [Contact link]`, note: "Best for B2B businesses — LinkedIn has highest income demographic of any social platform" }
        : channel === "Flyer/Poster"
        ? { headline: `${offer}`, subhead: `${campaign_name} | ${business_name}`, body: `Valid ${start_date}–${end_date}`, distribution: "Post in local coffee shops, community boards, apartment lobbies, and partner businesses within your target area", qr_code: "Add a QR code linking to your website or offer landing page" }
        : channel === "Nextdoor"
        ? { post: `Hi neighbors! ${business_name} is running a ${campaign_name} — ${offer} for ${target_customer} in our area. We're local and love serving this community. Valid through ${end_date}. Feel free to message me with any questions!`, tip: "Nextdoor posts from real neighbors get much higher engagement than business posts — ask satisfied customers to share the offer on Nextdoor" }
        : { action: `Promote campaign on ${channel}` },
    })),
    grand_opening_extras: campaign_name.toLowerCase().includes("grand opening") ? {
      ribbon_cutting: "Contact your local Chamber of Commerce — free ceremony, local press coverage, and community credibility",
      press_release: "Email your local newspaper's business editor 2 weeks before with a press release. Angle: new local business, jobs created, community contribution.",
      influencer_preview: "Invite 3–5 local micro-influencers (1k–10k followers) to a preview event in exchange for authentic posts",
      soft_open: "Run 1 week of soft opening to work out operational issues before the public campaign launches",
    } : undefined,
    email_sequence: {
      day_1: "Campaign announcement — full offer details",
      day_4: "Resend to non-openers with different subject line",
      day_7: "Midpoint reminder — 'Halfway through [campaign name]'",
      final_day: "Last chance — 'Today is the last day'",
    },
    success_metrics: { track: ["New leads/customers acquired", "Revenue during campaign vs. same period prior", "Cost per new customer by channel", "Best-performing channel by conversion rate", "Social media follower growth"], review_at: "Midpoint check — pause underperforming channels, double budget on what's working" },
    pro_tip: "Your email list and SMS list are your highest-ROI channels because they're free to send to. Before every paid campaign, blast your existing list first — the best promo spend is always on people who already know you.",
  };
}
