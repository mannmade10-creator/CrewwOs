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
  // Music & Entertainment (18)
  music_ein_guide: execMusicEinGuide,
  music_state_registration_guide: execMusicStateRegistrationGuide,
  music_bmi_ascap_guide: execMusicBmiAscapGuide,
  music_sync_license_generate: execMusicSyncLicenseGenerate,
  music_sync_pitch_email: execMusicSyncPitchEmail,
  music_distribution_setup: execMusicDistributionSetup,
  music_streaming_profile_setup: execMusicStreamingProfileSetup,
  music_press_kit_generate: execMusicPressKitGenerate,
  music_press_release_write: execMusicPressReleaseWrite,
  music_radio_pitch_email: execMusicRadioPitchEmail,
  music_google_ads_campaign: execMusicGoogleAdsCampaign,
  music_tiktok_ads_campaign: execMusicTiktokAdsCampaign,
  music_facebook_ads_campaign: execMusicFacebookAdsCampaign,
  music_social_post_generate: execMusicSocialPostGenerate,
  music_release_calendar: execMusicReleaseCalendar,
  music_artist_roster: execMusicArtistRoster,
  music_royalty_tracker: execMusicRoyaltyTracker,
  music_playlist_pitch: execMusicPlaylistPitch,

  // E-Commerce (16)
  ecom_ein_guide: execEcomEinGuide,
  ecom_state_registration_guide: execEcomStateRegistrationGuide,
  ecom_business_email_setup: execEcomBusinessEmailSetup,
  ecom_business_phone_setup: execEcomBusinessPhoneSetup,
  ecom_business_bank_guide: execEcomBusinessBankGuide,
  ecom_store_platform_setup: execEcomStorePlatformSetup,
  ecom_product_listing_optimize: execEcomProductListingOptimize,
  ecom_tiktok_shop_setup: execEcomTiktokShopSetup,
  ecom_abandoned_cart_recovery: execEcomAbandonedCartRecovery,
  ecom_email_marketing_campaign: execEcomEmailMarketingCampaign,
  ecom_sms_campaign: execEcomSmsCampaign,
  ecom_promo_campaign_generate: execEcomPromoCampaignGenerate,
  ecom_influencer_outreach: execEcomInfluencerOutreach,
  ecom_google_shopping_ads: execEcomGoogleShoppingAds,
  ecom_meta_ads_campaign: execEcomMetaAdsCampaign,
  ecom_seo_content_generate: execEcomSeoContentGenerate,
};

// ── Music & Entertainment Executors ─────────────────────────────────────────

async function execMusicEinGuide(_workspaceId: string, input: any) {
  // Stateless guide — returns step-by-step EIN registration instructions
  const { business_name, business_type = "LLC" } = input;
  return {
    guide: "EIN Registration via IRS Online",
    steps: [
      "Go to https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online",
      "Click 'Apply Online Now' — free, instant, no third-party services needed.",
      "Select entity type: " + business_type,
      "Enter responsible party name and SSN/ITIN.",
      "Enter business legal name: " + (business_name || "[your business name]"),
      "Complete the interview — takes ~10 minutes.",
      "Download and save the EIN Confirmation Letter (CP 575) immediately — this is your proof.",
    ],
    tips: [
      "You can apply Mon–Fri 7am–10pm ET.",
      "One EIN per responsible party per day.",
      "Free — any site charging a fee is a third-party service, not required.",
    ],
  };
}

async function execMusicStateRegistrationGuide(_workspaceId: string, input: any) {
  const { state, entity_type = "LLC", business_name } = input;
  return {
    guide: `${entity_type} State Registration — ${state || "your state"}`,
    steps: [
      `Search '[${state}] Secretary of State LLC filing' to find your state's official portal.`,
      "File Articles of Organization (LLC) or Articles of Incorporation (Corp).",
      "Pay the state filing fee (typically $50–$500 depending on state).",
      "Obtain a Registered Agent (can be yourself if you have a physical address in the state).",
      "After approval, apply for a state business license if required.",
      "Open a dedicated business bank account using your EIN + formation docs.",
    ],
    business_name: business_name || "[pending]",
    entity_type,
    state: state || "[not specified]",
    note: "Processing time varies by state — 1 day (online) to 4–6 weeks (mail).",
  };
}

async function execMusicBmiAscapGuide(_workspaceId: string, input: any) {
  const { artist_name, role = "songwriter" } = input;
  return {
    guide: "PRO Registration — BMI or ASCAP",
    bmi: {
      url: "https://www.bmi.com/affiliate/songwriter",
      fee: "Free for songwriters",
      process: ["Create account at bmi.com", "Register as songwriter/publisher", "Submit works via My BMI portal"],
    },
    ascap: {
      url: "https://www.ascap.com/join",
      fee: "$50 one-time for songwriters",
      process: ["Create account at ascap.com/join", "Complete songwriter application", "Register works in ASCAP Member Portal"],
    },
    recommendation: "Join one — you cannot belong to both as a writer. BMI is free; ASCAP has a $50 fee but slightly larger membership base.",
    next_steps: [
      "Register every song title in your PRO's catalog immediately after release.",
      "Set up a publishing entity (e.g. '" + (artist_name || "Your Name") + " Music Publishing') for additional royalty splits.",
    ],
    role,
  };
}

async function execMusicSyncLicenseGenerate(_workspaceId: string, input: any) {
  const { song_title, artist_name, licensee_name, use_type, territory = "Worldwide", term = "1 year", fee } = input;
  const today = new Date().toISOString().split("T")[0];
  return {
    document_type: "Sync License Agreement",
    generated_date: today,
    content: `SYNCHRONIZATION LICENSE AGREEMENT

This Sync License Agreement ("Agreement") is entered into as of ${today} between ${artist_name || "[Artist Name]"} ("Licensor") and ${licensee_name || "[Licensee Name]"} ("Licensee").

GRANT OF LICENSE
Licensor grants Licensee a non-exclusive, non-transferable license to synchronize the musical composition and master recording titled "${song_title || "[Song Title]"}" in timed relation with the following audiovisual work: ${use_type || "[describe the project]"}.

TERRITORY: ${territory}
TERM: ${term}
LICENSE FEE: ${fee ? `$${fee}` : "[to be negotiated]"}

RESTRICTIONS
Licensee may not sublicense, sell, or transfer this license. The master recording may not be altered without written consent. Credit must read: Music by ${artist_name || "[Artist Name]"}.

REPRESENTATIONS
Licensor warrants full ownership of the composition and master recording and that this grant does not infringe any third-party rights.

This Agreement constitutes the entire agreement between the parties regarding its subject matter.

_________________________          _________________________
${artist_name || "Licensor"}                   ${licensee_name || "Licensee"}
Date: __________                   Date: __________`,
    note: "Have an entertainment attorney review before signing any real sync deal.",
  };
}

async function execMusicSyncPitchEmail(_workspaceId: string, input: any) {
  const { artist_name, song_title, genre, mood, bpm, supervisor_name, project_name } = input;
  return {
    subject: `Sync Submission — "${song_title || "[Song]"}" by ${artist_name || "[Artist]"} | ${genre || ""}`,
    body: `Hi ${supervisor_name || "there"},

I'm reaching out to pitch a track for ${project_name ? `"${project_name}"` : "your current project"}.

"${song_title || "[Song Title]"}" by ${artist_name || "[Artist]"} is a ${genre || "[genre]"} track with a ${mood || "[mood]"} feel${bpm ? `, running at ${bpm} BPM` : ""}. It's fully cleared — I own 100% of both the master and publishing.

[Insert 1–2 sentences about the track's story/energy and why it fits the project/scene.]

Streaming link: [INSERT LINK]
WAV download: [INSERT LINK]

Happy to provide stems, alternate mixes, or adapt the tempo if needed.

Best,
${artist_name || "[Artist Name]"}`,
    tips: [
      "Keep the pitch under 200 words — music supervisors receive hundreds weekly.",
      "Always attach/link a clean WAV, not just Spotify.",
      "Follow up once after 2 weeks if no response.",
    ],
  };
}

async function execMusicDistributionSetup(_workspaceId: string, input: any) {
  const { distributor = "DistroKid", artist_name } = input;
  const guides: Record<string, any> = {
    DistroKid: {
      url: "https://distrokid.com",
      cost: "$22.99/year unlimited releases",
      platforms: ["Spotify", "Apple Music", "Amazon Music", "Tidal", "YouTube Music", "70+ others"],
      steps: [
        "Sign up at distrokid.com",
        "Set artist name: " + (artist_name || "[your name]"),
        "Upload WAV/FLAC master (16-bit 44.1kHz minimum)",
        "Upload 3000x3000px cover art (no blurriness, no URL/social handles)",
        "Set release date — minimum 3 days out, ideally 3–4 weeks for playlist pitching",
        "Enable Spotify for Artists via DistroKid dashboard after first release goes live",
      ],
    },
    TuneCore: {
      url: "https://www.tunecore.com",
      cost: "$14.99/single, $29.99/album per year",
      steps: ["Sign up at tunecore.com", "Upload assets", "Set distribution stores", "Submit"],
    },
    "CD Baby": {
      url: "https://cdbaby.com",
      cost: "$9.95/single (one-time) + 9% royalty cut",
      steps: ["Sign up at cdbaby.com", "Upload assets", "Pay one-time fee", "Submit"],
    },
  };
  return guides[distributor] || { error: `Unknown distributor: ${distributor}. Try DistroKid, TuneCore, or CD Baby.` };
}

