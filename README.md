# CrewOS — Phase 1 & 3 Foundation

This is the backend foundation for CrewOS per the Master Build Document:
Phase 1 (foundation) and Phase 3 (agent tools), plus the schema from Section 5
and the routes from Section 6.

## What's here

```
supabase/schema.sql          Section 5 — 5 tables + RLS, run in the SQL editor
lib/agents.ts                Section 2 — 19 agent personas + which tools each can call
lib/tools.ts                 Claude tool_use schemas, one per Section 6 route
lib/tool-executors.ts        The real logic behind each tool (Supabase/Vercel/Resend/
                              Twilio/Apollo/Reply.io/GitHub calls against the CLIENT's
                              connected integrations, not CrewOS's own DB)
lib/supabase.ts              CrewOS's own DB — workspace lookup, agent seeding, task logging
lib/claude.ts                 Anthropic client + model constant
lib/route-helpers.ts         Shared auth + workspace resolution for the standalone routes
middleware.ts                Clerk auth on every route except sign-in/sign-up
app/api/agent-chat/route.ts  Main chat endpoint — full tool_use loop
app/api/broadcast/route.ts   All-hands broadcast (Section 6, no tool execution)
app/api/tools/**/route.ts    The 11 standalone tool routes from Section 6
```

## Phase 2 — Virtual Office UI (now included)

```
app/layout.tsx                  Root layout + ClerkProvider
app/page.tsx                    Landing page, redirects signed-in users to /dashboard
app/sign-in, app/sign-up        Clerk auth pages
app/dashboard/page.tsx          Server component — resolves the workspace, renders VirtualOffice
components/office/VirtualOffice.tsx   Office floor, top bar, right panel — the main screen
components/office/AgentAvatar.tsx    Wandering agent avatar (positions live here, not in lib/agents.ts)
components/office/DeptZone.tsx       Department floor zone outline + label
components/office/ActivityFeed.tsx   Live task log
components/dashboard/BroadcastBar.tsx  All-hands input, calls /api/broadcast
components/dashboard/AgentRoster.tsx   Team list panel, shows each agent's tool access
components/chat/ChatWindow.tsx       Per-agent chat, calls /api/agent-chat (the real tool_use loop)
components/chat/ToolResultCard.tsx   Renders a tool call's input/output inline in the chat
```

This replaces the client-side "call Anthropic directly from the browser" pattern
from the `crewos-command-center.jsx` prototype — the API key now stays server-side,
every message goes through Clerk auth, and tool calls actually execute against the
workspace's connected integrations instead of just describing what they'd do.

## Credential encryption (now included)

```
lib/crypto.ts          AES-256-GCM envelope encryption + key-version support
lib/integrations.ts     The ONLY module that reads/writes integrations.credentials
app/api/integrations/route.ts              GET — connection status only, never credentials
app/api/integrations/connect/route.ts      POST — accepts plaintext once, encrypts immediately
app/api/integrations/disconnect/route.ts   POST — wipes ciphertext, doesn't just flip a flag
```

**How it works:** every credential blob is encrypted with AES-256-GCM before
it touches the database. The additional authenticated data (AAD) is
`${workspace_id}:${provider}`, so even with the encryption key and raw
database access, a ciphertext copied from one row can't be decrypted as a
different workspace's or provider's credentials — GCM's auth tag fails the
swap. `lib/tool-executors.ts` and every other module in the app only ever
sees decrypted credentials in memory, momentarily, inside a single function
call — never in a variable that outlives the request, never logged.

**Setup:**
1. `openssl rand -base64 32` → set as `CREDENTIALS_ENCRYPTION_KEY`.
2. Store that key somewhere durable outside Vercel too (password manager,
   secrets vault) — if it's lost, every stored integration credential
   becomes permanently undecryptable, not just inaccessible.
3. Never commit it, never log `req.body` on the `/api/integrations/*`
   routes, and don't add generic request-logging middleware in front of them.

**Honest limitations of this approach**, so you know what you're trading off:
- This is envelope encryption with a single app-level key, not a full KMS.
  Anyone with your `CREDENTIALS_ENCRYPTION_KEY` env var *and* database
  access can decrypt everything. A real KMS (AWS KMS, GCP KMS) or Supabase
  Vault (pgsodium) separates "can read the encrypted blob" from "can ask
  the key service to decrypt it" — worth migrating to once you're storing
  real customer credentials beyond your own Box Flow OS workspace.
- Key rotation is supported in the code (`lib/crypto.ts`'s `kv` field, add
  `CREDENTIALS_ENCRYPTION_KEY_V2` and bump `CURRENT_KEY_VERSION`) but old
  rows only get re-encrypted under the new key the next time they're
  written via `setIntegrationCredentials` — there's no batch re-encryption
  job yet.
- The authorization model is "whoever owns the workspace in Clerk can
  connect/disconnect anything for it." There's no separate admin-vs-viewer
  distinction yet on these specific routes (Section 11 describes that role
  model for the app generally — worth applying here specifically before
  you invite anyone else into a workspace).

## Integrations page (now included)

