// app/api/realestate/scout/search/route.ts
// Scout Agent — MLS + Zillow FSBO + ATTOM
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/audit";

// ── .env.local vars ────────────────────────────────────────────────────────
// RAPIDAPI_KEY          — your key from rapidapi.com (one key for all APIs below)
// ZILLOW_RAPIDAPI_HOST  — zillow-com1.p.rapidapi.com  ← MLS + FSBO (primary)
// ATTOM_API_KEY         — api.developer.attomdata.com (optional distressed deals)
// ──────────────────────────────────────────────────────────────────────────

const MAX_STR = 200;
function sanitize(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, MAX_STR);
}

export interface ScoutDeal {
  source: "mls" | "fsbo_zillow" | "fsbo_craigslist" | "attom";
  external_id?: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  property_type?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  year_built?: number;
  list_price?: number;
  days_on_market?: number;
  is_fsbo: boolean;
  listing_url?: string;
  photos?: string[];
  status: "new";
  priority: "medium";
}

// ── Map Zillow propertyExtendedSearch results → ScoutDeal ─────────────────
function mapZillowResults(props: Record<string, unknown>[], isFsbo: boolean): ScoutDeal[] {
  return props.slice(0, 20).map((p): ScoutDeal => ({
    source: isFsbo ? "fsbo_zillow" : "mls",
    external_id: String(p.zpid ?? ""),
    address: String(p.address ?? ""),
    city:  String(p.city    ?? ""),
    state: String(p.state   ?? ""),
    zip:   String(p.zipcode ?? ""),
    property_type: String(p.propertyType ?? ""),
    beds:  Number(p.bedrooms   ?? 0) || undefined,
    baths: Number(p.bathrooms  ?? 0) || undefined,
    sqft:  Number(p.livingArea ?? 0) || undefined,
    year_built: Number(p.yearBuilt ?? 0) || undefined,
    list_price: Number(p.price ?? 0) || undefined,
    days_on_market: Number(p.daysOnZillow ?? 0) || undefined,
    is_fsbo: isFsbo,
    listing_url: p.detailUrl ? `https://www.zillow.com${p.detailUrl}` : undefined,
    photos: p.imgSrc ? [String(p.imgSrc)] : [],
    status: "new",
    priority: "medium",
  }));
}