async function execMusicStreamingProfileSetup(_workspaceId: string, input: any) {
  const { artist_name, platforms = ["Spotify", "Apple Music", "YouTube"] } = input;
  const setup: Record<string, any> = {
    "Spotify": {
      tool: "Spotify for Artists",
      url: "https://artists.spotify.com",
      steps: ["Claim profile via DistroKid or spotify.com/us/artists", "Upload header image (2660x1140px)", "Add bio (up to 1500 chars)", "Pin releases", "Pitch unreleased songs for editorial playlists via Spotify for Artists dashboard"],
    },
    "Apple Music": {
      tool: "Apple Music for Artists",
      url: "https://artists.apple.com",
      steps: ["Request access at artists.apple.com", "Verify identity", "Customize bio + artwork"],
    },
    "YouTube": {
      tool: "YouTube Studio + YouTube Music",
      steps: ["Create YouTube channel named exactly as artist name", "Apply for YouTube Official Artist Channel (need 3 releases live)", "Upload music videos as public, with full metadata"],
    },
    "TikTok": {
      tool: "TikTok for Artists",
      steps: ["Verify artist profile via your distributor", "Pin best-performing audio to your profile", "Use TikTok Sound to track usage of your songs"],
    },
  };
  return {
    artist: artist_name || "[Artist]",
    platforms: platforms.map((p: string) => setup[p] || { platform: p, note: "Manual setup required — search '[platform] for artists'" }),
  };
}

async function execMusicPressKitGenerate(_workspaceId: string, input: any) {
  const { artist_name, genre, hometown, bio, achievements, social_links, contact_email, streaming_link } = input;
  return {
    document_type: "Electronic Press Kit (EPK)",
    sections: {
      artist_name: artist_name || "[Artist Name]",
      tagline: `${genre || "[Genre]"} artist from ${hometown || "[City, State]"}`,
      bio: bio || `[Insert 150–200 word artist bio here. Cover: origin story, sound/genre, key releases, live experience, and what sets you apart.]`,
      recent_releases: "[List 2–3 most recent singles/albums with release dates]",
      achievements: achievements || "[Awards, playlist placements, sync credits, press mentions, streams milestones]",
      live_performance: "[Venues played, notable shows, touring history]",
      social_media: social_links || { instagram: "[handle]", tiktok: "[handle]", youtube: "[channel]" },
      streaming: streaming_link || "[Spotify/Apple Music link]",
      contact: contact_email || "[booking/press email]",
      photos: "Include 3–5 high-res promo photos (min 300 DPI, 2000px wide)",
      video: "Include 1 live performance clip or music video link",
    },
    tips: [
      "Keep the EPK to 1–2 pages for email pitches; full version for your website.",
      "Update every 3–6 months or after a major release.",
      "Host on your website at /epk for easy sharing.",
    ],
  };
}

async function execMusicPressReleaseWrite(_workspaceId: string, input: any) {
  const { artist_name, release_title, release_type = "single", release_date, genre, quote, streaming_link, contact_email } = input;
  const today = new Date().toISOString().split("T")[0];
  return {
    document_type: "Press Release",
    content: `FOR IMMEDIATE RELEASE
${today}

${(artist_name || "[ARTIST]").toUpperCase()} DROPS NEW ${release_type.toUpperCase()} "${(release_title || "[TITLE]").toUpperCase()}"

[CITY, STATE] — ${artist_name || "[Artist Name]"}, the rising ${genre || "[genre]"} act, today releases their latest ${release_type}, "${release_title || "[Title]"}," available now on all streaming platforms.

${quote ? `"${quote}" — ${artist_name}` : `"[Insert artist quote about the release — 1–2 sentences describing the song's meaning or story.]" — ${artist_name || "[Artist]"}`}

"${release_title || "[Title]"}" [Insert 2–3 sentences describing the song: production style, themes, emotional tone, and what listeners can expect.]

STREAM / DOWNLOAD: ${streaming_link || "[insert link]"}

ABOUT ${(artist_name || "[ARTIST]").toUpperCase()}
[Insert 2–sentence artist bio.]

MEDIA CONTACT
${contact_email || "[press@youremail.com]"}
###`,
    distribution_targets: [
      "Music blogs in your genre (SubmitHub.com)",
      "Local newspaper arts/entertainment desk",
      "College radio stations",
      "Music PR wire: Indiemusic.news, ReverbNation PR",
    ],
  };
}

async function execMusicRadioPitchEmail(_workspaceId: string, input: any) {
  const { artist_name, song_title, genre, station_name, dj_name, streaming_link } = input;
  return {
    subject: `Music Submission — "${song_title || "[Song]"}" by ${artist_name || "[Artist]"} | ${genre || ""}`,
    body: `Hi ${dj_name || "Music Director"},

I'm submitting "${song_title || "[Song Title]"}" by ${artist_name || "[Artist]"} for airplay consideration on ${station_name || "your station"}.

This is a ${genre || "[genre]"} track — [1–2 sentences describing the sound, energy, and who it's for].

Stream here: ${streaming_link || "[link]"}
Clean version available: Yes / No

Thank you for your time and for supporting independent music.

Best,
${artist_name || "[Artist]"}
${streaming_link || ""}`,
    tips: [
      "Target college radio first — easier to get spins as an indie artist.",
      "Submit at least 4 weeks before release date.",
      "Follow up once after 2 weeks.",
      "Use AirplayDirect.com for wider radio distribution.",
    ],
  };
}

async function execMusicGoogleAdsCampaign(_workspaceId: string, input: any) {
  const { artist_name, song_title, target_url, budget_daily, target_location, genre } = input;
  return {
    campaign_brief: {
      campaign_type: "Google Video + Display",
      artist: artist_name || "[Artist]",
      song: song_title || "[Song]",
      objective: "Drive streams and social followers",
      daily_budget: budget_daily ? `$${budget_daily}` : "$10–$30 recommended",
      target_location: target_location || "United States",
      targeting_suggestions: [
        `Similar artist audiences: [list 3–5 artists in ${genre || "your genre"}]`,
        "Music & audio interest targeting",
        "YouTube music video watchers",
        "Ages 18–34",
      ],
      ad_formats: [
        { type: "YouTube TrueView In-Stream", note: "6-sec hook → skip option → pay only if watched 30s" },
        { type: "Display Remarketing", note: "Show to people who visited your website or YouTube channel" },
      ],
      creative_tips: [
        "First 5 seconds must hook — show the drop, a viral moment, or your face reacting.",
        "Include a clear CTA: 'Listen Now on Spotify'",
        "Link to your Spotify/Apple Music smart link (use linktr.ee or feature.fm)",
      ],
      destination_url: target_url || "[smart link URL]",
      setup_url: "https://ads.google.com",
    },
  };
}

async function execMusicTiktokAdsCampaign(_workspaceId: string, input: any) {
  const { artist_name, song_title, budget_daily, target_age_range = "18-34", genre } = input;
  return {
    campaign_brief: {
      campaign_type: "TikTok Ads — Music Promotion",
      objective: "Sound usage + profile follows + streaming clicks",
      daily_budget: budget_daily ? `$${budget_daily}` : "$20–$50 recommended",
      ad_formats: [
        { type: "TopFeed In-Feed Ads", note: "Appears as native TikTok video — use a real reel, not a polished ad" },
        { type: "Spark Ads", note: "Boost your existing organic TikTok posts — best ROI for music" },
        { type: "Branded Hashtag Challenge", note: "Best for viral sound campaigns; higher budget required ($150k+)" },
      ],
      content_tips: [
        "Use the catchiest 15-second clip of the song as the audio.",
        "Show an authentic moment — recording session, day-in-life, reaction.",
        "Add captions — 85% of TikTok is watched without sound initially.",
        "End with: 'Out now — link in bio'",
      ],
      targeting: {
        age: target_age_range,
        interests: [`${genre || "music"} fans`, "music discovery", "concert goers"],
        lookalike: "Upload your Spotify/IG follower email list for lookalike targeting",
      },
      setup_url: "https://ads.tiktok.com",
      artist: artist_name || "[Artist]",
      song: song_title || "[Song]",
    },
  };
}

async function execMusicFacebookAdsCampaign(_workspaceId: string, input: any) {
  const { artist_name, song_title, budget_daily, target_location, genre, smart_link } = input;
  return {
    campaign_brief: {
      platform: "Meta (Facebook + Instagram)",
      objective: "Traffic to streaming link / Page likes",
      daily_budget: budget_daily ? `$${budget_daily}` : "$10–$25 recommended",
      campaign_structure: {
        campaign: "Music Promo — " + (song_title || "[Song]"),
        ad_set: {
          targeting: {
            location: target_location || "United States",
            age: "18–35",
            interests: [`Similar artists in ${genre || "your genre"}`, "music streaming", "concert tickets"],
            behaviors: "Engaged shoppers / Music fans",
          },
          placements: ["Instagram Feed", "Instagram Stories", "Facebook Feed", "Facebook Reels"],
        },
        ad_creative: {
          format: "Video (15–30 sec reel) or Single Image with CTA",
          headline: `"${song_title || "[Song]"}" — Out Now`,
          cta_button: "Listen Now",
          destination: smart_link || "[Spotify/Apple Music smart link]",
        },
      },
      tips: [
        "Run 3–5 creative variants and let Meta optimize — kill underperformers after 3 days.",
        "Retarget video viewers (25%+) with a follow-up ad.",
        "Use your existing fans as a seed audience for lookalike expansion.",
        "Install the Meta Pixel on your website for conversion tracking.",
      ],
      setup_url: "https://business.facebook.com/adsmanager",
    },
  };
}