```
lib/integration-fields.ts               Client-safe form metadata — field keys match what
                                         tool-executors.ts reads (creds.url, creds.api_key, etc.)
components/integrations/IntegrationsView.tsx   Real connect/disconnect UI, no local toggle state
app/dashboard/integrations/page.tsx     Resolves the workspace, renders IntegrationsView
components/dashboard/DashboardShell.tsx  Shared top bar + Office/Integrations/Reports nav
app/dashboard/layout.tsx                 Resolves workspace once, wraps all /dashboard pages
```

Connecting a tool now actually calls `/api/integrations/connect` — you fill in
real credentials in the card, they're encrypted server-side before the first
write (see the encryption section above), and the card never displays a saved
value back to you. Disconnecting calls `/api/integrations/disconnect`, which
wipes the stored ciphertext. Status badges come from a real `GET /api/integrations`
call, not local component state, so a refresh shows the true state of the workspace.

The top bar and nav (Office / Integrations / Reports) were pulled out of
`VirtualOffice` into `DashboardShell` so all three pages share one header
instead of each page reimplementing it.

## Reports dashboard (now included)

```
supabase/schema.sql (report_configs table)  Per-workspace metric → table/column mapping
lib/reports.ts                              getTaskSummary (CrewOS's own data, no setup needed)
                                             + getMetricSeries/getReportConfig/setReportConfig
                                             (queries the CLIENT's own connected Supabase)
app/api/reports/tasks-summary/route.ts      GET — task counts by day/department
app/api/reports/metric/route.ts             GET — a configured metric's time series
app/api/reports/config/route.ts             GET/POST — the table/column mapping itself
components/reports/ReportsView.tsx          Real charts (recharts), no mock data
components/reports/MetricConfigForm.tsx     Inline form shown when a metric isn't mapped yet
```

**Two different data sources, on purpose:** "Tasks completed" and "Tasks by
department" are always populated — they come straight from CrewOS's own
`tasks` table, which every tool call already writes to via `logTask()`. No
setup required.

MRR (and any other business metric you add) is different: CrewOS has no way
to guess that your revenue lives in a table called `subscriptions` with an
`amount_cents` column versus something else entirely — every business's
schema is different. So the first time you open Reports, you'll see an
inline form asking for the table name, the date column, and (optionally) an
amount column. That gets saved to `report_configs` and from then on the
chart queries your connected Supabase project directly, live. The same
`getMetricSeries()` function backs both this dashboard and the CFO agent's
`reports_generate` tool call, so what Dana tells you in chat and what the
dashboard shows come from the same query.

## Stripe billing (now included)

```
lib/stripe.ts                      Stripe client (server-only!) + price ID mapping + status helper
lib/plans.ts                       Client-safe plan display copy — no SDK, no secrets, safe in the browser
lib/billing.ts                     getOrCreateStripeCustomer, syncWorkspaceSubscription, planFromPriceId
app/api/billing/checkout/route.ts  POST — creates a Checkout Session, returns { url } to redirect to
app/api/billing/portal/route.ts    POST — creates a Billing Portal session for managing/canceling
app/api/billing/webhook/route.ts   POST — Stripe calls this directly; verifies signature, is the
                                    ONLY place workspace plan/status get written
components/settings/BillingCard.tsx  Current plan, all 4 plans, upgrade buttons, "Manage billing"
app/dashboard/settings/page.tsx    Settings page hosting BillingCard
```

**Why the webhook, not the checkout route, updates the database:** the
checkout route only ever returns a redirect URL — it never writes
`plan`/`stripe_status` itself, because the browser redirect to Stripe
succeeding doesn't mean the payment succeeded. Only Stripe confirming via
webhook (`checkout.session.completed`, then `customer.subscription.updated`/
`.deleted` for anything that happens later — upgrades, downgrades, failed
payments, cancellations) is trusted to change what a workspace is billed for
and which plan's `agents`/`tools` a workspace should have access to.

**Plan gating:** enforced separately — see the "Plan-based gating" section
below for how `workspace.plan` actually restricts agent and integration
access.

**Setup:**
1. Create 4 recurring monthly Prices in the Stripe dashboard (or via the
   API) — one per plan in Section 12 — and set their IDs as
   `STRIPE_PRICE_STARTER` / `_GROWTH` / `_ENTERPRISE` / `_AGENCY`.
2. Add a webhook endpoint in the Stripe dashboard pointed at
   `https://yourapp.com/api/billing/webhook`, listening for
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Copy its signing secret into
   `STRIPE_WEBHOOK_SECRET`.
3. For local development, use `stripe listen --forward-to localhost:3000/api/billing/webhook`
   instead of a dashboard-configured endpoint.

## Plan-based gating (now included — closes the gap flagged above)

```
lib/plans.ts                        Client-safe: AGENT_PRIORITY_ORDER, PLAN_AGENT_LIMITS,
                                     PLAN_INTEGRATION_LIMITS, agentsAllowedForPlan(),
                                     isAgentAllowedForPlan(), integrationLimitForPlan()
```

