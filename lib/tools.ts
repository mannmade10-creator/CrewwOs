// lib/tools.ts
// Claude tool_use definitions. Each name maps 1:1 to an /api/tools/* route
// and to the `tools` array on an AgentDef in lib/agents.ts.

export const TOOL_DEFINITIONS: Record<string, any> = {
  db_query: {
    name: "db_query",
    description: "Run a read-only SQL query against the workspace's connected Supabase database. Returns rows as JSON.",
    input_schema: {
      type: "object",
      properties: {
        table: { type: "string", description: "Table name to query" },
        filters: { type: "object", description: "Optional key/value equality filters" },
        limit: { type: "number", description: "Max rows to return, default 50" },
      },
      required: ["table"],
    },
  },
  db_write: {
    name: "db_write",
    description: "Insert or update a record in the workspace's connected Supabase database.",
    input_schema: {
      type: "object",
      properties: {
        table: { type: "string" },
        operation: { type: "string", enum: ["insert", "update"] },
        data: { type: "object", description: "Column/value pairs to write" },
        match: { type: "object", description: "Required for update — row match filter" },
      },
      required: ["table", "operation", "data"],
    },
  },
  deploy: {
    name: "deploy",
    description: "Trigger a production deployment of the client's project via the Vercel API.",
    input_schema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Vercel project name or ID" },
        reason: { type: "string", description: "Short reason for the deploy, logged to the activity feed" },
      },
      required: ["project"],
    },
  },
  email_send: {
    name: "email_send",
    description: "Send a transactional or marketing email via Resend.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string" },
        subject: { type: "string" },
        body: { type: "string", description: "Plain text or simple HTML body" },
      },
      required: ["to", "subject", "body"],
    },
  },
  sms_send: {
    name: "sms_send",
    description: "Send an SMS message via Twilio.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string", description: "E.164 phone number" },
        body: { type: "string" },
      },
      required: ["to", "body"],
    },
  },
  users_list: {
    name: "users_list",
    description: "List users from the client's auth/user system.",
    input_schema: {
      type: "object",
      properties: { limit: { type: "number" } },
    },
  },
  users_manage: {
    name: "users_manage",
    description: "Create, suspend, or update a user account.",
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["create", "suspend", "update"] },
        user_id: { type: "string" },
        data: { type: "object" },
      },
      required: ["action"],
    },
  },
  reports_generate: {
    name: "reports_generate",
    description: "Generate an analytics report from the workspace's database tables (e.g. MRR, growth, task completion).",
    input_schema: {
      type: "object",
      properties: {
        metric: { type: "string", description: "e.g. mrr, arr, burn_rate, task_completion, user_growth" },
        period: { type: "string", description: "e.g. last_30_days, last_quarter" },
      },
      required: ["metric"],
    },
  },
  leads_search: {
    name: "leads_search",
    description: "Search for B2B leads via Apollo.io by title, industry, and company size.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        industry: { type: "string" },
        company_size: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  outreach_sequence: {
    name: "outreach_sequence",
    description: "Create and launch a multi-step email outreach sequence via Reply.io.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        steps: { type: "array", items: { type: "string" }, description: "Email bodies, one per step" },
        recipients: { type: "array", items: { type: "string" } },
      },
      required: ["name", "steps", "recipients"],
    },
  },
  github_commit: {
    name: "github_commit",
    description: "Create a GitHub commit with code changes to the client's repo.",
    input_schema: {
      type: "object",
      properties: {
        repo: { type: "string" },
        branch: { type: "string" },
        path: { type: "string" },
        content: { type: "string" },
        message: { type: "string" },
      },
      required: ["repo", "path", "content", "message"],
    },
  },
  security_scan: {
    name: "security_scan",
    description: "Run a security scan of the workspace — checks connected integration credential age, recent denied/rate-limited requests, failing tool calls, and sign-ins from multiple IP addresses. Reads only CrewOS's own audit log and integration records; makes no external calls.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  voice_call: {
    name: "voice_call",
    description: "Place an outbound phone call via the workspace's connected Retell AI voice agent. The call is conducted by that pre-configured voice agent (its personality, voice, and script live in Retell's own dashboard, not here) — this tool starts the call and passes it context to work from. Inbound calls Retell answers automatically aren't placed through this tool; they show up in the call log once Retell reports them.",
    input_schema: {
      type: "object",
      properties: {
        to_number: { type: "string", description: "E.164 format, e.g. +14155551234" },
        reason: { type: "string", description: "Why this call is being made — passed to the voice agent as context (e.g. 'Following up on a demo request from the website form')" },
        context: { type: "object", description: "Optional key/value details for the voice agent to reference during the call, e.g. { customer_name: 'Jane Doe', product: 'Blue Dream Flower' }" },
      },
      required: ["to_number", "reason"],
    },
  },
  team_activity: {
    name: "team_activity",
    description: "Check what other agents on this team have actually done recently — real logged tool executions (who ran what, when, and whether it succeeded), not a guess. Use this before making any claim about another agent's work or status, rather than assuming or inventing what they've done.",
    input_schema: {
      type: "object",
      properties: {
        agent_slug: { type: "string", description: "Optional — filter to one specific teammate's activity by their slug (e.g. 'dev', 'sam'). Omit to see recent activity across the whole team." },
        limit: { type: "number", description: "Max entries to return, default 20" },
      },
    },
  },
  message_teammate: {
    name: "message_teammate",
    description: "Directly message another agent and get their real reply back — use this instead of asking the CEO to relay a request between teammates. The other agent actually receives your message, does real work if needed (including using their own tools), and their genuine answer comes back to you as the result. Only goes one level deep — the teammate you message cannot itself message a third teammate.",
    input_schema: {
      type: "object",
      properties: {
        agent_slug: { type: "string", description: "The teammate's slug from your roster, e.g. 'scout', 'designer'" },
        message: { type: "string", description: "What you need from them — be specific, since they have no other context about why you're asking" },
      },
      required: ["agent_slug", "message"],
    },
  },
  product_trend_lookup: {
    name: "product_trend_lookup",
    description: "Look up Google Trends search interest for a product keyword over a timeframe, via SerpApi.",
    input_schema: {
      type: "object",
      properties: {
        keyword: { type: "string" },
        timeframe: { type: "string", description: "e.g. 'today 3-m', 'today 12-m'" },
      },
      required: ["keyword"],
    },
  },
  product_supplier_lookup: {
    name: "product_supplier_lookup",
    description: "Search CJ Dropshipping's catalog for candidate products matching a keyword, returning cost, image, and supplier info — including a 'pid' (CJ's internal product ID). Save that pid in raw_signals when you save a candidate; you'll need it later to check real stock via check_supplier_stock before publishing.",
    input_schema: {
      type: "object",
      properties: { keyword: { type: "string" }, limit: { type: "number" } },
      required: ["keyword"],
    },
  },
  check_supplier_stock: {
    name: "check_supplier_stock",
    description: "Get REAL warehouse stock quantity from CJ Dropshipping for a specific product, using the 'pid' you got from product_supplier_lookup. Always call this before setting a product's starting inventory_quantity or publishing it live — never guess or use a placeholder number when a real one is available. Takes 2-3 seconds since it's a multi-step lookup on CJ's side.",
    input_schema: {
      type: "object",
      properties: {
        pid: { type: "string", description: "CJ's product ID, from product_supplier_lookup's result" },
      },
      required: ["pid"],
    },
  },
  scout_candidate_save: {
    name: "scout_candidate_save",
    description: "Save a scored product candidate to the research shortlist for review. Always include image_url from the product_supplier_lookup result if you have one — never leave it out.",
    input_schema: {
      type: "object",
      properties: {
        product_name: { type: "string" },
        source_url: { type: "string" },
        supplier: { type: "string" },
        landed_cost: { type: "number" },
        suggested_retail: { type: "number" },
        trend_score: { type: "number" },
        margin_score: { type: "number" },
        competition_score: { type: "number" },
        repeat_purchase_score: { type: "number" },
        total_score: { type: "number" },
        raw_signals: { type: "object", description: "Include image_url here if the product has one, so it's preserved even before publishing." },
      },
      required: ["product_name"],
    },
  },
  scout_candidates_list: {
    name: "scout_candidates_list",
    description: "List previously saved product candidates, ranked by score, optionally filtered by status — check this before re-recommending something already reviewed.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["new", "reviewed", "testing", "rejected", "winner"] },
        limit: { type: "number" },
      },
    },
  },
  shopify_product_create: {
    name: "shopify_product_create",
    description: "Create a new product in the connected Shopify store. Set publish=true ONLY if the product meets the hot-product bar (total_score >= 8.0 AND trend_score >= 7) — otherwise leave publish=false so it saves as a draft for human review. Use this to push a scout_candidates row into the actual store.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description_html: { type: "string", description: "Product description, can include basic HTML" },
        price: { type: "number", description: "Retail price" },
        compare_at_price: { type: "number", description: "Optional strikethrough 'was' price for an anchor effect" },
        sku: { type: "string" },
        image_url: { type: "string", description: "Optional product image URL to attach" },
        inventory_quantity: { type: "number", description: "Starting stock count. Defaults to 25 if omitted — a safe default so newly-published products are actually purchasable rather than silently born at zero stock." },
        publish: { type: "boolean", description: "true = publish live immediately (only for confirmed hot products), false = save as draft for review. Default false." },
      },
      required: ["title", "price"],
    },
  },
  shopify_inventory_update: {
    name: "shopify_inventory_update",
    description: "Set the available inventory quantity for a Shopify product's variant, given the product's ID (found in its Shopify admin URL, e.g. /admin/products/{id}, or returned by shopify_product_create as product_id). Looks up the variant automatically — don't guess a variant ID. ALWAYS call shopify_inventory_read first to check the current real count before setting a new one — never set a number you haven't confirmed is actually wrong.",
    input_schema: {
      type: "object",
      properties: {
        product_id: { type: "string", description: "The Shopify product ID (not variant ID)" },
        quantity: { type: "number" },
      },
      required: ["product_id", "quantity"],
    },
  },
  shopify_inventory_read: {
    name: "shopify_inventory_read",
    description: "Get the REAL current on-hand and available inventory quantity for one product, or for every active product if no product_id is given. Always call this before shopify_inventory_update — never guess or assume a stock level.",
    input_schema: {
      type: "object",
      properties: {
        product_id: { type: "string", description: "Optional — check one specific product. Omit to check every active product's inventory." },
      },
    },
  },
  shopify_inventory_policy_set: {
    name: "shopify_inventory_policy_set",
    description: "Set whether a product can still be purchased when its stock count hits zero ('sell when out of stock' in Shopify's UI, called inventoryPolicy in the API). policy='continue' allows purchase at 0 stock (normal for dropshipping, since the supplier — not Shopify — holds the real stock). policy='deny' blocks purchase at 0 stock (Shopify's default). You have standing authority to set this to 'continue' for any active product WITHOUT asking the CEO first — this is a routine dropshipping config choice, not a risky one. Setting it to 'deny' is also fine without asking.",
    input_schema: {
      type: "object",
      properties: {
        product_id: { type: "string" },
        policy: { type: "string", enum: ["continue", "deny"] },
        reason: { type: "string", description: "Why — logged for the CEO to see later" },
      },
      required: ["product_id", "policy", "reason"],
    },
  },
  shopify_orders_list: {
    name: "shopify_orders_list",
    description: "List recent orders from the connected Shopify store, optionally filtered by fulfillment status.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["open", "closed", "cancelled", "any"], description: "Order status filter, default 'open'" },
        fulfillment_status: { type: "string", enum: ["fulfilled", "unfulfilled", "partial", "any"] },
        limit: { type: "number" },
      },
    },
  },
  shopify_order_fulfill: {
    name: "shopify_order_fulfill",
    description: "Mark a Shopify order as fulfilled, optionally attaching tracking info.",
    input_schema: {
      type: "object",
      properties: {
        order_id: { type: "string" },
        tracking_number: { type: "string" },
        tracking_company: { type: "string", description: "e.g. 'USPS', 'UPS', or the dropshipping supplier's carrier" },
        notify_customer: { type: "boolean", description: "Whether to send the customer a shipping notification email, default true" },
      },
      required: ["order_id"],
    },
  },
  shopify_product_performance: {
    name: "shopify_product_performance",
    description: "Get real sales data for products created in the last N days — units sold and revenue, pulled from actual order line items. NOTE: Shopify's API doesn't expose page-view/traffic data outside Shopify Plus, so this measures sales only, not 'hits' or views. Use this to judge whether a live product is actually selling.",
    input_schema: {
      type: "object",
      properties: {
        days_live_at_least: { type: "number", description: "Only include products first published at least this many days ago, default 14" },
      },
    },
  },
  shopify_product_archive: {
    name: "shopify_product_archive",
    description: "Unpublish/archive a product that isn't selling — sets it back to draft status so it's no longer visible in the storefront. Always check shopify_product_performance first and only archive products with genuinely zero sales over the minimum window — never archive based on a guess.",
    input_schema: {
      type: "object",
      properties: {
        product_id: { type: "string" },
        reason: { type: "string", description: "Why this is being archived, logged for the CEO to review later" },
      },
      required: ["product_id", "reason"],
    },
  },
  shopify_financial_summary: {
    name: "shopify_financial_summary",
    description: "Real gross profit summary — actual revenue from paid Shopify orders, cross-referenced against real landed cost data from scout_candidates (matched by product title). Products with no cost match are flagged as unknown COGS rather than guessed. IMPORTANT: this is gross profit only — it does NOT include ad spend, Shopify fees, shipping costs paid to suppliers, or CJ Dropshipping order costs, since none of those are tracked anywhere yet. Always state that limitation when reporting this — never call the result 'net profit' or 'true profit.'",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "How many days back to pull paid orders for, default 30" },
      },
    },
  },
  tiktok_campaign_create: {
    name: "tiktok_campaign_create",
    description: "Create a real TikTok ad campaign. HARD BLOCKED by a code-enforced spend cap: if the workspace's daily_spend_cap is 0 or unset, this will always fail — that's intentional, not a bug, until the CEO explicitly funds and raises the cap on the Integrations page. Never suggest working around this. TikTok also enforces its own real minimum of $50/day per ad group regardless of what CrewOS allows.",
    input_schema: {
      type: "object",
      properties: {
        campaign_name: { type: "string" },
        objective: { type: "string", enum: ["TRAFFIC", "CONVERSIONS", "REACH"], description: "What the campaign optimizes for" },
        daily_budget: { type: "number", description: "Daily budget in dollars — must be under the configured cap" },
        reason: { type: "string", description: "Why this campaign, logged for the CEO to review" },
      },
      required: ["campaign_name", "objective", "daily_budget", "reason"],
    },
  },
  tiktok_campaign_performance: {
    name: "tiktok_campaign_performance",
    description: "Get real spend, impressions, clicks, and conversions for active TikTok campaigns. Safe to call regardless of spend cap status — this only reads data, never spends anything.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Reporting window in days, default 7" },
      },
    },
  },
  meta_campaign_create: {
    name: "meta_campaign_create",
    description: "Create a real Meta (Facebook/Instagram) ad campaign and ad set. HARD BLOCKED by a code-enforced spend cap: if daily_spend_cap is 0 or unset, this always fails — intentional until the CEO funds and raises it. Every campaign is ALWAYS created with status=PAUSED regardless of what's asked — this is a hard safety default, not optional, matching Meta's own recommended practice. A paused campaign never spends; the CEO reviews and activates it manually in Meta Ads Manager.",
    input_schema: {
      type: "object",
      properties: {
        campaign_name: { type: "string" },
        objective: { type: "string", enum: ["OUTCOME_TRAFFIC", "OUTCOME_SALES", "OUTCOME_AWARENESS"], description: "What the campaign optimizes for" },
        daily_budget: { type: "number", description: "Daily budget in dollars — must be under the configured cap" },
        reason: { type: "string", description: "Why this campaign, logged for the CEO to review" },
      },
      required: ["campaign_name", "objective", "daily_budget", "reason"],
    },
  },
  meta_campaign_performance: {
    name: "meta_campaign_performance",
    description: "Get real spend, impressions, clicks, and conversions for Meta campaigns. Safe to call regardless of spend cap status — read-only.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Reporting window in days, default 7" },
      },
    },
  },
  google_ads_campaign_create: {
    name: "google_ads_campaign_create",
    description: "Create a real Google Ads campaign budget + campaign shell. HARD BLOCKED by a code-enforced spend cap: if daily_spend_cap is 0 or unset, this always fails. Always created with status=PAUSED — a hard safety default. NOTE: Google's API is genuinely the most complex of the three platforms (a linked-resource 'mutate' pattern) and the least proven of tonight's three builds against a real account — a campaign shell alone isn't a running ad; ad groups and ads still need to be added as a follow-up once this is tested live.",
    input_schema: {
      type: "object",
      properties: {
        campaign_name: { type: "string" },
        channel_type: { type: "string", enum: ["SEARCH", "DISPLAY", "SHOPPING"], description: "Which Google Ads channel" },
        daily_budget: { type: "number", description: "Daily budget in dollars — must be under the configured cap" },
        reason: { type: "string", description: "Why this campaign, logged for the CEO to review" },
      },
      required: ["campaign_name", "channel_type", "daily_budget", "reason"],
    },
  },
  google_ads_campaign_performance: {
    name: "google_ads_campaign_performance",
    description: "Get real spend, impressions, clicks, and conversions for Google Ads campaigns. Safe to call regardless of spend cap status — read-only.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Reporting window in days, default 7" },
      },
    },
  },
  shopify_order_lookup: {
    name: "shopify_order_lookup",
    description: "Look up a customer's order(s) by their email address or an order number — use this to answer 'where is my order' questions. Returns order status, fulfillment/tracking info, and line items.",
    input_schema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Customer email to search by" },
        order_number: { type: "string", description: "Specific order number, e.g. '1001' — use instead of email if the customer provided it" },
      },
    },
  },
  shopify_order_refund: {
    name: "shopify_order_refund",
    description: "Issue a real refund on a paid order. You have standing authority to do this WITHOUT asking the CEO first, but ONLY for orders placed within the last 7 days — the tool itself enforces this and will reject anything older. For an order older than 7 days, you must first get the CEO's explicit approval in the conversation, then call this with manager_approved=true.",
    input_schema: {
      type: "object",
      properties: {
        order_id: { type: "string" },
        amount: { type: "number", description: "Refund amount in dollars" },
        reason: { type: "string", description: "Why this refund is being issued" },
        manager_approved: { type: "boolean", description: "Set true only if the CEO has explicitly approved a refund on an order older than 7 days" },
      },
      required: ["order_id", "amount", "reason"],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // OUTBOUND MARKETING SYSTEM
  // ─────────────────────────────────────────────────────────────────────────────

  brevo_email_send: {
    name: "brevo_email_send",
    description: "Send a transactional email via Brevo (Sendinblue) to a specific recipient. Use for one-to-one outbound emails — follow-ups, demos, responses. For bulk campaigns to a list, use brevo_campaign_create instead.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address" },
        to_name: { type: "string", description: "Recipient display name" },
        subject: { type: "string" },
        body: { type: "string", description: "Email body — HTML or plain text" },
      },
      required: ["to", "subject", "body"],
    },
  },
  brevo_email_list: {
    name: "brevo_email_list",
    description: "List recent transactional emails sent via Brevo — use to audit what's been sent and spot unread replies.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max emails to return, default 20" },
        unread_only: { type: "boolean", description: "Filter to unread emails only" },
      },
    },
  },
  brevo_email_reply: {
    name: "brevo_email_reply",
    description: "Reply to an existing email thread via Brevo, preserving the In-Reply-To header so it threads correctly in the recipient's inbox.",
    input_schema: {
      type: "object",
      properties: {
        reply_to_message_id: { type: "string", description: "The Message-ID of the email you're replying to" },
        to: { type: "string" },
        to_name: { type: "string" },
        subject: { type: "string", description: "Will be prefixed with 'Re: ' automatically if not already" },
        body: { type: "string", description: "Reply body — HTML or plain text" },
      },
      required: ["reply_to_message_id", "to", "subject", "body"],
    },
  },
  brevo_campaign_create: {
    name: "brevo_campaign_create",
    description: "Create and send (or schedule) a bulk marketing email campaign to a Brevo contact list. Use for newsletters, promotions, and outbound blasts — not for one-to-one transactional emails.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Internal campaign name" },
        subject: { type: "string" },
        body: { type: "string", description: "Campaign body HTML" },
        list_id: { type: "number", description: "Brevo list ID to send to — uses default_list_id from integration settings if omitted" },
        schedule_at: { type: "string", description: "ISO 8601 datetime to schedule — omit to send immediately" },
      },
      required: ["name", "subject", "body"],
    },
  },
  vapi_outbound_call: {
    name: "vapi_outbound_call",
    description: "Place an outbound AI phone call via Vapi using the workspace's configured assistant. The AI agent conducts the call with context you provide — name, company, reason, and any additional talking points.",
    input_schema: {
      type: "object",
      properties: {
        to_number: { type: "string", description: "E.164 format, e.g. +14155551234" },
        reason: { type: "string", description: "Why this call is being made — passed to the AI as context" },
        lead_name: { type: "string" },
        company: { type: "string" },
        context: { type: "string", description: "Additional talking points or context for the AI during the call" },
      },
      required: ["to_number", "reason"],
    },
  },
  crm_lead_create: {
    name: "crm_lead_create",
    description: "Create a new lead record in the CrewOS CRM. Call this after qualifying a prospect — before scheduling a demo or starting an outreach sequence.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        company: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        product_interest: { type: "string", description: "Which product or service they're interested in" },
        status: { type: "string", enum: ["new", "contacted", "qualified", "demo_scheduled", "proposal_sent", "closed_won", "closed_lost"], description: "Default: new" },
        assigned_agent: { type: "string", description: "Agent slug responsible for this lead, e.g. 'sdr', 'vpsales'" },
        next_action: { type: "string", description: "What happens next with this lead" },
        notes: { type: "string" },
        source: { type: "string", description: "Where this lead came from, e.g. 'apollo', 'referral', 'inbound'" },
      },
      required: ["name"],
    },
  },
  crm_lead_update: {
    name: "crm_lead_update",
    description: "Update an existing CRM lead — change status, add notes, log a next action, or record a demo booking. Always call crm_leads_list first to get the lead_id.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "UUID of the lead to update" },
        name: { type: "string" },
        company: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        product_interest: { type: "string" },
        status: { type: "string", enum: ["new", "contacted", "qualified", "demo_scheduled", "proposal_sent", "closed_won", "closed_lost"] },
        assigned_agent: { type: "string" },
        next_action: { type: "string" },
        demo_scheduled_at: { type: "string", description: "ISO 8601 datetime of the booked demo" },
        notes: { type: "string" },
      },
      required: ["lead_id"],
    },
  },
  crm_leads_list: {
    name: "crm_leads_list",
    description: "List CRM leads with optional filters. Use this to find lead IDs before updating, or to get a pipeline overview.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["new", "contacted", "qualified", "demo_scheduled", "proposal_sent", "closed_won", "closed_lost"] },
        assigned_agent: { type: "string", description: "Filter to leads owned by a specific agent slug" },
        product_interest: { type: "string", description: "Partial match on product interest" },
        limit: { type: "number" },
      },
    },
  },
  calendar_book_demo: {
    name: "calendar_book_demo",
    description: "Book a product demo on Google Calendar — creates the event, invites the lead, and generates a Google Meet link. Always update the CRM lead's status to 'demo_scheduled' and set demo_scheduled_at after calling this.",
    input_schema: {
      type: "object",
      properties: {
        lead_name: { type: "string" },
        lead_email: { type: "string" },
        product: { type: "string", description: "Which product the demo is for" },
        start_time: { type: "string", description: "ISO 8601 datetime with timezone, e.g. '2025-08-15T14:00:00-05:00'" },
        host_name: { type: "string", description: "Name of the person hosting the demo" },
        host_email: { type: "string", description: "Host email — added as a calendar attendee" },
        notes: { type: "string", description: "Optional context for the AI or host to reference during the demo" },
        duration_minutes: { type: "number", description: "Demo length in minutes, default 30" },
      },
      required: ["lead_name", "lead_email", "product", "start_time"],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // REX / HIGGSFIELD + TIKTOK
  // ─────────────────────────────────────────────────────────────────────────────

  ad_copy_research: {
    name: "ad_copy_research",
    description: "Generate ad copy research for a product — hooks, CTAs, hashtags, and a creative brief. Use this BEFORE calling any Higgsfield ad tools so Rex has copy to work from. No external API call — runs locally.",
    input_schema: {
      type: "object",
      properties: {
        product_title: { type: "string" },
        product_url: { type: "string" },
        target_audience: { type: "string" },
        key_benefits: { type: "array", items: { type: "string" } },
        tone: { type: "string", description: "e.g. 'energetic', 'professional', 'playful', 'luxury'" },
        platforms: { type: "array", items: { type: "string" }, description: "e.g. ['tiktok', 'instagram', 'meta_ads']" },
      },
    },
  },
  higgsfield_brand_list: {
    name: "higgsfield_brand_list",
    description: "List brands registered in Higgsfield Ads Studio for this account. Call this first to find a brand_id before creating ads.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  higgsfield_brand_create: {
    name: "higgsfield_brand_create",
    description: "Register a new brand in Higgsfield Ads Studio. Required before adding products or generating ads.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        website: { type: "string" },
        description: { type: "string" },
        logo_url: { type: "string" },
      },
      required: ["name"],
    },
  },
  higgsfield_product_add: {
    name: "higgsfield_product_add",
    description: "Add a product to a Higgsfield brand so it can be used in ad generation. Requires a brand_id from higgsfield_brand_list.",
    input_schema: {
      type: "object",
      properties: {
        brand_id: { type: "string" },
        name: { type: "string" },
        product_url: { type: "string" },
        image_url: { type: "string" },
        description: { type: "string" },
      },
      required: ["brand_id", "name"],
    },
  },
  higgsfield_product_list: {
    name: "higgsfield_product_list",
    description: "List products for a brand in Higgsfield Ads Studio.",
    input_schema: {
      type: "object",
      properties: {
        brand_id: { type: "string" },
      },
      required: ["brand_id"],
    },
  },
  higgsfield_ad_quote: {
    name: "higgsfield_ad_quote",
    description: "Get a credit quote for generating ads in Higgsfield Ads Studio before committing to generation.",
    input_schema: {
      type: "object",
      properties: {
        brand_id: { type: "string" },
        product_id: { type: "string" },
        template_ids: { type: "array", items: { type: "string" } },
        formats: { type: "array", items: { type: "string" }, description: "e.g. ['9:16', '1:1', '16:9']" },
      },
      required: ["brand_id", "product_id"],
    },
  },
  higgsfield_ad_generate: {
    name: "higgsfield_ad_generate",
    description: "Generate video ads in Higgsfield Ads Studio for a product. Returns a run_id — poll with higgsfield_ad_status to get the completed video URLs.",
    input_schema: {
      type: "object",
      properties: {
        brand_id: { type: "string" },
        product_id: { type: "string" },
        template_ids: { type: "array", items: { type: "string" } },
        formats: { type: "array", items: { type: "string" } },
        headline: { type: "string" },
        cta: { type: "string", description: "Call to action text, e.g. 'Shop Now'" },
        idempotency_key: { type: "string" },
      },
      required: ["brand_id", "product_id"],
    },
  },
  higgsfield_ad_status: {
    name: "higgsfield_ad_status",
    description: "Check the status of a Higgsfield ad generation run. Returns completed video URLs when done.",
    input_schema: {
      type: "object",
      properties: {
        run_id: { type: "string" },
      },
      required: ["run_id"],
    },
  },
  higgsfield_video_generate: {
    name: "higgsfield_video_generate",
    description: "Generate a marketing video via Higgsfield. Returns a job_id — poll with higgsfield_job_wait to get the completed video URL.",
    input_schema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Detailed description of the video to generate" },
        product_image_url: { type: "string", description: "Product image to feature in the video" },
        aspect_ratio: { type: "string", description: "e.g. '9:16' for TikTok/Reels, '1:1' for feed, '16:9' for landscape" },
        duration: { type: "number", description: "Target duration in seconds" },
        style: { type: "string", description: "e.g. 'ugc', 'cinematic', 'product_showcase'" },
        voice_over_script: { type: "string" },
        music_style: { type: "string" },
      },
      required: ["prompt"],
    },
  },
  higgsfield_job_wait: {
    name: "higgsfield_job_wait",
    description: "Wait for a Higgsfield video generation job to complete and return the result URL.",
    input_schema: {
      type: "object",
      properties: {
        job_id: { type: "string" },
        timeout_seconds: { type: "number", description: "Max seconds to wait, default 120" },
      },
      required: ["job_id"],
    },
  },
  tiktok_publish: {
    name: "tiktok_publish",
    description: "Publish a video to TikTok via Higgsfield's TikTok publishing integration. Requires a completed video URL from higgsfield_video_generate or higgsfield_ad_generate.",
    input_schema: {
      type: "object",
      properties: {
        video_url: { type: "string", description: "URL of the completed video to publish" },
        caption: { type: "string", description: "TikTok caption — include hashtags here" },
        account_id: { type: "string", description: "TikTok account ID if multiple are connected" },
        privacy: { type: "string", enum: ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"], description: "Default PUBLIC_TO_EVERYONE" },
        schedule_time: { type: "string", description: "ISO 8601 datetime to schedule — omit to publish immediately" },
        disable_duet: { type: "boolean" },
        disable_stitch: { type: "boolean" },
      },
      required: ["video_url", "caption"],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // APP BUILDER
  // ─────────────────────────────────────────────────────────────────────────────

  app_scaffold: {
    name: "app_scaffold",
    description: "Initialize a new app build record in CrewOS. Creates the database record and queues the build — call this first, then app_build_generate to create the actual codebase and deploy it.",
    input_schema: {
      type: "object",
      properties: {
        app_name: { type: "string", description: "Human-readable app name, e.g. 'Shine Bright Solutions'" },
        slug: { type: "string", description: "URL-safe slug, e.g. 'shine-bright-solutions'" },
        description: { type: "string" },
        app_type: { type: "string", description: "e.g. 'service_business', 'ecommerce', 'booking', 'saas'" },
        features: { type: "array", items: { type: "string" }, description: "List of features to include, e.g. ['booking', 'payments', 'customer_portal']" },
        color_scheme: { type: "string", description: "Primary brand color or palette, e.g. 'blue', '#1a73e8'" },
        business_type: { type: "string", description: "Industry or business type for template selection" },
      },
      required: ["app_name", "slug", "description", "app_type", "features"],
    },
  },
  app_build_generate: {
    name: "app_build_generate",
    description: "Generate the app codebase from the CrewOS app template, create a GitHub repo, and deploy to Vercel. Requires a build_id from app_scaffold. Takes 60-90 seconds — check status with app_build_status.",
    input_schema: {
      type: "object",
      properties: {
        build_id: { type: "string", description: "UUID from app_scaffold" },
        github_token: { type: "string", description: "Optional override — uses connected GitHub integration by default" },
        vercel_token: { type: "string", description: "Optional override — uses connected Vercel integration by default" },
        supabase_project_ref: { type: "string", description: "Optional Supabase project ref to link" },
      },
      required: ["build_id"],
    },
  },
  app_build_status: {
    name: "app_build_status",
    description: "Check the current status of an app build — returns status, app URL, and GitHub repo link.",
    input_schema: {
      type: "object",
      properties: {
        build_id: { type: "string" },
      },
      required: ["build_id"],
    },
  },
  app_builds_list: {
    name: "app_builds_list",
    description: "List all app builds for this workspace, optionally filtered by status.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["scaffolding", "deploying", "live", "failed"] },
      },
    },
  },
  app_build_env_set: {
    name: "app_build_env_set",
    description: "Set environment variables on a deployed app's Vercel project. Use after the initial deploy to add API keys, feature flags, or service credentials. Requires a redeploy to take effect.",
    input_schema: {
      type: "object",
      properties: {
        build_id: { type: "string" },
        env_vars: { type: "object", description: "Key/value pairs to set as environment variables" },
        vercel_token: { type: "string", description: "Optional override — uses connected Vercel integration by default" },
      },
      required: ["build_id", "env_vars"],
    },
  },
  app_build_domain_add: {
    name: "app_build_domain_add",
    description: "Add a custom domain to a deployed app on Vercel. Returns DNS records to configure at the domain registrar.",
    input_schema: {
      type: "object",
      properties: {
        build_id: { type: "string" },
        domain: { type: "string", description: "Custom domain to add, e.g. 'app.shinebrightsolutions.com'" },
        vercel_token: { type: "string" },
      },
      required: ["build_id", "domain"],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // DIRECT MAIL (Lob.com)
  // ─────────────────────────────────────────────────────────────────────────────

  flyer_generate: {
    name: "flyer_generate",
    description: "Generate a detailed AI image prompt for a print-ready marketing flyer or postcard. Returns a prompt to pass to higgsfield_video_generate (image mode) — the output image URL is then used as front_url in direct_mail_send.",
    input_schema: {
      type: "object",
      properties: {
        business_name: { type: "string" },
        business_type: { type: "string" },
        headline: { type: "string" },
        offer: { type: "string", description: "Special offer or CTA, e.g. '20% off your first service'" },
        phone: { type: "string" },
        address: { type: "string" },
        website: { type: "string" },
        logo_url: { type: "string" },
        style: { type: "string", enum: ["professional", "bold", "friendly", "luxury", "modern"], description: "Visual style" },
        color_scheme: { type: "string" },
        format: { type: "string", enum: ["postcard_front", "postcard_back", "flyer_8x11", "social_post"], description: "Default: postcard_front" },
      },
      required: ["business_name", "business_type", "headline"],
    },
  },
  direct_mail_estimate: {
    name: "direct_mail_estimate",
    description: "Get a cost estimate for a direct mail campaign before committing to sending. Returns unit cost and total estimated spend.",
    input_schema: {
      type: "object",
      properties: {
        mail_type: { type: "string", enum: ["postcard", "letter"] },
        size: { type: "string", description: "Postcard: '4x6', '6x9', '6x11'. Letter: 'us_letter'" },
        quantity: { type: "number" },
        zip_codes: { type: "array", items: { type: "string" }, description: "For zip-code EDDM targeting — estimate based on ~800 addresses per zip" },
        target_type: { type: "string", enum: ["address_list", "zip_code"] },
      },
      required: ["mail_type", "quantity", "target_type"],
    },
  },
  direct_mail_send: {
    name: "direct_mail_send",
    description: "Send a physical direct mail campaign via Lob.com — postcards or letters to a specific address list or EDDM zip-code area. Requires a print-ready front_url (from flyer_generate + Higgsfield). Always run direct_mail_estimate first.",
    input_schema: {
      type: "object",
      properties: {
        mail_type: { type: "string", enum: ["postcard", "letter"] },
        size: { type: "string" },
        front_url: { type: "string", description: "Print-ready image URL for the front of the piece — from flyer_generate + Higgsfield" },
        back_url: { type: "string", description: "Optional back image URL — front_url used for both if omitted" },
        target_type: { type: "string", enum: ["address_list", "zip_code"] },
        zip_codes: { type: "array", items: { type: "string" }, description: "For EDDM — zip codes to target" },
        addresses: {
          type: "array",
          description: "For address_list — specific recipients",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              address_line1: { type: "string" },
              address_line2: { type: "string" },
              city: { type: "string" },
              state: { type: "string" },
              zip: { type: "string" },
              country: { type: "string" },
            },
          },
        },
        from_name: { type: "string" },
        from_address_line1: { type: "string" },
        from_city: { type: "string" },
        from_state: { type: "string" },
        from_zip: { type: "string" },
        description: { type: "string" },
        send_date: { type: "string", description: "ISO 8601 date to schedule — omit or 'immediate' to send now" },
      },
      required: ["mail_type", "front_url", "target_type", "from_name", "from_address_line1", "from_city", "from_state", "from_zip"],
    },
  },
  direct_mail_track: {
    name: "direct_mail_track",
    description: "Track the delivery status of a specific piece of direct mail sent via Lob.com.",
    input_schema: {
      type: "object",
      properties: {
        postcard_id: { type: "string", description: "Lob postcard ID from direct_mail_send result" },
      },
      required: ["postcard_id"],
    },
  },

  // ── REAL ESTATE / MLS ──────────────────────────────────────────────────────
  mls_property_search: {
    name: "mls_property_search",
    description: "Search active for-sale MLS property listings by location, price range, bedrooms, and property type via Rentcast API. Returns matching listings with address, price, beds/baths, and square footage.",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name" },
        state: { type: "string", description: "Two-letter state abbreviation, e.g. 'TX'" },
        zip_code: { type: "string", description: "5-digit ZIP code" },
        min_price: { type: "number", description: "Minimum listing price" },
        max_price: { type: "number", description: "Maximum listing price" },
        min_beds: { type: "number", description: "Minimum number of bedrooms" },
        max_beds: { type: "number", description: "Maximum number of bedrooms" },
        property_type: { type: "string", enum: ["Single Family", "Condo", "Townhouse", "Multi Family", "Land"], description: "Property type filter" },
        limit: { type: "number", description: "Max results, default 20" },
      },
    },
  },

  mls_property_detail: {
    name: "mls_property_detail",
    description: "Get detailed information about a specific property by address — beds, baths, square footage, year built, lot size, tax assessment, and listing status.",
    input_schema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Street address, e.g. '123 Main St'" },
        city: { type: "string" },
        state: { type: "string" },
        zip_code: { type: "string" },
      },
      required: ["address"],
    },
  },

  property_valuation: {
    name: "property_valuation",
    description: "Get an AI-powered automated valuation (AVM) for a property — estimated market value, confidence score, and value range. Uses Rentcast's comparable sales model.",
    input_schema: {
      type: "object",
      properties: {
        address: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        zip_code: { type: "string" },
        property_type: { type: "string" },
        bedrooms: { type: "number" },
        bathrooms: { type: "number" },
        square_footage: { type: "number" },
      },
      required: ["address"],
    },
  },

  rent_estimate: {
    name: "rent_estimate",
    description: "Estimate fair market rent for a property based on its characteristics and local comparable rentals. Returns estimated monthly rent, confidence score, and rent range.",
    input_schema: {
      type: "object",
      properties: {
        address: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        zip_code: { type: "string" },
        property_type: { type: "string" },
        bedrooms: { type: "number" },
        bathrooms: { type: "number" },
        square_footage: { type: "number" },
      },
      required: ["address"],
    },
  },

  property_comps: {
    name: "property_comps",
    description: "Pull recent comparable sales (comps) near a subject property. Returns sold properties sorted by similarity with sale price, date, and distance.",
    input_schema: {
      type: "object",
      properties: {
        address: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        zip_code: { type: "string" },
        radius_miles: { type: "number", description: "Search radius in miles, default 1" },
        days_old: { type: "number", description: "Only include sales from the last N days, default 180" },
        limit: { type: "number", description: "Number of comps to return, default 10" },
      },
      required: ["address"],
    },
  },

  owner_lookup: {
    name: "owner_lookup",
    description: "Look up property ownership information — owner name, whether owner-occupied, mailing address, and last sale price/date. Useful for prospecting off-market leads.",
    input_schema: {
      type: "object",
      properties: {
        address: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        zip_code: { type: "string" },
      },
      required: ["address"],
    },
  },

  mls_rental_listings: {
    name: "mls_rental_listings",
    description: "Search active long-term rental listings in a market by location, price range, and property type. Good for comping rent prices and finding tenant leads.",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string" },
        state: { type: "string" },
        zip_code: { type: "string" },
        min_price: { type: "number" },
        max_price: { type: "number" },
        min_beds: { type: "number" },
        property_type: { type: "string" },
        limit: { type: "number" },
      },
    },
  },

  // ── RESTAURANT ─────────────────────────────────────────────────────────────
  pos_orders_list: {
    name: "pos_orders_list",
    description: "Pull recent orders from the restaurant's Toast POS system — filtered by date range and status. Returns order totals, items, and timestamps.",
    input_schema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "ISO 8601 start datetime, e.g. '2025-01-01T00:00:00Z'" },
        end_date: { type: "string", description: "ISO 8601 end datetime" },
        status: { type: "string", enum: ["OPEN", "PAID", "VOIDED", "NEEDS_APPROVAL"] },
        limit: { type: "number" },
      },
    },
  },

  menu_items_list: {
    name: "menu_items_list",
    description: "List all menu items from Toast POS, optionally filtered by category. Returns item names, prices, descriptions, and calories.",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Filter by menu category/group name" },
        availability: { type: "string" },
      },
    },
  },

  reservation_list: {
    name: "reservation_list",
    description: "List upcoming restaurant reservations from Toast. Returns guest name, party size, time, and special requests.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        status: { type: "string", enum: ["BOOKED", "ARRIVED", "PARTIALLY_ARRIVED", "SEATED", "DONE", "NO_SHOW", "CANCEL"] },
        limit: { type: "number" },
      },
    },
  },

  pos_revenue_report: {
    name: "pos_revenue_report",
    description: "Generate a revenue/cash report from Toast POS for a date range. Returns gross sales, net sales, tax collected, and tip totals.",
    input_schema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "ISO 8601 start datetime" },
        end_date: { type: "string", description: "ISO 8601 end datetime" },
      },
      required: ["start_date", "end_date"],
    },
  },

  yelp_reviews_get: {
    name: "yelp_reviews_get",
    description: "Fetch Yelp reviews and overall rating for a business. Can look up by Yelp business ID or by business name + location.",
    input_schema: {
      type: "object",
      properties: {
        business_id: { type: "string", description: "Yelp business ID" },
        business_name: { type: "string", description: "Business name to search for" },
        location: { type: "string", description: "City or address to narrow the Yelp search" },
        limit: { type: "number", description: "Number of reviews to return (max 50)" },
      },
    },
  },

  // ── BUSINESS (Google My Business) ──────────────────────────────────────────
  google_business_reviews: {
    name: "google_business_reviews",
    description: "Fetch Google Business Profile reviews for the connected location. Returns average rating, total count, and individual reviews with any existing owner replies.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Reviews per page, max 50" },
        page_token: { type: "string", description: "Pagination token from a previous result" },
      },
    },
  },

  google_business_reply_review: {
    name: "google_business_reply_review",
    description: "Post or update a public reply to a Google Business review on behalf of the business owner.",
    input_schema: {
      type: "object",
      properties: {
        review_name: { type: "string", description: "Full review resource name from google_business_reviews, e.g. 'accounts/123/locations/456/reviews/789'" },
        reply_text: { type: "string", description: "The reply text to post publicly" },
      },
      required: ["review_name", "reply_text"],
    },
  },

  google_business_update_hours: {
    name: "google_business_update_hours",
    description: "Update the regular business hours on the Google Business Profile. Specify hours per day as 'HH:MM-HH:MM', e.g. '09:00-21:00'. Omit a day to leave its hours unchanged.",
    input_schema: {
      type: "object",
      properties: {
        monday: { type: "string" },
        tuesday: { type: "string" },
        wednesday: { type: "string" },
        thursday: { type: "string" },
        friday: { type: "string" },
        saturday: { type: "string" },
        sunday: { type: "string" },
      },
    },
  },

  // ── Music & Entertainment (18 tools) ────────────────────────────────────

  music_ein_guide: {
    name: "music_ein_guide",
    description: "Provide a step-by-step guide to registering an EIN (Employer Identification Number) with the IRS for a music business entity.",
    input_schema: {
      type: "object",
      properties: {
        business_name: { type: "string", description: "Legal business name to register" },
        business_type: { type: "string", enum: ["LLC", "Sole Proprietorship", "Corporation", "Partnership"], description: "Entity type" },
      },
    },
  },

  music_state_registration_guide: {
    name: "music_state_registration_guide",
    description: "Guide for registering a music business entity (LLC or Corp) with the appropriate state Secretary of State.",
    input_schema: {
      type: "object",
      properties: {
        state: { type: "string", description: "Two-letter state abbreviation, e.g. OK, CA, NY" },
        entity_type: { type: "string", enum: ["LLC", "Corporation", "Sole Proprietorship"], description: "Type of business entity" },
        business_name: { type: "string", description: "Desired business name" },
      },
      required: ["state"],
    },
  },

  music_bmi_ascap_guide: {
    name: "music_bmi_ascap_guide",
    description: "Guide for registering with a Performing Rights Organization (PRO) — BMI or ASCAP — to collect performance royalties.",
    input_schema: {
      type: "object",
      properties: {
        artist_name: { type: "string" },
        role: { type: "string", enum: ["songwriter", "publisher", "both"], description: "Whether registering as songwriter, publisher, or both" },
      },
    },
  },

  music_sync_license_generate: {
    name: "music_sync_license_generate",
    description: "Generate a sync license agreement template for licensing a song for use in a film, TV show, ad, or other visual media.",
    input_schema: {
      type: "object",
      properties: {
        song_title: { type: "string" },
        artist_name: { type: "string" },
        licensee_name: { type: "string", description: "Name of the company or person licensing the song" },
        use_type: { type: "string", description: "Describe the project: film, commercial, YouTube video, etc." },
        territory: { type: "string", description: "Geographic scope, e.g. Worldwide or United States" },
        term: { type: "string", description: "License duration, e.g. 1 year, in perpetuity" },
        fee: { type: "number", description: "License fee in USD" },
      },
      required: ["song_title", "artist_name"],
    },
  },

  music_sync_pitch_email: {
    name: "music_sync_pitch_email",
    description: "Draft a professional sync licensing pitch email to a music supervisor for a film, TV show, ad, or game.",
    input_schema: {
      type: "object",
      properties: {
        artist_name: { type: "string" },
        song_title: { type: "string" },
        genre: { type: "string" },
        mood: { type: "string", description: "Emotional feel of the track, e.g. uplifting, dark, cinematic" },
        bpm: { type: "number" },
        supervisor_name: { type: "string" },
        project_name: { type: "string", description: "Film/show/ad name if known" },
      },
      required: ["artist_name", "song_title"],
    },
  },

  music_distribution_setup: {
    name: "music_distribution_setup",
    description: "Step-by-step guide to set up music distribution through DistroKid, TuneCore, or CD Baby to get on Spotify, Apple Music, and 70+ platforms.",
    input_schema: {
      type: "object",
      properties: {
        distributor: { type: "string", enum: ["DistroKid", "TuneCore", "CD Baby"], description: "Distribution platform to use" },
        artist_name: { type: "string" },
      },
    },
  },

  music_streaming_profile_setup: {
    name: "music_streaming_profile_setup",
    description: "Guide to claiming and optimizing artist profiles on Spotify for Artists, Apple Music for Artists, YouTube, and TikTok.",
    input_schema: {
      type: "object",
      properties: {
        artist_name: { type: "string" },
        platforms: {
          type: "array",
          items: { type: "string", enum: ["Spotify", "Apple Music", "YouTube", "TikTok"] },
          description: "Which platforms to set up",
        },
      },
    },
  },

  music_press_kit_generate: {
    name: "music_press_kit_generate",
    description: "Generate a professional Electronic Press Kit (EPK) template with bio, achievements, social links, streaming links, and press contact.",
    input_schema: {
      type: "object",
      properties: {
        artist_name: { type: "string" },
        genre: { type: "string" },
        hometown: { type: "string" },
        bio: { type: "string", description: "Artist bio (optional — will provide template if omitted)" },
        achievements: { type: "string" },
        social_links: { type: "object", description: "Social handles: {instagram, tiktok, youtube}" },
        contact_email: { type: "string" },
        streaming_link: { type: "string" },
      },
      required: ["artist_name"],
    },
  },

  music_press_release_write: {
    name: "music_press_release_write",
    description: "Write a professional press release for a new music release (single, EP, or album) to send to blogs, publications, and radio stations.",
    input_schema: {
      type: "object",
      properties: {
        artist_name: { type: "string" },
        release_title: { type: "string" },
        release_type: { type: "string", enum: ["single", "EP", "album"], description: "Type of release" },
        release_date: { type: "string", description: "Release date YYYY-MM-DD" },
        genre: { type: "string" },
        quote: { type: "string", description: "Artist quote about the release" },
        streaming_link: { type: "string" },
        contact_email: { type: "string" },
      },
      required: ["artist_name", "release_title"],
    },
  },

  music_radio_pitch_email: {
    name: "music_radio_pitch_email",
    description: "Draft a radio airplay submission email to a station music director or DJ.",
    input_schema: {
      type: "object",
      properties: {
        artist_name: { type: "string" },
        song_title: { type: "string" },
        genre: { type: "string" },
        station_name: { type: "string" },
        dj_name: { type: "string", description: "Name of the music director or DJ (optional)" },
        streaming_link: { type: "string" },
      },
      required: ["artist_name", "song_title"],
    },
  },

  music_google_ads_campaign: {
    name: "music_google_ads_campaign",
    description: "Generate a Google Ads campaign brief and setup guide for promoting a music release via YouTube TrueView and Display ads.",
    input_schema: {
      type: "object",
      properties: {
        artist_name: { type: "string" },
        song_title: { type: "string" },
        target_url: { type: "string", description: "Smart link URL for the release" },
        budget_daily: { type: "number", description: "Daily ad spend in USD" },
        target_location: { type: "string", description: "Target location, e.g. United States, Atlanta GA" },
        genre: { type: "string" },
      },
      required: ["artist_name", "song_title"],
    },
  },

  music_tiktok_ads_campaign: {
    name: "music_tiktok_ads_campaign",
    description: "Generate a TikTok Ads campaign brief for promoting a music release via In-Feed and Spark Ads.",
    input_schema: {
      type: "object",
      properties: {
        artist_name: { type: "string" },
        song_title: { type: "string" },
        budget_daily: { type: "number", description: "Daily ad spend in USD" },
        target_age_range: { type: "string", description: "Age range, e.g. 18-34" },
        genre: { type: "string" },
      },
      required: ["artist_name", "song_title"],
    },
  },

  music_facebook_ads_campaign: {
    name: "music_facebook_ads_campaign",
    description: "Generate a Meta (Facebook + Instagram) Ads campaign brief for promoting a music release.",
    input_schema: {
      type: "object",
      properties: {
        artist_name: { type: "string" },
        song_title: { type: "string" },
        budget_daily: { type: "number", description: "Daily ad spend in USD" },
        target_location: { type: "string" },
        genre: { type: "string" },
        smart_link: { type: "string", description: "Smart link to streaming platforms" },
      },
      required: ["artist_name", "song_title"],
    },
  },

  music_social_post_generate: {
    name: "music_social_post_generate",
    description: "Generate ready-to-post social media content for Instagram, TikTok, Twitter/X, and Facebook for a music release.",
    input_schema: {
      type: "object",
      properties: {
        artist_name: { type: "string" },
        song_title: { type: "string" },
        release_date: { type: "string" },
        platform: { type: "string", enum: ["instagram", "tiktok", "twitter", "facebook"], description: "Target platform (omit for all)" },
        post_type: { type: "string", enum: ["announcement", "countdown", "behindthescenes"], description: "Type of post" },
      },
      required: ["artist_name", "song_title"],
    },
  },

  music_release_calendar: {
    name: "music_release_calendar",
    description: "Generate a full release campaign timeline working backwards from the release date, covering distribution, editorial pitch, PR, ads, and social milestones.",
    input_schema: {
      type: "object",
      properties: {
        artist_name: { type: "string" },
        song_title: { type: "string" },
        release_date: { type: "string", description: "Release date in YYYY-MM-DD format" },
      },
      required: ["release_date"],
    },
  },

  music_artist_roster: {
    name: "music_artist_roster",
    description: "Manage the label's artist roster — list, add, or update artist records including genre, deal stage, and contact info.",
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["list", "add", "update"], description: "Operation to perform" },
        artist_name: { type: "string" },
        genre: { type: "string" },
        stage: { type: "string", enum: ["Prospecting", "Signed", "Active", "Alumni"], description: "Relationship stage" },
        contact: { type: "string", description: "Email or phone" },
      },
      required: ["action"],
    },
  },

  music_royalty_tracker: {
    name: "music_royalty_tracker",
    description: "Guide to tracking and reconciling streaming royalties, PRO performance royalties, and sync fees across all platforms.",
    input_schema: {
      type: "object",
      properties: {
        artist_name: { type: "string" },
        period: { type: "string", description: "Reporting period, e.g. Q3 2026" },
        platform: { type: "string", description: "Platform to focus on, e.g. Spotify, BMI, or 'all'" },
      },
    },
  },

  music_playlist_pitch: {
    name: "music_playlist_pitch",
    description: "Draft a playlist pitch email and provide a list of playlist submission platforms for independent curators and editorial teams.",
    input_schema: {
      type: "object",
      properties: {
        artist_name: { type: "string" },
        song_title: { type: "string" },
        genre: { type: "string" },
        mood: { type: "string" },
        bpm: { type: "number" },
        playlist_name: { type: "string", description: "Name of the playlist being pitched to" },
        curator_name: { type: "string" },
      },
      required: ["artist_name", "song_title"],
    },
  },

  // ── Trades (16 tools) ────────────────────────────────────────────────────────

  trades_ein_guide: {
    name: "trades_ein_guide",
    description: "Step-by-step guide to apply for an EIN (Employer Identification Number) for a trades business via IRS.gov — free, instant, and required before opening a business bank account or hiring employees.",
    input_schema: {
      type: "object",
      properties: {
        business_name: { type: "string" },
        trade_type: { type: "string", description: "e.g. Plumbing, Electrical, HVAC, Roofing, Carpentry" },
        owner_name: { type: "string" },
        state: { type: "string" },
      },
    },
  },

  trades_state_registration_guide: {
    name: "trades_state_registration_guide",
    description: "Walk-through for registering a trades business with the state — LLC vs sole proprietor comparison, Articles of Organization, registered agent, operating agreement, and state-specific contractor registration requirements.",
    input_schema: {
      type: "object",
      properties: {
        business_name: { type: "string" },
        state: { type: "string" },
        trade_type: { type: "string" },
        entity_type: { type: "string", enum: ["LLC", "Sole Proprietor", "Corporation", "Partnership"], description: "Preferred business structure" },
      },
    },
  },

  trades_license_certification_guide: {
    name: "trades_license_certification_guide",
    description: "State-by-state guide to getting licensed and certified in a specific trade — contractor license boards, exam requirements, apprenticeship programs, bonding, and insurance minimums.",
    input_schema: {
      type: "object",
      properties: {
        trade_type: { type: "string", description: "e.g. Electrician, Plumber, HVAC Tech, Roofer, Welder, Carpenter, General Contractor" },
        state: { type: "string" },
        experience_level: { type: "string", enum: ["Apprentice", "Journeyman", "Master", "General Contractor"], description: "Current experience level" },
      },
      required: ["trade_type", "state"],
    },
  },

  trades_business_email_setup: {
    name: "trades_business_email_setup",
    description: "Guide to creating a professional business email address for a trades company — domain purchase, Google Workspace or Microsoft 365 setup, and email signature best practices.",
    input_schema: {
      type: "object",
      properties: {
        business_name: { type: "string" },
        trade_type: { type: "string" },
        preferred_domain: { type: "string", description: "Desired domain name, e.g. smithelectrical.com" },
      },
    },
  },

  trades_business_address_setup: {
    name: "trades_business_address_setup",
    description: "Guide to establishing a professional business address for a trades company — virtual mailbox services, registered agent address, home address considerations, and PO Box options.",
    input_schema: {
      type: "object",
      properties: {
        business_name: { type: "string" },
        state: { type: "string" },
        use_home_address: { type: "boolean", description: "Whether owner is considering using their home address" },
      },
    },
  },

  trades_business_phone_setup: {
    name: "trades_business_phone_setup",
    description: "Guide to setting up a dedicated business phone number for a trades company — VoIP options (Google Voice, RingCentral, OpenPhone), call routing, voicemail scripts, and after-hours handling.",
    input_schema: {
      type: "object",
      properties: {
        business_name: { type: "string" },
        trade_type: { type: "string" },
        team_size: { type: "number", description: "Number of employees or contractors" },
      },
    },
  },

  trades_business_bank_guide: {
    name: "trades_business_bank_guide",
    description: "Guide to opening a business bank account for a trades company — best banks for contractors, required documents (EIN, LLC docs, ID), business credit card options, and QuickBooks/Wave accounting setup.",
    input_schema: {
      type: "object",
      properties: {
        business_name: { type: "string" },
        state: { type: "string" },
        annual_revenue_estimate: { type: "string", description: "Estimated annual revenue range, e.g. $50k-$150k" },
      },
    },
  },

  trades_insurance_guide: {
    name: "trades_insurance_guide",
    description: "Guide to getting properly insured as a trades contractor — general liability, workers' comp, commercial auto, tools & equipment coverage, and surety bonds by trade type.",
    input_schema: {
      type: "object",
      properties: {
        trade_type: { type: "string" },
        state: { type: "string" },
        has_employees: { type: "boolean" },
        has_vehicles: { type: "boolean" },
      },
      required: ["trade_type", "state"],
    },
  },

  trades_estimate_template: {
    name: "trades_estimate_template",
    description: "Generate a professional job estimate template for a trades business — line items for labor, materials, markup, taxes, and terms. Customized by trade type and job scope.",
    input_schema: {
      type: "object",
      properties: {
        business_name: { type: "string" },
        trade_type: { type: "string" },
        job_type: { type: "string", description: "e.g. Bathroom remodel, HVAC install, Roof replacement, Electrical panel upgrade" },
        client_name: { type: "string" },
        labor_hours: { type: "number" },
        hourly_rate: { type: "number" },
        materials_cost: { type: "number" },
      },
    },
  },

  trades_invoice_template: {
    name: "trades_invoice_template",
    description: "Generate a professional invoice for a completed trades job — with payment terms, deposit tracking, late fee language, and accepted payment methods.",
    input_schema: {
      type: "object",
      properties: {
        business_name: { type: "string" },
        trade_type: { type: "string" },
        client_name: { type: "string" },
        job_description: { type: "string" },
        total_amount: { type: "number" },
        deposit_paid: { type: "number" },
        payment_due_days: { type: "number", description: "Days until payment is due, e.g. 15 or 30" },
      },
    },
  },

  trades_google_ads_campaign: {
    name: "trades_google_ads_campaign",
    description: "Generate a complete Google Local Services Ads and Google Search Ads strategy for a trades business — targeting local zip codes, keywords by trade, ad copy, and budget recommendations.",
    input_schema: {
      type: "object",
      properties: {
        business_name: { type: "string" },
        trade_type: { type: "string" },
        service_area: { type: "string", description: "City, state or zip codes served" },
        monthly_budget: { type: "number" },
        services: { type: "array", items: { type: "string" }, description: "Specific services to advertise, e.g. ['drain cleaning', 'water heater install']" },
      },
      required: ["trade_type", "service_area"],
    },
  },

  trades_facebook_ads_campaign: {
    name: "trades_facebook_ads_campaign",
    description: "Generate a Facebook and Instagram ads campaign strategy for a trades business — targeting homeowners by zip code, ad creative briefs, offer ideas, and seasonal campaign calendar.",
    input_schema: {
      type: "object",
      properties: {
        business_name: { type: "string" },
        trade_type: { type: "string" },
        service_area: { type: "string" },
        monthly_budget: { type: "number" },
        campaign_goal: { type: "string", enum: ["Lead Generation", "Brand Awareness", "Seasonal Promotion"], description: "Primary campaign objective" },
      },
      required: ["trade_type", "service_area"],
    },
  },

  trades_direct_mail_campaign: {
    name: "trades_direct_mail_campaign",
    description: "Generate a direct mail postcard campaign strategy for a trades business — targeting homeowner zip codes, seasonal offers, postcard copy, and EDDM (Every Door Direct Mail) setup guide.",
    input_schema: {
      type: "object",
      properties: {
        business_name: { type: "string" },
        trade_type: { type: "string" },
        service_area: { type: "string" },
        offer: { type: "string", description: "Promotional offer, e.g. '$50 off first service call', 'Free estimate'" },
        season: { type: "string", enum: ["Spring", "Summer", "Fall", "Winter", "Year-round"] },
      },
      required: ["trade_type"],
    },
  },

  trades_yelp_nextdoor_setup: {
    name: "trades_yelp_nextdoor_setup",
    description: "Step-by-step guide to claiming and optimizing a trades business on Yelp and Nextdoor — the two highest-converting local platforms for home service contractors.",
    input_schema: {
      type: "object",
      properties: {
        business_name: { type: "string" },
        trade_type: { type: "string" },
        service_area: { type: "string" },
        phone_number: { type: "string" },
        website: { type: "string" },
      },
    },
  },

  trades_review_request_template: {
    name: "trades_review_request_template",
    description: "Generate SMS and email templates for requesting Google, Yelp, and Facebook reviews from completed trades jobs — timing, tone, and direct review link instructions.",
    input_schema: {
      type: "object",
      properties: {
        business_name: { type: "string" },
        trade_type: { type: "string" },
        client_name: { type: "string" },
        job_type: { type: "string" },
        review_platform: { type: "string", enum: ["Google", "Yelp", "Facebook", "All"], description: "Platform to request review on" },
      },
    },
  },

  trades_promo_campaign_generate: {
    name: "trades_promo_campaign_generate",
    description: "Generate a full promotional campaign for a trades business — including offer, ad copy, social posts, email/SMS sequence, and follow-up schedule. Seasonal or event-based.",
    input_schema: {
      type: "object",
      properties: {
        business_name: { type: "string" },
        trade_type: { type: "string" },
        campaign_name: { type: "string" },
        offer: { type: "string", description: "The promotion, e.g. '20% off AC tune-up'" },
        start_date: { type: "string" },
        end_date: { type: "string" },
        channels: {
          type: "array",
          items: { type: "string", enum: ["Google Ads", "Facebook", "Instagram", "Email", "SMS", "Direct Mail", "Nextdoor"] },
        },
      },
      required: ["trade_type", "offer"],
    },
  },

  // ── Restaurant Business Setup (16) ──────────────────────────────────────────
  restaurant_ein_guide: { name: "restaurant_ein_guide", description: "Walk through the EIN application for a restaurant business — required for bank accounts, payroll, licenses, and permits.", input_schema: { type: "object", properties: { business_name: { type: "string" }, restaurant_type: { type: "string" }, owner_name: { type: "string" }, state: { type: "string" } }, required: [] } },
  restaurant_state_registration_guide: { name: "restaurant_state_registration_guide", description: "Guide to forming an LLC or registering a restaurant business entity in any state.", input_schema: { type: "object", properties: { business_name: { type: "string" }, state: { type: "string" }, restaurant_type: { type: "string" }, entity_type: { type: "string" } }, required: [] } },
  restaurant_license_permit_guide: { name: "restaurant_license_permit_guide", description: "Full checklist of licenses and permits to open a restaurant: health permit, food handler cards, ServSafe, seller's permit, CO, liquor license, fire inspection.", input_schema: { type: "object", properties: { state: { type: "string" }, restaurant_type: { type: "string" }, serves_alcohol: { type: "boolean" }, has_outdoor_seating: { type: "boolean" }, is_food_truck: { type: "boolean" } }, required: [] } },
  restaurant_health_inspection_guide: { name: "restaurant_health_inspection_guide", description: "Health inspection prep guide — temperature control, hygiene, cross-contamination, sanitation, pest control, day-before checklist.", input_schema: { type: "object", properties: { state: { type: "string" }, restaurant_type: { type: "string" }, kitchen_type: { type: "string" } }, required: [] } },
  restaurant_fire_safety_guide: { name: "restaurant_fire_safety_guide", description: "Fire safety and code compliance guide — hood/suppression systems, extinguishers, sprinklers, occupancy/egress, fire marshal inspection.", input_schema: { type: "object", properties: { state: { type: "string" }, restaurant_type: { type: "string" }, seating_capacity: { type: "number" } }, required: [] } },
  restaurant_business_email_setup: { name: "restaurant_business_email_setup", description: "Guide to setting up professional business email for a restaurant — domain, Google Workspace, address structure (info@, catering@, reservations@).", input_schema: { type: "object", properties: { business_name: { type: "string" }, restaurant_type: { type: "string" }, preferred_domain: { type: "string" } }, required: [] } },
  restaurant_business_address_setup: { name: "restaurant_business_address_setup", description: "Guide to setting up a business address for a restaurant — physical vs. virtual mailbox, registered agent, Google Business Profile verification.", input_schema: { type: "object", properties: { business_name: { type: "string" }, state: { type: "string" }, restaurant_type: { type: "string" }, has_physical_location: { type: "boolean" } }, required: [] } },
  restaurant_business_phone_setup: { name: "restaurant_business_phone_setup", description: "Guide to setting up a dedicated business phone for a restaurant — Google Voice vs. OpenPhone vs. RingCentral, voicemail scripts, SMS strategy.", input_schema: { type: "object", properties: { business_name: { type: "string" }, restaurant_type: { type: "string" }, takes_reservations: { type: "boolean" }, team_size: { type: "number" } }, required: [] } },
  restaurant_business_bank_guide: { name: "restaurant_business_bank_guide", description: "Guide to opening a business bank account for a restaurant — what to bring, bank options, merchant processing, cash flow sub-accounts, accounting setup.", input_schema: { type: "object", properties: { business_name: { type: "string" }, state: { type: "string" }, monthly_revenue_estimate: { type: "string" }, has_employees: { type: "boolean" } }, required: [] } },
  restaurant_servsafe_guide: { name: "restaurant_servsafe_guide", description: "ServSafe food safety certification guide — food handler cards, Food Manager exam, HACCP plan, staff training program.", input_schema: { type: "object", properties: { state: { type: "string" }, number_of_staff: { type: "number" }, is_manager: { type: "boolean" } }, required: [] } },
  restaurant_insurance_guide: { name: "restaurant_insurance_guide", description: "Restaurant insurance guide — general liability, property, workers' comp, liquor liability, business interruption, BOP packages.", input_schema: { type: "object", properties: { restaurant_type: { type: "string" }, state: { type: "string" }, serves_alcohol: { type: "boolean" }, has_employees: { type: "boolean" }, annual_revenue_estimate: { type: "string" } }, required: [] } },
  restaurant_google_ads_campaign: { name: "restaurant_google_ads_campaign", description: "Google Ads strategy for a restaurant — Google Business Profile optimization, search keywords, remarketing, catering campaign.", input_schema: { type: "object", properties: { business_name: { type: "string" }, restaurant_type: { type: "string" }, service_area: { type: "string" }, monthly_budget: { type: "number" }, cuisine_type: { type: "string" } }, required: [] } },
  restaurant_facebook_ads_campaign: { name: "restaurant_facebook_ads_campaign", description: "Facebook and Instagram ads strategy for a restaurant — audience targeting, ad formats, seasonal calendar, budget allocation.", input_schema: { type: "object", properties: { business_name: { type: "string" }, restaurant_type: { type: "string" }, service_area: { type: "string" }, monthly_budget: { type: "number" }, cuisine_type: { type: "string" }, campaign_goal: { type: "string" } }, required: [] } },
  restaurant_menu_marketing: { name: "restaurant_menu_marketing", description: "Menu engineering and marketing guide — Stars/Plowhorses/Puzzles/Dogs framework, design principles, QR codes, pricing psychology, upsell training.", input_schema: { type: "object", properties: { business_name: { type: "string" }, restaurant_type: { type: "string" }, cuisine_type: { type: "string" }, price_point: { type: "string" } }, required: [] } },
  restaurant_review_request_template: { name: "restaurant_review_request_template", description: "SMS, email, table tent, and receipt review request templates for a restaurant plus collection strategy and responding to reviews.", input_schema: { type: "object", properties: { business_name: { type: "string" }, restaurant_type: { type: "string" }, review_platform: { type: "string" } }, required: [] } },
  restaurant_promo_campaign_generate: { name: "restaurant_promo_campaign_generate", description: "Full promotional campaign for a restaurant — offer, ad copy, social posts, email/SMS sequence, grand opening extras, success metrics.", input_schema: { type: "object", properties: { business_name: { type: "string" }, restaurant_type: { type: "string" }, campaign_name: { type: "string" }, offer: { type: "string" }, start_date: { type: "string" }, end_date: { type: "string" }, channels: { type: "array", items: { type: "string", enum: ["Google Ads", "Facebook", "Instagram", "Email", "SMS", "Flyer/Poster", "Nextdoor"] } } }, required: ["offer"] } },

  // ── Business Setup (14) ──────────────────────────────────────────────────────
  business_ein_guide: { name: "business_ein_guide", description: "Walk through the EIN application for any new business — required for bank accounts, payroll, hiring, and taxes. Free and instant from the IRS.", input_schema: { type: "object", properties: { business_name: { type: "string" }, business_type: { type: "string" }, owner_name: { type: "string" }, state: { type: "string" }, entity_type: { type: "string", enum: ["LLC", "Sole Proprietor", "S-Corp", "C-Corp", "Partnership"] } }, required: [] } },
  business_state_registration_guide: { name: "business_state_registration_guide", description: "Guide to forming an LLC, corporation, or registering any business entity in any state — entity comparison, Articles of Organization, registered agent, operating agreement.", input_schema: { type: "object", properties: { business_name: { type: "string" }, state: { type: "string" }, business_type: { type: "string" }, entity_type: { type: "string", enum: ["LLC", "S-Corp", "C-Corp", "Sole Proprietor", "Partnership"] } }, required: [] } },
  business_license_permit_guide: { name: "business_license_permit_guide", description: "Checklist of licenses and permits for any business: general business license, seller's permit, professional licenses, zoning, home occupation permit.", input_schema: { type: "object", properties: { state: { type: "string" }, business_type: { type: "string" }, is_home_based: { type: "boolean" }, is_online_only: { type: "boolean" }, sells_physical_products: { type: "boolean" }, requires_professional_license: { type: "boolean" } }, required: [] } },
  business_email_setup: { name: "business_email_setup", description: "Guide to setting up professional business email for any company — domain, Google Workspace or M365, address structure, email signature.", input_schema: { type: "object", properties: { business_name: { type: "string" }, business_type: { type: "string" }, preferred_domain: { type: "string" }, team_size: { type: "number" } }, required: [] } },
  business_address_setup: { name: "business_address_setup", description: "Guide to setting up a business address — physical location, virtual mailbox, registered agent, home-based business considerations, Google Business Profile.", input_schema: { type: "object", properties: { business_name: { type: "string" }, state: { type: "string" }, business_type: { type: "string" }, has_physical_location: { type: "boolean" }, is_home_based: { type: "boolean" } }, required: [] } },
  business_phone_setup: { name: "business_phone_setup", description: "Guide to setting up a dedicated business phone number — Google Voice vs. OpenPhone vs. RingCentral, voicemail scripts, auto-attendant, SMS strategy.", input_schema: { type: "object", properties: { business_name: { type: "string" }, business_type: { type: "string" }, team_size: { type: "number" }, needs_auto_attendant: { type: "boolean" } }, required: [] } },
  business_bank_account_guide: { name: "business_bank_account_guide", description: "Guide to opening a business bank account — what to bring, bank options (Chase, BofA, Relay, Mercury), merchant processing, cash flow management, accounting software.", input_schema: { type: "object", properties: { business_name: { type: "string" }, state: { type: "string" }, business_type: { type: "string" }, monthly_revenue_estimate: { type: "string" }, has_employees: { type: "boolean" }, accepts_payments_online: { type: "boolean" } }, required: [] } },
  business_website_guide: { name: "business_website_guide", description: "Guide to launching a professional business website — platform options (Squarespace, Webflow, WordPress, Shopify), must-have pages, SEO basics, domain and hosting.", input_schema: { type: "object", properties: { business_name: { type: "string" }, business_type: { type: "string" }, sells_products_online: { type: "boolean" }, budget: { type: "string" } }, required: [] } },
  business_google_ads_campaign: { name: "business_google_ads_campaign", description: "Google Ads strategy for any business — Google Business Profile, search keywords, ad copy, remarketing, and budget allocation.", input_schema: { type: "object", properties: { business_name: { type: "string" }, business_type: { type: "string" }, service_area: { type: "string" }, monthly_budget: { type: "number" }, target_customer: { type: "string" } }, required: [] } },
  business_facebook_ads_campaign: { name: "business_facebook_ads_campaign", description: "Facebook and Instagram ads strategy for any business — audience targeting, ad formats, content calendar, budget allocation.", input_schema: { type: "object", properties: { business_name: { type: "string" }, business_type: { type: "string" }, service_area: { type: "string" }, monthly_budget: { type: "number" }, target_customer: { type: "string" }, campaign_goal: { type: "string" } }, required: [] } },
  business_brand_guide: { name: "business_brand_guide", description: "Brand identity guide for a new business — name, logo direction, color palette, typography, voice/tone, and brand standards for consistent marketing.", input_schema: { type: "object", properties: { business_name: { type: "string" }, business_type: { type: "string" }, target_customer: { type: "string" }, brand_personality: { type: "string" } }, required: [] } },
  business_social_media_strategy: { name: "business_social_media_strategy", description: "Social media strategy for a new business — platform selection, content pillars, posting schedule, growth tactics, content ideas by industry.", input_schema: { type: "object", properties: { business_name: { type: "string" }, business_type: { type: "string" }, target_customer: { type: "string" }, team_size: { type: "number" }, posting_frequency: { type: "string" } }, required: [] } },
  business_review_request_template: { name: "business_review_request_template", description: "Review request templates (SMS, email, in-person script) for any business plus a strategy for collecting and responding to Google, Yelp, and Facebook reviews.", input_schema: { type: "object", properties: { business_name: { type: "string" }, business_type: { type: "string" }, review_platform: { type: "string" }, service_description: { type: "string" } }, required: [] } },
  business_promo_campaign_generate: { name: "business_promo_campaign_generate", description: "Full promotional campaign for any business — offer, ad copy, social posts, email/SMS sequence, and success metrics. Grand openings, seasonal promos, service launches.", input_schema: { type: "object", properties: { business_name: { type: "string" }, business_type: { type: "string" }, campaign_name: { type: "string" }, offer: { type: "string" }, start_date: { type: "string" }, end_date: { type: "string" }, target_customer: { type: "string" }, channels: { type: "array", items: { type: "string", enum: ["Google Ads", "Facebook", "Instagram", "Email", "SMS", "Flyer/Poster", "Nextdoor", "LinkedIn"] } } }, required: ["offer"] } },
};

// Returns the tool_use schema array for a given agent, filtered to what they're allowed to call.
export function toolsForAgent(toolNames: string[]) {
  return toolNames.map(name => TOOL_DEFINITIONS[name]).filter(Boolean);
}