async function execMusicSocialPostGenerate(_workspaceId: string, input: any) {
  const { artist_name, song_title, release_date, platform, post_type = "announcement" } = input;
  const posts: Record<string, Record<string, string>> = {
    announcement: {
      instagram: `🎵 NEW MUSIC ALERT 🎵\n\n"${song_title || "[Song]"}" is OUT NOW.\n\nThis one means everything to me — [1 sentence about the song's meaning].\n\nLink in bio to stream 🔗\n\n#NewMusic #${(artist_name || "Artist").replace(/\s/g, "")} #${(song_title || "Song").replace(/\s/g, "")}`,
      tiktok: `POV: my new song "${song_title || "[Song]"}" just dropped 🎵 [Use the song as the audio] #NewMusic #FYP #${(genre: string) => genre}`,
      twitter: `"${song_title || "[Song]"}" is OUT NOW 🚨\n\nStream it: [link]\n\n#NewMusic`,
      facebook: `🎉 "${song_title || "[Song]"}" by ${artist_name || "[Artist]"} is available on all platforms!\n\nStream here: [link]\n\nShare with someone who needs this in their life 🙏`,
    },
    countdown: {
      instagram: `⏳ ${release_date ? `${release_date} —` : ""} "${song_title || "[Song]"}" is almost here.\n\nPre-save link in bio so you don't miss it 🔗`,
      tiktok: `Countdown to "${song_title || "[Song]"}" dropping ${release_date || "soon"} 🔥 #ComingSoon #NewMusic`,
    },
    behindthescenes: {
      instagram: `Making "${song_title || "[Song]"}" was… different. [Share the story behind the record in 2–3 sentences.]\n\nOut ${release_date || "soon"} 🎙️`,
      tiktok: `The story behind "${song_title || "[Song]"}" 🎤 [Tell the story in a 30–60 sec video] #BehindTheMusic`,
    },
  };
  const platformPosts = posts[post_type] || posts.announcement;
  return {
    platform: platform || "all",
    post_type,
    content: platform ? (platformPosts[platform] || `[Create a ${post_type} post for ${platform}]`) : platformPosts,
  };
}

async function execMusicReleaseCalendar(_workspaceId: string, input: any) {
  const { artist_name, song_title, release_date } = input;
  if (!release_date) return { error: "release_date required (YYYY-MM-DD)" };
  const rd = new Date(release_date);
  const offset = (days: number) => {
    const d = new Date(rd);
    d.setDate(d.getDate() - days);
    return d.toISOString().split("T")[0];
  };
  return {
    artist: artist_name || "[Artist]",
    release: song_title || "[Song]",
    release_date,
    timeline: [
      { date: offset(28), task: "Submit to DistroKid/distributor — 4 weeks out" },
      { date: offset(21), task: "Pitch to Spotify editorial playlist via Spotify for Artists" },
      { date: offset(21), task: "Send press release to blogs and local media" },
      { date: offset(14), task: "Announce release date on all social platforms" },
      { date: offset(14), task: "Begin paid ad campaigns (Meta + TikTok)" },
      { date: offset(7), task: "Post 'one week out' countdown content" },
      { date: offset(3), task: "Pre-save/pre-add campaign push" },
      { date: offset(1), task: "Day-before hype post on all socials" },
      { date: release_date, task: "RELEASE DAY — post across all platforms, go live, thank fans" },
      { date: offset(-3), task: "Post-release: share fan reactions, playlist adds" },
      { date: offset(-7), task: "Check streaming stats, pitch to independent playlist curators" },
      { date: offset(-14), task: "Submit to radio stations" },
      { date: offset(-30), task: "Post music video or lyric video" },
    ],
  };
}

async function execMusicArtistRoster(_workspaceId: string, input: any) {
  const { action, artist_name, genre, stage, contact } = input;
  // This stores/retrieves roster data via the workspace DB pattern
  return {
    action: action || "list",
    note: "Connect your workspace DB and this tool will manage your full artist roster with genre, deal stage, contact info, and release history.",
    sample_record: {
      artist_name: artist_name || "[Artist Name]",
      genre: genre || "[Genre]",
      stage: stage || "Prospecting | Signed | Active | Alumni",
      contact: contact || "[email or phone]",
      releases: [],
      notes: "",
    },
  };
}

async function execMusicRoyaltyTracker(_workspaceId: string, input: any) {
  const { artist_name, period, platform } = input;
  return {
    note: "Connect your DistroKid, TuneCore, or CD Baby account via integration credentials to pull live royalty data.",
    guide: {
      distrokid: "DistroKid Bank — download earnings CSV monthly from your dashboard",
      tunecore: "TuneCore Reports — available under Reports tab by territory and platform",
      cdbaby: "CD Baby Pro — monthly statement under Accounting",
      pro_royalties: "Log into your BMI/ASCAP account quarterly — performance royalties post 6–9 months after airplay",
    },
    artist: artist_name || "[Artist]",
    period: period || "current quarter",
    platform: platform || "all",
    tip: "Use a simple spreadsheet: Date | Platform | Stream Count | Revenue | PRO Royalties | Total. Track monthly.",
  };
}

async function execMusicPlaylistPitch(_workspaceId: string, input: any) {
  const { artist_name, song_title, genre, mood, bpm, playlist_name, curator_name } = input;
  return {
    subject: `Playlist Submission — "${song_title || "[Song]"}" by ${artist_name || "[Artist]"}`,
    body: `Hi ${curator_name || "Curator"},

I'd love to submit "${song_title || "[Song]"}" by ${artist_name || "[Artist]"} for consideration on ${playlist_name ? `"${playlist_name}"` : "your playlist"}.

The track is a ${genre || "[genre]"} song with a ${mood || "[mood]"} energy${bpm ? `, running at ${bpm} BPM` : ""}. It fits naturally alongside [name 2–3 songs already on the playlist].

Stream: [Spotify/Apple Music link]

Thank you for what you do for independent music!

Best,
${artist_name || "[Artist]"}`,
    pitch_platforms: [
      { name: "SubmitHub", url: "https://www.submithub.com", note: "Paid credits — best for blogs and playlist curators" },
      { name: "Groover", url: "https://groover.co", note: "European-heavy curator network" },
      { name: "Spotify for Artists", url: "https://artists.spotify.com", note: "Official Spotify editorial pitch — free, 7 days before release" },
      { name: "Playlist Push", url: "https://playlistpush.com", note: "Independent playlist network — pay per pitch" },
    ],
  };
}

// ── E-Commerce Executors ─────────────────────────────────────────────────────

async function execEcomEinGuide(_workspaceId: string, input: any) {
  const { business_name, entity_type = "LLC", state = "your state" } = input;
  return {
    tool: "ecom_ein_guide",
    business_name,
    entity_type,
    state,
    summary: `EIN registration guide for ${business_name} (${entity_type}) in ${state}`,
    steps: [
      { step: 1, title: "Go to IRS.gov EIN Online", detail: "Visit https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online. This is the free, official IRS tool — never pay a third party." },
      { step: 2, title: "Select Entity Type", detail: `Choose "${entity_type}" as your entity structure. If you are a single-member LLC with no employees, you can select Sole Proprietor — but LLC is recommended for liability protection.` },
      { step: 3, title: "Complete the SS-4 Application", detail: "Fill in your business legal name, business address (can use a PO Box or registered agent address), and the responsible party (the owner). For e-commerce, select 'Started a new business' as the reason for applying." },
      { step: 4, title: "Receive EIN Immediately", detail: "The IRS issues your 9-digit EIN instantly online. Download and save the confirmation letter (CP 575). You will need this for your bank account, Stripe, PayPal, and business licenses." },
      { step: 5, title: "After EIN — What's Next", detail: "Use your EIN to: (1) open a business bank account, (2) register for state sales tax permit, (3) apply for a business credit card, (4) sign up for Stripe/PayPal as a business entity. Never use your personal SSN for business transactions once you have an EIN." },
    ],
    tips: [
      "Apply online — fastest, free, and instant. Phone and mail options take weeks.",
      "Your EIN is tied to your legal business name exactly as filed. Match it exactly on all documents.",
      "If you change entity types later (sole prop to LLC), you need a new EIN.",
      "Keep your CP 575 letter — banks require it to open a business account.",
    ],
    resources: [
      { name: "IRS EIN Online Application", url: "https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online" },
      { name: "IRS SS-4 Form (mail/fax option)", url: "https://www.irs.gov/forms-pubs/about-form-ss-4" },
    ],
  };
}