**Agents** (Section 12: Starter 5 / Growth 12 / Enterprise & Agency all):
`AGENT_PRIORITY_ORDER` ranks agents leadership-and-revenue-first (CTO, COO,
VP Sales, CMO, CFO unlock first; specialized/support roles like Legal and
Designer unlock last). `agentsAllowedForPlan()` is the single source of
truth for "which agents can this workspace use," and it's enforced in three
places that all had to agree:
- **`app/api/agent-chat/route.ts`** — rejects a message to a locked agent
  with a 403 before it ever reaches Claude, so no tokens get spent on a
  request that shouldn't succeed.
- **`app/api/broadcast/route.ts`** — locked agents get a static "🔒 upgrade
  to unlock" reply instead of an actual API call.
- **The UI** (`AgentAvatar`, `AgentRoster`, `ChatWindow`) — locked agents
  render grayed-out with a lock badge, and opening a locked agent's chat
  shows an upgrade prompt instead of an input box, so the person never
  gets to type a message that would just bounce off the server anyway.

**Integrations** (Starter 2 / Growth 5 / Enterprise & Agency unlimited):
enforced in `app/api/integrations/connect/route.ts` — counts currently
connected integrations and rejects a *new* connection past the limit
(reconnecting/updating an already-connected one is never blocked). The
Integrations page shows a live `3/5 connected` counter and swaps the
"Connect" button for an "Upgrade to connect" link once the limit is hit.

**One thing worth knowing:** `AGENT_PRIORITY_ORDER` is an opinionated
business call I made (which 5 agents matter most on Starter), not something
derived from the master doc — Section 12 specifies the *counts* per plan
but not which specific agents. Revisit the ordering if your actual sales
conversations suggest a different set of agents should be the "starter"
experience.

## Multi-workspace routing + onboarding (now included)

```
app/dashboard/page.tsx                Redirects to your first workspace, or /onboarding if you have none
app/dashboard/[slug]/layout.tsx       Resolves the workspace from the URL, doubles as the ownership check
app/dashboard/[slug]/page.tsx         Office (was app/dashboard/page.tsx)
app/dashboard/[slug]/integrations/    Integrations (was app/dashboard/integrations/)
app/dashboard/[slug]/reports/         Reports (was app/dashboard/reports/)
app/dashboard/[slug]/settings/        Settings (was app/dashboard/settings/)
lib/workspaces.ts                     listWorkspacesForUser, createWorkspace (slugify + uniqueness + agent seeding)
app/api/workspaces/route.ts           GET — powers the workspace switcher dropdown
app/api/workspaces/create/route.ts    POST — used by onboarding
app/onboarding/page.tsx +
components/onboarding/OnboardingWizard.tsx   Name a workspace → seeded on Starter → nudge to
                                              connect a tool or go straight to the office
components/dashboard/DashboardShell.tsx      Now has a real workspace switcher dropdown
```

Every workspace-scoped route lives under `/dashboard/{slug}/...` now, and
`getWorkspace(slug, ownerId)` filtering by `owner_id` is what makes the
`[slug]/layout.tsx` check double as authorization — a slug that exists but
belongs to someone else 404s rather than leaking that it exists. Box Flow
OS itself is no longer hardcoded anywhere in the routing; it's just the
first workspace that happens to exist from the schema seed, findable like
any other through the switcher.

**One thing to know:** `createWorkspace()` always starts a new workspace on
Starter with no Stripe subscription yet — there's no "pick a plan and pay"
step baked into onboarding itself. The wizard nudges toward connecting a
tool or going straight to the office; upgrading happens afterward from
Settings. If you want payment required *before* a workspace is usable,
that's a real behavior change worth deciding on deliberately, not something
to bolt on quietly.

## What's NOT here yet

- Payment-gated onboarding (see the note above).
- Only one metric (`mrr`) has a Reports config form built; `arr`/`user_growth`
  are mechanical to add — same `MetricConfigForm`, different `metric` prop.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in CrewOS's own Anthropic,
   Supabase, and Clerk keys.
3. Run `supabase/schema.sql` in the CrewOS Supabase project's SQL editor.
   Replace `REPLACE_WITH_CLERK_USER_ID` with your real Clerk user id first.
4. On first login, call `seedAgentsForWorkspace(workspace.id)` (from
   `lib/supabase.ts`) once per new workspace to populate the `agents` table
   from `lib/agents.ts`.
5. For Box Flow OS specifically: add rows to `integrations` for each tool
   you want agents to actually use (Supabase, Vercel, Resend, Twilio, GitHub
   are the ones already marked connected in the frontend prototype) with
   real credentials, `is_connected = true`.
6. `npm run dev`.

## How a tool call actually flows

1. You message an agent (e.g. Kai the SDR) through `/api/agent-chat`.
2. Claude decides to call `leads_search`.
3. The route looks up Box Flow OS's Apollo.io credentials from `integrations`,
   calls Apollo's real API, and feeds the result back to Claude.
4. Claude replies in character with the actual leads found.
5. The call is logged to `tasks` for the activity feed / audit trail.

Every tool call is workspace-scoped — an agent can never reach another
client's data, because every executor takes `workspace_id` and looks up
that workspace's own encrypted credentials.