// ── Primary MLS search via Zillow (agent-listed properties) ───────────────
async function searchMLS(city: string, state: string, zip: string, maxPrice: number): Promise<ScoutDeal[]> {
  const host = process.env.ZILLOW_RAPIDAPI_HOST ?? "zillow-com1.p.rapidapi.com";
  const key  = process.env.RAPIDAPI_KEY;
  if (!key) return [];

  // Use zip code if available, otherwise "City, State"
  const location = zip || `${city}, ${state}`;

  try {
    const params = new URLSearchParams({
      location,
      status_type: "ForSale",
      home_type: "Houses,Townhomes,Condos,MultiFamily",
      saleByAgent: "1",   // agent-listed = MLS
      maxPrice: String(maxPrice),
      page: "1",
    });
    const res = await fetch(`https://${host}/propertyExtendedSearch?${params}`, {
      headers: {
        "x-rapidapi-key":  key,
        "x-rapidapi-host": host,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const props: Record<string, unknown>[] = json?.props ?? [];
    return mapZillowResults(props, false);
  } catch { return []; }
}

// ── Zillow FSBO (owner-listed properties) ─────────────────────────────────
async function searchZillowFSBO(city: string, state: string, zip: string, maxPrice: number): Promise<ScoutDeal[]> {
  const host = process.env.ZILLOW_RAPIDAPI_HOST ?? "zillow-com1.p.rapidapi.com";
  const key  = process.env.RAPIDAPI_KEY;
  if (!key) return [];

  const location = zip || `${city}, ${state}`;

  try {
    const params = new URLSearchParams({
      location,
      status_type: "ForSale",
      home_type: "Houses,Townhomes,Condos,MultiFamily",
      saleByOwner: "1",  // FSBO only
      maxPrice: String(maxPrice),
      page: "1",
    });
    const res = await fetch(`https://${host}/propertyExtendedSearch?${params}`, {
      headers: {
        "x-rapidapi-key":  key,
        "x-rapidapi-host": host,
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const props: Record<string, unknown>[] = json?.props ?? [];
    return mapZillowResults(props, true);
  } catch { return []; }
}

// ── ATTOM Data (distressed / off-market) ──────────────────────────────────
async function searchATTOM(zip: string, maxPrice: number): Promise<ScoutDeal[]> {
  const key = process.env.ATTOM_API_KEY;
  if (!key || key === "your_attom_key_here") return [];

  try {
    const params = new URLSearchParams({
      postalcode: zip, propertytype: "SFR,CONDO,MULTIFAMILY",
      minprice: "0", maxprice: String(maxPrice), pagesize: "15", page: "1",
    });
    const res = await fetch(`https://api.gateway.attomdata.com/propertyapi/v1.0.0/sale/snapshot?${params}`, {
      headers: { apikey: key, accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.property ?? []).slice(0, 15).map((p: Record<string, unknown>): ScoutDeal => {
      const addr  = (p.address  as Record<string, unknown>) ?? {};
      const bldg  = (p.building as Record<string, unknown>) ?? {};
      const size  = (bldg.size  as Record<string, unknown>) ?? {};
      const rooms = (bldg.rooms as Record<string, unknown>) ?? {};
      const sale  = (p.sale     as Record<string, unknown>) ?? {};
      const amt   = (sale.amount as Record<string, unknown>) ?? {};
      return {
        source: "attom",
        external_id: String((p.identifier as Record<string, unknown>)?.attomId ?? ""),
        address: `${addr.line1 ?? ""} ${addr.line2 ?? ""}`.trim(),
        city:  String(addr.locality    ?? ""),
        state: String(addr.countrySubd ?? ""),
        zip:   String(addr.postal1     ?? zip),
        property_type: String((p.summary as Record<string, unknown>)?.proptype ?? ""),
        beds:  Number(rooms.beds       ?? 0) || undefined,
        baths: Number(rooms.bathstotal ?? 0) || undefined,
        sqft:  Number(size.universalsize ?? size.livingsize ?? 0) || undefined,
        year_built: Number((p.vintage as Record<string, unknown>)?.yearbuilt ?? 0) || undefined,
        list_price: Number(amt.saleamt ?? 0) || undefined,
        is_fsbo: false,
        photos: [],
        status: "new",
        priority: "medium",
      };
    });
  } catch { return []; }
}

// ── Main route ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    await logAuditEvent({ req, actorId: "anonymous", action: "realestate.scout.search.unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(`realestate-scout-search:${userId}`, 10, 60_000);
  if (!rl.allowed) {
    await logAuditEvent({ req, actorId: userId, action: "realestate.scout.search.rate_limited" });
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body     = await req.json().catch(() => ({}));
  const city     = sanitize(body.city)  || "Oklahoma City";
  const state    = sanitize(body.state) || "OK";
  const zip      = sanitize(body.zip)   || "";
  const maxPrice = Math.min(Math.max(Number(body.max_price) || 500_000, 0), 10_000_000);
  const sources  = Array.isArray(body.sources) ? body.sources : ["mls", "fsbo_zillow", "attom"];

  await logAuditEvent({ req, actorId: userId, action: "realestate.scout.search.start", metadata: { city, state, zip, maxPrice, sources } });

  const [mlsDeals, zillowDeals, attomDeals] = await Promise.all([
    sources.includes("mls")         ? searchMLS(city, state, zip, maxPrice)         : Promise.resolve([]),
    sources.includes("fsbo_zillow") ? searchZillowFSBO(city, state, zip, maxPrice)  : Promise.resolve([]),
    sources.includes("attom") && zip ? searchATTOM(zip, maxPrice)                   : Promise.resolve([]),
  ]);

  const deals: ScoutDeal[] = [...mlsDeals, ...zillowDeals, ...attomDeals];

  // FSBO first (better margins), then price ascending
  deals.sort((a, b) => {
    if (a.is_fsbo !== b.is_fsbo) return a.is_fsbo ? -1 : 1;
    return (a.list_price ?? 0) - (b.list_price ?? 0);
  });

  await logAuditEvent({ req, actorId: userId, action: "realestate.scout.search.complete", metadata: { found: deals.length } });
  return NextResponse.json({ deals, meta: { city, state, zip, max_price: maxPrice, total: deals.length } });
}