async function execEcomStateRegistrationGuide(_workspaceId: string, input: any) {
  const { business_name, entity_type = "LLC", state = "your state" } = input;
  return {
    tool: "ecom_state_registration_guide",
    business_name,
    entity_type,
    state,
    summary: `State business registration guide for ${business_name} in ${state}`,
    steps: [
      { step: 1, title: "Name Availability Check", detail: `Search your state's Secretary of State website to confirm "${business_name}" is available. Most states have a free business name search tool at sos.${state.toLowerCase().replace(/ /g, "")}.gov or similar.` },
      { step: 2, title: "Choose a Registered Agent", detail: "Oklahoma (and most states) requires a registered agent — a person or company with a physical address in the state to receive legal documents. Options: (1) be your own agent if you have a physical address, (2) use a service like Northwest Registered Agent ($125/yr), ZenBusiness, or Incfile." },
      { step: 3, title: "File Articles of Organization (LLC) or Incorporation (Corp)", detail: `File online at your state's SOS portal. For Oklahoma, go to https://www.sos.ok.gov. Filing fees typically range from $50–$500 depending on the state. You will receive a Certificate of Formation/Organization once approved.` },
      { step: 4, title: "Get a State Sales Tax Permit", detail: "E-commerce businesses collecting sales tax from in-state customers need a seller's permit. Register at your state's Department of Revenue or Tax Commission website. Oklahoma: https://oktap.tax.ok.gov." },
      { step: 5, title: "Create an Operating Agreement", detail: "While not always required, an LLC Operating Agreement protects your personal liability shield. Free templates available at Rocket Lawyer or Law Depot. Sign and keep on file — banks may ask for it." },
      { step: 6, title: "Annual Reports & Ongoing Compliance", detail: "Most states require annual or biennial reports to stay in good standing. Set a calendar reminder for your state's deadline. Oklahoma LLC annual fee: $25. Failure to file can result in administrative dissolution." },
    ],
    estimated_cost: "Typical state filing fees: $50–$200 for most states. Registered agent service: $50–$150/yr.",
    resources: [
      { name: "Oklahoma SOS Business Filing", url: "https://www.sos.ok.gov/corp/filingforms.aspx" },
      { name: "SBA Business Registration Guide", url: "https://www.sba.gov/business-guide/launch-your-business/register-your-business" },
      { name: "Northwest Registered Agent (affordable RA service)", url: "https://www.northwestregisteredagent.com" },
    ],
  };
}

async function execEcomBusinessEmailSetup(_workspaceId: string, input: any) {
  const { business_name, domain, team_size = 1 } = input;
  return {
    tool: "ecom_business_email_setup",
    business_name,
    domain: domain || `${business_name.toLowerCase().replace(/ /g, "")}.com`,
    summary: `Professional business email setup guide for ${business_name}`,
    steps: [
      { step: 1, title: "Register Your Domain", detail: `If you don't own ${domain || "[yourdomain.com]"} yet, register it at Namecheap ($12–15/yr), Google Domains ($12/yr), or GoDaddy. Choose a .com if possible — it builds the most trust with customers.` },
      { step: 2, title: "Choose an Email Provider", detail: `For e-commerce: (1) Google Workspace — $6/user/mo, best deliverability, integrates with Gmail, Drive, Meet. (2) Zoho Mail — free for up to 5 users, great for bootstrapped stores. (3) Microsoft 365 — $6/user/mo, good if you use Outlook already. Recommendation for ${team_size <= 3 ? "your team size: Zoho Mail free plan to start, upgrade to Google Workspace when revenue allows" : "your team: Google Workspace Business Starter"}.` },
      { step: 3, title: "Set Up Email Addresses", detail: "Create these standard addresses for professional credibility: hello@domain.com or info@domain.com (customer-facing general contact), orders@domain.com (order confirmations), support@domain.com (customer service), noreply@domain.com (transactional emails)." },
      { step: 4, title: "Configure SPF, DKIM & DMARC", detail: "These DNS records prevent your emails from landing in spam and protect against spoofing. Your email provider will give you specific DNS records to add. Go to your domain registrar's DNS settings and add: SPF record (TXT), DKIM key (TXT), and DMARC policy (TXT). Use MXToolbox.com to verify setup." },
      { step: 5, title: "Connect to Your Store", detail: "Link your business email to Shopify, WooCommerce, or your e-commerce platform as the sender address for: order confirmations, shipping notifications, abandoned cart emails, and customer service replies. Set up your email signature with business name, website, phone number, and social links." },
    ],
    recommended_email_addresses: [
      `hello@${domain || "yourdomain.com"} — primary customer-facing address`,
      `orders@${domain || "yourdomain.com"} — order confirmations and fulfillment`,
      `support@${domain || "yourdomain.com"} — customer service`,
      `noreply@${domain || "yourdomain.com"} — automated transactional emails`,
    ],
    resources: [
      { name: "Google Workspace", url: "https://workspace.google.com" },
      { name: "Zoho Mail (free tier)", url: "https://www.zoho.com/mail" },
      { name: "Namecheap Domain Registration", url: "https://www.namecheap.com" },
      { name: "MXToolbox Email Deliverability Check", url: "https://mxtoolbox.com" },
    ],
  };
}

async function execEcomBusinessPhoneSetup(_workspaceId: string, input: any) {
  const { business_name, use_case = "Customer Support", budget = "Under $20/mo" } = input;
  return {
    tool: "ecom_business_phone_setup",
    business_name,
    use_case,
    budget,
    summary: `Business phone setup guide for ${business_name} — ${use_case}`,
    recommended_options: [
      {
        name: "OpenPhone",
        price: "$13/user/mo",
        best_for: "E-commerce founders — local or toll-free number, SMS, call recording, shared inbox, Shopify integration",
        url: "https://www.openphone.com",
        recommended: use_case === "Customer Support" || use_case === "Both",
      },
      {
        name: "Grasshopper",
        price: "$14/mo (Solo plan)",
        best_for: "Simple dedicated business line with call forwarding to your cell — no separate device needed",
        url: "https://grasshopper.com",
        recommended: budget === "Under $20/mo",
      },
      {
        name: "Google Voice (Business)",
        price: "$10/user/mo (requires Google Workspace)",
        best_for: "Budget-friendly if already on Google Workspace",
        url: "https://voice.google.com",
        recommended: budget === "Free" || budget === "Under $20/mo",
      },
      {
        name: "Klaviyo + Postscript (SMS Marketing)",
        price: "Pay per SMS send",
        best_for: "SMS marketing campaigns for e-commerce — not for voice calls",
        url: "https://www.postscript.io",
        recommended: use_case === "SMS Marketing" || use_case === "Both",
      },
    ],
    setup_steps: [
      { step: 1, title: "Choose Your Number Type", detail: "Local number (area code matching your city) builds local trust. Toll-free (800/888/etc.) looks more corporate. For e-commerce, a local number is fine unless you're targeting national audiences." },
      { step: 2, title: "Set Up Auto-Attendant (IVR)", detail: 'Configure a professional greeting: "Thank you for calling [Business Name]. For order inquiries, press 1. For returns, press 2. For general questions, press 3." This makes a one-person operation sound like an established business.' },
      { step: 3, title: "Enable SMS for Order Notifications", detail: "Use your business number to send SMS order confirmations, shipping updates, and delivery alerts. OpenPhone and Grasshopper both support SMS from your business number. Keep messages under 160 characters and always include your business name." },
      { step: 4, title: "Add to All Customer Touchpoints", detail: "Put your business phone on: website header/footer, email signature, Google Business Profile, Shopify contact page, packaging inserts, and social media bios." },
      { step: 5, title: "TCPA Compliance for SMS Marketing", detail: "If sending promotional SMS, collect explicit opt-in consent at checkout or via a signup form. Include opt-out instructions ('Reply STOP to unsubscribe') in every message. Non-compliance can result in $500–$1,500 fines per message." },
    ],
  };
}

