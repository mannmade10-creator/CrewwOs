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
};