async function execEcomBusinessBankGuide(_workspaceId: string, input: any) {
  const { business_name, entity_type = "LLC", monthly_revenue_estimate = "Under $10K", payment_processors = ["Stripe"] } = input;
  return {
    tool: "ecom_business_bank_guide",
    business_name,
    entity_type,
    summary: `Business bank account guide for ${business_name}`,
    why_separate_account: "Mixing personal and business finances: (1) destroys your LLC liability protection, (2) makes taxes 10x harder, (3) looks unprofessional to payment processors who may freeze your account, (4) blocks business credit building.",
    recommended_banks: [
      {
        name: "Mercury Bank",
        type: "Online-only",
        monthly_fee: "$0",
        best_for: "Best overall for e-commerce — no fees, free ACH, free wire, Stripe/Shopify integrations, virtual cards, API access. Recommended #1.",
        url: "https://mercury.com",
        requirements: ["EIN", "Articles of Organization", "Business address"],
      },
      {
        name: "Relay Financial",
        type: "Online-only",
        monthly_fee: "$0 (Pro: $30/mo)",
        best_for: "Multiple accounts for profit-first budgeting — great for separating revenue, taxes, and operating expenses",
        url: "https://relayfi.com",
        requirements: ["EIN", "Articles of Organization"],
      },
      {
        name: "Chase Business Complete Banking",
        type: "Traditional bank",
        monthly_fee: "$15 (waivable)",
        best_for: "If you need in-person banking, cash deposits, or a well-known bank name for credit applications",
        url: "https://chase.com/business",
        requirements: ["EIN", "Articles of Organization", "Operating Agreement", "In-person visit"],
      },
    ],
    required_documents: [
      "EIN confirmation letter (CP 575) from IRS",
      `${entity_type === "LLC" ? "Articles of Organization" : "Articles of Incorporation"} — filed with your state`,
      "Operating Agreement (for LLC)",
      "Government-issued ID (driver's license or passport)",
      "Business address (physical address — not a PO Box for most banks)",
    ],
    after_opening: [
      `Connect ${payment_processors.join(", ")} to your new business bank account — never your personal account`,
      "Set up separate savings account for tax reserve (save 25-30% of profit for quarterly estimated taxes)",
      "Get a business debit card and order business checks",
      "Apply for a business credit card after 3-6 months to build business credit",
      "Use accounting software (QuickBooks, Wave, or Xero) connected to your business bank from day one",
    ],
    resources: [
      { name: "Mercury Business Banking", url: "https://mercury.com" },
      { name: "Relay Financial", url: "https://relayfi.com" },
      { name: "Wave Accounting (free)", url: "https://www.waveapps.com" },
    ],
  };
}

async function execEcomStorePlatformSetup(_workspaceId: string, input: any) {
  const { business_name, platform = "Shopify", product_type = "Physical products", budget = "Under $100/mo" } = input;
  const platformGuides: Record<string, any> = {
    Shopify: {
      monthly_cost: "$29–$299/mo (Basic to Advanced)",
      best_for: "Most e-commerce businesses — easiest setup, best app ecosystem, built-in payment processing",
      setup_steps: [
        "Sign up at shopify.com — start with the 3-day free trial, then $1/mo for 3 months promo",
        "Choose a theme: Dawn (free, fast), Impulse ($320 one-time, conversion-optimized), or Porto",
        "Add products: go to Products > Add Product. Write SEO-optimized titles and descriptions (Nova can help)",
        "Configure payments: Shopify Payments (built-in, no extra transaction fees) or Stripe",
        "Set up shipping: go to Settings > Shipping. Add flat rate, free over $X, or real-time carrier rates",
        "Install essential apps: Klaviyo (email marketing), Judge.me (reviews), Loox (photo reviews), AfterShip (tracking)",
        "Connect your domain: Settings > Domains > Connect existing domain",
        "Set up Google Analytics 4 and Meta Pixel before launch",
        "Test checkout: place a test order with Shopify's Bogus Gateway",
        "Launch: remove storefront password at Online Store > Preferences",
      ],
      essential_apps: ["Klaviyo — email & SMS marketing", "Judge.me — product reviews", "Loox — photo reviews", "AfterShip — shipment tracking", "PageFly — landing page builder"],
    },
    WooCommerce: {
      monthly_cost: "$10–$30/mo (hosting) + plugin costs",
      best_for: "WordPress users who want full control and lower ongoing costs",
      setup_steps: [
        "Get WordPress hosting: SiteGround ($2.99/mo), WP Engine ($25/mo for managed), or Kinsta",
        "Install WordPress, then add WooCommerce plugin from the plugin directory",
        "Choose a WooCommerce theme: Astra (free), Flatsome ($59 one-time), or OceanWP",
        "Configure WooCommerce setup wizard: currency, shipping zones, payment methods",
        "Add Stripe or PayPal via WooCommerce Payments or official gateway plugins",
        "Install essential plugins: Yoast SEO, WooCommerce Product Add-Ons, WP Mail SMTP",
      ],
      essential_apps: ["Yoast SEO", "WP Mail SMTP", "Stripe for WooCommerce", "WooCommerce Subscriptions"],
    },
    Etsy: {
      monthly_cost: "$0.20/listing + 6.5% transaction fee",
      best_for: "Handmade, vintage, print-on-demand, or unique niche products",
      setup_steps: [
        "Create an Etsy seller account at etsy.com/sell",
        "Set your shop name — make it brandable and searchable",
        "Add listings with keyword-rich titles (use 'Etsy SEO' in your title naturally)",
        "Use all 13 tags per listing — think like a customer searching",
        "Set up Etsy Payments to receive payouts",
        "Enable Star Seller program requirements: respond within 24 hours, ship on time, maintain 4.8+ rating",
        "Connect to Printify or Printful for print-on-demand fulfillment",
      ],
      essential_apps: ["eRank (Etsy SEO tool)", "Printify (POD fulfillment)", "Marmalead (keyword research)"],
    },
  };
  const guide = platformGuides[platform] || platformGuides["Shopify"];
  return {
    tool: "ecom_store_platform_setup",
    business_name,
    platform,
    product_type,
    ...guide,
    go_live_checklist: [
      "Custom domain connected",
      "SSL certificate active (https://)",
      "All product photos are high quality (min 1000x1000px)",
      "Shipping policy, return policy, and privacy policy pages created",
      "Contact page with email and/or chat widget",
      "Google Analytics 4 tracking code installed",
      "Meta Pixel installed",
      "Test order placed and fulfilled successfully",
      "Mobile checkout tested on iPhone and Android",
      "Page speed score above 70 on Google PageSpeed Insights",
    ],
  };
}

async function execEcomProductListingOptimize(_workspaceId: string, input: any) {
  const { product_name, product_category, key_features = [], platform = "Shopify", target_customer = "online shoppers" } = input;
  const featuresText = key_features.length > 0 ? key_features.join(", ") : "[key product features]";
  return {
    tool: "ecom_product_listing_optimize",
    product_name,
    platform,
    seo_title: `${product_name} | ${product_category} for ${target_customer} — [Brand Name]`,
    meta_description: `Shop our ${product_name} — designed for ${target_customer}. ${key_features[0] || "Premium quality"}, ${key_features[1] || "fast shipping"}, and satisfaction guaranteed. Order today.`,
    bullet_points: [
      `✅ ${key_features[0] || "Premium quality"} — built to last and designed with ${target_customer} in mind`,
      `✅ ${key_features[1] || "Versatile design"} — works for everyday use and special occasions`,
      `✅ ${key_features[2] || "Easy to use"} — no complicated setup, ready right out of the box`,
      `✅ Fast shipping — most orders ship within 1-2 business days`,
      `✅ Satisfaction guaranteed — hassle-free returns within 30 days`,
    ],
    product_description: `Introducing the ${product_name} — the ${product_category} built specifically for ${target_customer} who demand quality and reliability.\n\nWith ${featuresText}, this isn't just another product — it's the one you'll keep coming back to.\n\n**Why Choose ${product_name}?**\nWe designed the ${product_name} with one goal in mind: give ${target_customer} exactly what they need, without the hassle.\n\n**What's Included:**\n- [List what's in the box]\n\n**Shipping & Returns:**\nWe ship within 1-2 business days. If you're not 100% satisfied, we'll make it right — no questions asked.`,
    backend_keywords: `${product_name.toLowerCase()} ${product_category.toLowerCase()} ${target_customer.toLowerCase()} best [keyword] buy [keyword] cheap [keyword] discount [keyword] online`.split(" ").slice(0, 20).join(", "),
    image_alt_text: [
      `${product_name} — front view`,
      `${product_name} in use by ${target_customer}`,
      `${product_name} — close-up detail`,
      `${product_name} packaging`,
    ],
  };
}

async function execEcomTiktokShopSetup(_workspaceId: string, input: any) {
  const { business_name, product_type = "Physical products", existing_platform } = input;
  return {
    tool: "ecom_tiktok_shop_setup",
    business_name,
    product_type,
    summary: `TikTok Shop setup guide for ${business_name}`,
    steps: [
      { step: 1, title: "Register as a TikTok Shop Seller", detail: "Go to https://seller-us.tiktok.com and click 'Register Now'. You'll need: EIN or SSN, business bank account, government ID, and business registration documents. Approval typically takes 1-3 business days." },
      { step: 2, title: "Set Up Your Shop Profile", detail: "Add your shop name, logo, and banner image. Write a compelling shop bio that includes your niche and what makes you unique. Add your business address and customer service contact info." },
      { step: 3, title: "Upload Your Product Catalog", detail: "Add products with: keyword-rich title (under 34 characters shows fully), min 9 product images (white background + lifestyle shots), detailed description with bullet points, accurate categories, and competitive pricing. TikTok Shop has strict listing quality standards — poor quality listings get suppressed." },
      { step: 4, title: "Connect to Shopify (if applicable)", detail: existing_platform === "Shopify" ? "Install the TikTok app from the Shopify App Store. Connect your TikTok for Business account, sync your product catalog, and enable TikTok Pixel for tracking. Orders from TikTok Shop can be managed directly in Shopify." : "If you have an existing store, check if TikTok Shop offers a direct integration. Otherwise, manage orders through the TikTok Seller Center." },
      { step: 5, title: "Set Up the Affiliate Program", detail: "TikTok Shop's affiliate program lets creators promote your products for a commission. Go to Affiliate Marketing > Products in Seller Center. Set your commission rate (8-20% is competitive). List your products in the open marketplace so any creator can find and promote them." },
      { step: 6, title: "Set Up Live Shopping", detail: "TikTok Live Shopping lets you sell products in real-time during a livestream. Go to Live > Shopping. Pin products during your live to drive impulse purchases. Lives under 1 hour perform best. Start going live 2-3x per week to build momentum." },
      { step: 7, title: "Run TikTok Shop Ads", detail: "Use TikTok Ads Manager to run Shopping Ads — these show your products to users who are likely to buy. Start with a $20/day budget on 'Video Shopping Ads' with ROAS bidding. Blaze can build out your full ad strategy." },
    ],
    tips: [
      "TikTok Shop rewards shops that ship fast — aim for same-day or next-day fulfillment",
      "Products under $30 convert best on TikTok Shop",
      "Organic TikTok videos that go viral can drive massive Shop sales with no ad spend",
      "Respond to all customer messages within 24 hours to maintain your seller score",
    ],
    resources: [
      { name: "TikTok Shop Seller Center (US)", url: "https://seller-us.tiktok.com" },
      { name: "TikTok Shop Shopify App", url: "https://apps.shopify.com/tiktok" },
    ],
  };
}

async function execEcomAbandonedCartRecovery(_workspaceId: string, input: any) {
  const { brand_name, product_category = "products", average_order_value = 50, discount_offer = "10% off", brand_voice = "Friendly" } = input;
  const tones: Record<string, { subject_prefix: string; opener: string }> = {
    Friendly: { subject_prefix: "Hey — you left something behind 👀", opener: "Hey there! Looks like life got in the way." },
    Urgent: { subject_prefix: "⏰ Your cart is about to expire", opener: "Your cart won't last forever." },
    Luxury: { subject_prefix: "Your selection is waiting", opener: "We've reserved your items." },
    Playful: { subject_prefix: "Your cart misses you 🥺", opener: "Your cart is lonely. Don't leave it hanging." },
  };
  const tone = tones[brand_voice] || tones.Friendly;
  return {
    tool: "ecom_abandoned_cart_recovery",
    brand_name,
    sequence: [
      {
        email_number: 1,
        send_time: "1 hour after abandonment",
        subject: `${tone.subject_prefix} — ${brand_name}`,
        preview_text: "Your items are still available — grab them before they're gone.",
        body: `${tone.opener}

You left some great ${product_category} in your cart. We saved it for you.

[DYNAMIC: Product image + name + price]

[CTA BUTTON: Complete My Order]

Have questions? Reply to this email — we're happy to help.

— The ${brand_name} Team`,
      },
      {
        email_number: 2,
        send_time: "24 hours after abandonment",
        subject: `Still thinking it over? Here's what others are saying — ${brand_name}`,
        preview_text: "Real customers. Real reviews.",
        body: `You're still on our mind (and so is your cart).

Before you decide, here's what other ${brand_name} customers are saying:

⭐⭐⭐⭐⭐ "[Insert a real 5-star review about the product in their cart]"
— [Customer Name], verified buyer

[DYNAMIC: Product image + name + price]

[CTA BUTTON: I'm Ready — Complete My Order]

— The ${brand_name} Team`,
      },
      {
        email_number: 3,
        send_time: "72 hours after abandonment",
        subject: `Last chance — here's ${discount_offer} just for you 🎁`,
        preview_text: `Use code COMEBACK at checkout for ${discount_offer}.`,
        body: `We really want you to have it.

Here's a special offer, just for you:

Use code COMEBACK at checkout for ${discount_offer} off your entire order.

[DYNAMIC: Product image + name + original price → discounted price]

[CTA BUTTON: Claim My ${discount_offer} — Complete Order]

This offer expires in 48 hours.

— The ${brand_name} Team

P.S. This is our best offer. After this, your cart will be cleared.`,
      },
    ],
    implementation_platforms: ["Klaviyo (recommended)", "Shopify Email", "Omnisend", "Drip"],
    expected_recovery_rate: "5-15% of abandoned carts — industry average is 8%",
    estimated_monthly_value: `At $${average_order_value} AOV and 8% recovery rate, recovering 10 carts/month = $${(average_order_value * 10 * 0.08).toFixed(0)}/mo in additional revenue`,
  };
}

async function execEcomEmailMarketingCampaign(_workspaceId: string, input: any) {
  const { brand_name, campaign_type, product_or_promotion = "our latest collection", audience_segment = "all subscribers", discount_or_offer } = input;
  const campaigns: Record<string, any> = {
    "Welcome Series": {
      emails: [
        { number: 1, timing: "Immediately", subject: `Welcome to ${brand_name} — here's what you need to know 🎉`, body: `Hey [First Name], welcome to the ${brand_name} family!\n\nWe're so glad you're here. We build ${product_or_promotion} for people who [value proposition].\n\nHere's what you can expect from us:\n✅ Exclusive deals for subscribers\n✅ New product drops before anyone else\n✅ Tips and inspiration for [product use case]\n\n${discount_or_offer ? `Here's a little welcome gift: use code WELCOME for ${discount_or_offer} off your first order.` : ""}\n\n[CTA: Shop Now]\n\n— The ${brand_name} Team` },
        { number: 2, timing: "Day 3", subject: `Our best sellers — in case you missed them`, body: `[First Name], since you joined us, here are the products our customers can't stop talking about:\n\n[DYNAMIC: Top 3 best-seller product cards]\n\n[CTA: See All Best Sellers]` },
        { number: 3, timing: "Day 7", subject: `Our story — why we built ${brand_name}`, body: `[Tell your brand story in 150-200 words. What problem did you solve? Why does it matter? Who are you building this for?]\n\nWe'd love to hear your story too. Reply to this email and tell us what brought you here.\n\n— [Founder Name], Founder of ${brand_name}` },
      ],
    },
    "Product Launch": {
      emails: [
        { number: 1, timing: "Launch Day", subject: `🚀 It's here — introducing ${product_or_promotion}`, body: `Today's the day.\n\n${product_or_promotion} is officially live — and ${audience_segment}, you get first access.\n\n[Hero image of product]\n\n[3 key benefits as bullet points]\n\n${discount_or_offer ? `Launch special: ${discount_or_offer} for the next 48 hours.` : ""}\n\n[CTA: Shop Now — Limited Stock]` },
        { number: 2, timing: "Day 2", subject: `[First Name], have you seen this yet?`, body: `In case you missed yesterday's launch — ${product_or_promotion} is selling fast.\n\n[Social proof: X units sold, X 5-star reviews]\n\n${discount_or_offer ? `The ${discount_or_offer} launch offer ends at midnight tonight.` : "Don't miss out."}\n\n[CTA: Get Yours Now]` },
        { number: 3, timing: "Last Day of Launch Offer", subject: `⏰ Last chance — ${discount_or_offer || "this offer"} ends tonight`, body: `Tonight at midnight, the launch pricing goes away.\n\nIf you've been thinking about ${product_or_promotion} — now is the time.\n\n[CTA: Claim Your Order Before It's Gone]` },
      ],
    },
    "Promotional Blast": {
      emails: [
        { number: 1, timing: "Promo start", subject: `🛍️ ${discount_or_offer || "Big savings"} — this weekend only at ${brand_name}`, body: `This is not a drill.\n\n${discount_or_offer ? `Save ${discount_or_offer} on ${product_or_promotion}` : `Huge savings on ${product_or_promotion}`} — this weekend only.\n\n[Product grid: 4-6 featured products with sale prices]\n\nUse code [PROMO_CODE] at checkout.\nExpires Sunday at midnight.\n\n[CTA: Shop the Sale]` },
      ],
    },
  };
  const campaign = campaigns[campaign_type] || campaigns["Promotional Blast"];
  return {
    tool: "ecom_email_marketing_campaign",
    brand_name,
    campaign_type,
    ...campaign,
    recommended_platforms: ["Klaviyo (best for Shopify)", "Brevo (budget-friendly)", "Omnisend", "Mailchimp"],
    tips: [
      "Personalize with [First Name] — it increases open rates by 26%",
      "Send at 10am or 8pm in your subscriber's timezone",
      "A/B test subject lines — send version A to 20%, version B to 20%, winner to 60%",
      "Keep emails mobile-first — 60%+ of e-commerce emails are opened on phones",
    ],
  };
}

async function execEcomSmsCampaign(_workspaceId: string, input: any) {
  const { brand_name, campaign_goal, offer = "exclusive deal", message_count = 3 } = input;
  const templates: Record<string, string[]> = {
    "Flash Sale": [
      `${brand_name}: ⚡ FLASH SALE — ${offer}! Ends in 24 hrs. Shop: [link] Reply STOP to opt out.`,
      `${brand_name}: ⏰ 6 hours left! Your ${offer} flash sale ends TONIGHT. Don't miss it → [link]`,
      `${brand_name}: Last call! Flash sale ends at midnight. Get ${offer} now → [link]`,
    ],
    "New Product Drop": [
      `${brand_name}: 🆕 It's finally here! [Product name] just dropped. Be first → [link] Reply STOP to opt out.`,
      `${brand_name}: You asked, we delivered. [Product name] is live — and it's 🔥. Shop now → [link]`,
      `${brand_name}: Reminder — [Product name] is selling out fast. Grab yours before it's gone → [link]`,
    ],
    "Abandoned Cart": [
      `${brand_name}: Hey [Name]! You left something behind. Your cart is waiting → [link] Reply STOP to opt out.`,
      `${brand_name}: Still interested? Your cart expires soon. ${offer ? `Use ${offer} to save.` : "Complete your order"} → [link]`,
      `${brand_name}: Last chance — your cart is about to expire. ${offer || "Complete your order"} → [link]`,
    ],
    "Loyalty Reward": [
      `${brand_name}: 🎁 You've earned a reward! ${offer} — just for you. Claim it → [link] Reply STOP to opt out.`,
      `${brand_name}: VIP access unlocked! As a loyal customer, you get early access + ${offer} → [link]`,
    ],
    "Event Announcement": [
      `${brand_name}: 📅 Mark your calendar — [Event name] is [date]. Be the first to know → [link] Reply STOP to opt out.`,
      `${brand_name}: ⏰ [Event name] is TOMORROW! ${offer}. Don't miss it → [link]`,
      `${brand_name}: It's happening TODAY! [Event name] — join us → [link]`,
    ],
  };
  const messages = (templates[campaign_goal] || templates["Flash Sale"]).slice(0, message_count);
  return {
    tool: "ecom_sms_campaign",
    brand_name,
    campaign_goal,
    messages,
    compliance_checklist: [
      "Collect explicit SMS opt-in at checkout or via keyword signup ('Text DEALS to 12345')",
      "Always identify your brand name at the start of every message",
      "Always include opt-out instructions: 'Reply STOP to unsubscribe'",
      "Never send between 9pm–8am in the recipient's local timezone (TCPA requirement)",
      "Keep messages under 160 characters to avoid MMS rates",
      "Honor opt-outs immediately — remove from list within minutes",
    ],
    recommended_platforms: [
      { name: "Postscript", note: "Best for Shopify SMS marketing", url: "https://postscript.io" },
      { name: "Klaviyo SMS", note: "Best if already using Klaviyo for email", url: "https://klaviyo.com" },
      { name: "Attentive", note: "Enterprise-grade SMS platform", url: "https://attentive.com" },
      { name: "SMSBump (Yotpo)", note: "Good budget option for Shopify", url: "https://smsbump.com" },
    ],
  };
}

async function execEcomPromoCampaignGenerate(_workspaceId: string, input: any) {
  const { brand_name, campaign_event, products_featured = [], campaign_duration_days = 7, budget = "Under $500", channels = ["Email", "SMS", "Instagram", "TikTok"] } = input;
  return {
    tool: "ecom_promo_campaign_generate",
    brand_name,
    campaign_event,
    campaign_duration_days,
    budget,
    channels,
    campaign_theme: `${campaign_event} — ${brand_name}`,
    headline: `The ${campaign_event} Sale Is Here — Up to [X]% Off`,
    offer_structure: {
      primary_offer: `[X]% off sitewide OR ${products_featured.length > 0 ? products_featured[0] : "featured products"}`,
      secondary_offer: "Free shipping on orders over $[X]",
      urgency_element: `Sale ends ${campaign_duration_days === 1 ? "tonight at midnight" : `in ${campaign_duration_days} days`}`,
      promo_code: `${campaign_event.toUpperCase().replace(/ /g, "").slice(0, 10)}SALE`,
    },
    content_calendar: Array.from({ length: campaign_duration_days }, (_, i) => ({
      day: i + 1,
      label: i === 0 ? "Launch Day" : i === campaign_duration_days - 1 ? "Last Day (Urgency Push)" : `Day ${i + 1}`,
      actions: i === 0
        ? ["Send launch email to full list", "Post launch reel on TikTok & Instagram", "Send SMS blast", "Go live on TikTok (if TikTok Shop)"]
        : i === campaign_duration_days - 1
        ? ["Send final reminder email", "Send final SMS", "Post countdown Story", "Extend deal for VIPs if needed"]
        : [`Post ${channels.includes("Instagram") ? "Instagram" : "social"} content — product feature or customer review`, "Engage comments and DMs"],
    })),
    channel_strategy: channels.map(channel => ({
      channel,
      role: channel === "Email" ? "Primary conversion driver — 3-4 emails over campaign duration" :
            channel === "SMS" ? "Urgency triggers — launch and last-day only" :
            channel === "Instagram" ? "Brand awareness + product showcases — daily Stories, 2-3 feed posts" :
            channel === "TikTok" ? "Organic reach + TikTok ads — product demos and unboxings" :
            channel === "Google Ads" ? "Capture high-intent buyers searching for your products" :
            "Support channel — drive awareness and traffic",
    })),
    creative_brief: {
      visual_direction: `Bold, eye-catching sale graphics with ${campaign_event} theme. Use countdown timers in emails and Stories. Feature product images over white or brand-color backgrounds.`,
      copy_tone: "Urgent but friendly. Clear value proposition above the fold. Every piece of content has one CTA.",
      hashtags: `#${brand_name.replace(/ /g, "")} #${campaign_event.replace(/ /g, "")}Sale #ShopNow #[ProductCategory]`,
    },
    kpis: ["Revenue vs. goal", "Email open rate (target: 20%+)", "Email CTR (target: 3%+)", "SMS CTR (target: 8%+)", "ROAS on paid ads (target: 3x+)", "Conversion rate on site (target: 2-4%)"],
  };
}

async function execEcomInfluencerOutreach(_workspaceId: string, input: any) {
  const { brand_name, product_category, influencer_tier = "Micro (10K-100K)", compensation_model = "Free Product", target_platforms = ["Instagram", "TikTok"] } = input;
  return {
    tool: "ecom_influencer_outreach",
    brand_name,
    product_category,
    influencer_tier,
    outreach_email_template: {
      subject: `Collab opportunity — ${brand_name} x [Creator Name]`,
      body: `Hi [Creator Name],

I've been following your content for a while and love what you're doing in the ${product_category} space. Your style is exactly what our brand is about.

I'm reaching out on behalf of ${brand_name} — we make [brief product description] and I think your audience would genuinely love what we do.

Here's what I'm thinking:

📦 We'd love to send you our [Product Name] — completely free.
📸 If you vibe with it, we'd love a [post type: honest review / unboxing / demo] on [platform].
💰 ${compensation_model === "Commission/Affiliate" ? `We also offer a [X]% commission on any sales through your unique link.` : compensation_model === "Paid Flat Rate" ? "We also offer paid partnership rates for sponsored posts." : "No strings attached — if you love it, share it. If not, keep it."}

Would love to connect. What does your inbox look like for partnerships?

[Your Name]
${brand_name}
[Email] | [Website]`,
    },
    platforms_to_find_creators: [
      { name: "TikTok Creator Marketplace", url: "https://creatormarketplace.tiktok.com", note: "Official TikTok platform — filter by category, follower count, engagement rate" },
      { name: "Instagram Creator Studio", url: "https://creators.instagram.com", note: "Find creators through branded content tools" },
      { name: "Collabstr", url: "https://collabstr.com", note: "Creator marketplace — search by niche and platform" },
      { name: "Grin", url: "https://grin.co", note: "Full influencer CRM for managing partnerships at scale" },
      { name: "Modash", url: "https://modash.io", note: "Best influencer search tool — filter by niche, engagement, audience demographics" },
      { name: "Instagram/TikTok Hashtag Search", url: "", note: `Search #${product_category.replace(/ /g, "")} and #${product_category.replace(/ /g, "")}TikTok to find organic creators already talking about your niche` },
    ],
    vetting_checklist: [
      "Engagement rate above 3% (micro) or 1.5% (macro) — calculate: (likes + comments) / followers",
      "Audience demographics match your target customer (age, location, interests)",
      "Content quality is consistent and on-brand",
      "No recent brand conflicts (they haven't just promoted a direct competitor)",
      "Comments are genuine — not generic spam like 'great post!' from bot accounts",
      "Follower growth is organic — check Social Blade for suspicious growth spikes",
    ],
    compensation_guide: {
      "Free Product": "Best for nano/micro influencers. Offer $30-100 product value minimum to make it worth their time.",
      "Commission/Affiliate": "8-15% commission for micro, 5-10% for macro. Use ShareASale, LTK, or Impact for tracking.",
      "Paid Flat Rate": `Micro (10K-100K followers): $100-500/post. Macro (100K-1M): $500-5K/post. Always negotiate — rates are flexible.`,
      Hybrid: "Free product + 10% commission is the sweet spot for building long-term creator relationships.",
    },
  };
}

async function execEcomGoogleShoppingAds(_workspaceId: string, input: any) {
  const { brand_name, product_category, monthly_budget = 500, target_roas = 4, top_products = [] } = input;
  return {
    tool: "ecom_google_shopping_ads",
    brand_name,
    product_category,
    monthly_budget,
    target_roas,
    campaign_structure: {
      campaign_type: "Performance Max (PMax) — Google's recommended campaign type for e-commerce in 2024",
      daily_budget: `$${(monthly_budget / 30).toFixed(0)}/day`,
      bidding_strategy: `Target ROAS at ${target_roas}x (${target_roas * 100}%) — meaning for every $1 spent, you want $${target_roas} in revenue`,
      budget_allocation: {
        "Performance Max": "70% of budget — captures shopping, search, display, and YouTube in one campaign",
        "Standard Shopping (brand terms)": "20% of budget — capture branded searches at lower CPC",
        "Search (remarketing)": "10% of budget — retarget past visitors and cart abandoners",
      },
    },
    product_feed_requirements: [
      "Google Merchant Center account (merchant.google.com) — free to set up",
      "Product feed with: id, title, description, link, image_link, price, availability, brand, gtin (if applicable)",
      "Shopify: install the Google & YouTube app — it auto-syncs your product catalog",
      "WooCommerce: use WooCommerce Google Listings & Ads plugin",
      "Product images must be minimum 100x100px (800x800 recommended), white or light background preferred",
      "No promotional text on product images — Google will disapprove listings",
    ],
    rsa_ad_copy: {
      headlines: [
        `Shop ${product_category} at ${brand_name}`,
        "Free Shipping on Orders $[X]+",
        `[X]% Off Your First Order`,
        `Top-Rated ${product_category}`,
        "Shop Now — Limited Stock",
        "Official ${brand_name} Store",
        `Best ${product_category} for [Use Case]`,
        `[X]-Star Reviews`,
      ],
      descriptions: [
        `Discover our premium ${product_category} collection. Fast shipping, easy returns, and satisfaction guaranteed.`,
        `${brand_name} — trusted by [X]+ customers. Shop our ${product_category} and see why we're rated [X] stars.`,
      ],
    },
    optimization_checklist: [
      "Add negative keywords weekly to filter irrelevant traffic",
      "Exclude low-performing products from PMax to focus budget on winners",
      "Add customer list as 'Customer Match' audience for better bidding",
      "Set up conversion tracking for: purchases, add-to-cart, begin checkout",
      "Review search term reports weekly and add converting terms as keywords",
      "Test promotional pricing for your top 5 products — price matters in Shopping",
    ],
    resources: [
      { name: "Google Merchant Center", url: "https://merchants.google.com" },
      { name: "Google Ads for E-Commerce", url: "https://ads.google.com" },
    ],
  };
}

async function execEcomMetaAdsCampaign(_workspaceId: string, input: any) {
  const { brand_name, product_category, monthly_budget = 500, campaign_objective = "Sales", target_demographic = "adults 25-44" } = input;
  return {
    tool: "ecom_meta_ads_campaign",
    brand_name,
    product_category,
    monthly_budget,
    campaign_objective,
    funnel_structure: {
      "Top of Funnel (Awareness)": {
        budget_percent: 30,
        daily_budget: `$${((monthly_budget * 0.30) / 30).toFixed(0)}/day`,
        objective: "Awareness or Traffic",
        audience: `Broad interest targeting: [${product_category} interests], demographics: ${target_demographic}`,
        ad_format: "Video — 15-30 second scroll-stopping content. Show the problem, then the solution.",
        creative_hook: `"If you've ever struggled with [problem], this is for you."`,
      },
      "Middle of Funnel (Consideration)": {
        budget_percent: 30,
        daily_budget: `$${((monthly_budget * 0.30) / 30).toFixed(0)}/day`,
        objective: "Traffic or Engagement",
        audience: "Retarget: video viewers (75%+), Instagram profile visitors, website visitors (30 days)",
        ad_format: "Carousel — feature 3-5 products with individual descriptions and CTAs",
        creative_hook: "Social proof: customer photos, reviews, before/after results",
      },
      "Bottom of Funnel (Conversion)": {
        budget_percent: 40,
        daily_budget: `$${((monthly_budget * 0.40) / 30).toFixed(0)}/day`,
        objective: "Sales (Conversions or Catalog Sales)",
        audience: "Retarget: website visitors (7 days), add-to-cart (7 days), checkout initiated (3 days)",
        ad_format: "Dynamic Product Ads — automatically show the exact product the customer viewed on your site",
        creative_hook: "Urgency: 'Still thinking about it? Here's 10% off — today only.'",
      },
    },
    setup_checklist: [
      "Create Meta Business Suite account at business.facebook.com",
      "Install Meta Pixel on your website (Shopify: use Meta's official app)",
      "Set up Conversions API for server-side tracking (more reliable than pixel alone)",
      "Create product catalog in Commerce Manager and link to your store",
      "Verify your domain in Meta Business Suite",
      "Set up standard events: ViewContent, AddToCart, InitiateCheckout, Purchase",
      "Create custom audiences: website visitors, email list, video viewers",
      "Create Lookalike Audiences based on your purchaser list (1% LAL to start)",
    ],
    creative_specs: {
      feed_image: "1080x1080px (square) or 1080x1350px (portrait) — portrait wins more feed real estate",
      feed_video: "1080x1080px or 1080x1920px, 15-30 seconds, captions required (85% watch without sound)",
      stories_reels: "1080x1920px (9:16), hook in first 3 seconds, text in middle 60% of frame",
      carousel: "1080x1080px per card, 3-5 cards, each with its own headline and CTA",
    },
    budget_guidance: `At $${monthly_budget}/mo: expect 3-6 week learning period before seeing consistent ROAS. Don't turn off ad sets during learning phase. Target 2.5x+ ROAS in month 1, 4x+ by month 3.`,
  };
}

async function execEcomSeoContentGenerate(_workspaceId: string, input: any) {
  const { brand_name, content_type, topic_or_keyword, word_count = 800, competitor_keywords = [] } = input;
  return {
    tool: "ecom_seo_content_generate",
    brand_name,
    content_type,
    primary_keyword: topic_or_keyword,
    target_word_count: word_count,
    meta_title: `${topic_or_keyword} | ${brand_name} — [Current Year]`,
    meta_description: `Discover ${topic_or_keyword} at ${brand_name}. [One sentence describing what makes your content/product unique]. Shop now or read our expert guide.`,
    content_outline: {
      h1: `${topic_or_keyword}: [Compelling benefit statement]`,
      introduction: `150-word intro that: (1) acknowledges the reader's problem/goal, (2) previews the solution, (3) establishes ${brand_name}'s authority. Include primary keyword in first 100 words.`,
      sections: content_type === "Blog Post"
        ? [
            { h2: `What Is [Topic]?`, content: "Define the topic clearly. 150-200 words." },
            { h2: `Why [Topic] Matters for [Target Customer]`, content: "Explain the value and relevance. Include secondary keywords." },
            { h2: `How to [Main Action Related to Topic]`, content: "The main value-add section. Step-by-step if applicable. 300-400 words." },
            { h2: `Best [Product/Solution] for [Topic]`, content: "Natural product integration. Link to 2-3 product pages." },
            { h2: `Frequently Asked Questions`, content: "Answer 3-5 questions people Google about this topic. Each answer 50-100 words." },
          ]
        : content_type === "Category Page"
        ? [
            { h2: `Our [Category] Collection`, content: "Overview of what's included. 100-150 words with primary keyword." },
            { h2: `How to Choose the Right [Product]`, content: "Buying guide — helps SEO and increases conversions. 200-300 words." },
            { h2: `Why Shop [Category] at ${brand_name}`, content: "Unique value props — quality, shipping, returns. 150 words." },
          ]
        : [
            { h2: `About Our ${topic_or_keyword} Collection`, content: "Collection description with primary and secondary keywords." },
            { h2: `How to Use / Style [Product]`, content: "Practical guidance that serves both SEO and conversion." },
          ],
      conclusion: "100-150 words. Summarize key takeaways, include primary keyword, and add a clear CTA (shop now, subscribe, read more).",
    },
    internal_linking_strategy: [
      "Link to 2-3 related product pages using keyword-rich anchor text",
      "Link to 1-2 related blog posts or guides",
      "Link to your About page or brand story at least once",
      "Avoid exact-match anchor text — use natural variations",
    ],
    keyword_targets: {
      primary: topic_or_keyword,
      secondary: competitor_keywords.length > 0 ? competitor_keywords : [`best ${topic_or_keyword}`, `${topic_or_keyword} for beginners`, `buy ${topic_or_keyword} online`, `${topic_or_keyword} reviews`],
      long_tail: [`how to choose ${topic_or_keyword}`, `${topic_or_keyword} tips`, `${topic_or_keyword} guide ${new Date().getFullYear()}`],
    },
    seo_checklist: [
      "Primary keyword in H1, first paragraph, one H2, and conclusion",
      "Image alt text includes keyword and describes the image",
      "URL slug is short and keyword-rich: /[keyword]-[modifier]",
      "Page loads in under 3 seconds (test at PageSpeed Insights)",
      "Schema markup: Article schema for blog posts, Product schema for product pages",
      "Internal links from 2-3 existing pages pointing TO this new page",
    ],
    recommended_tools: [
      { name: "Ahrefs (paid)", url: "https://ahrefs.com", note: "Best keyword research and competitive analysis" },
      { name: "Ubersuggest (freemium)", url: "https://neilpatel.com/ubersuggest", note: "Good free tier for keyword ideas" },
      { name: "Google Search Console (free)", url: "https://search.google.com/search-console", note: "Track your rankings and impressions" },
      { name: "Surfer SEO (paid)", url: "https://surferseo.com", note: "AI-assisted content optimization — tells you exactly what to include" },
    ],
  };
}