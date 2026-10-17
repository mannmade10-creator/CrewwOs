-- ============================================================
-- CrewOS — Supabase Schema (Section 5 of Master Build Document)
-- Run this in the Supabase SQL editor for the CrewOS project.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- workspaces ----------
create table if not exists workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  owner_id text not null,               -- Clerk user id
  plan text not null default 'starter'  -- starter | growth | enterprise | agency
    check (plan in ('starter','growth','enterprise','agency')),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_status text,                   -- trialing | active | past_due | canceled | ...
  created_at timestamptz not null default now()
);

-- Idempotent migration for deployments that already ran this schema before
-- Stripe billing was added — safe to re-run, no-ops if columns already exist.
-- (On a fresh install the table above already has these columns, so this
-- block simply finds nothing to do.)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'workspaces' and column_name = 'stripe_customer_id') then
    alter table workspaces add column stripe_customer_id text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'workspaces' and column_name = 'stripe_subscription_id') then
    alter table workspaces add column stripe_subscription_id text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'workspaces' and column_name = 'stripe_status') then
    alter table workspaces add column stripe_status text;
  end if;
end $$;

-- ---------- agents ----------
create table if not exists agents (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  slug text not null,               -- cto | pm | frontend | ...
  name text not null,
  role text not null,
  dept text not null check (dept in ('Engineering','Sales','Marketing','Operations')),
  persona text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

-- ---------- conversations ----------
create table if not exists conversations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  user_id text not null,             -- Clerk user id
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- tasks ----------
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  title text not null,
  status text not null default 'pending'
    check (status in ('pending','in_progress','done','failed')),
  result text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ---------- integrations ----------
-- `credentials` NEVER holds plaintext. lib/integrations.ts (via lib/crypto.ts)
-- writes it as an AES-256-GCM envelope: {"kv":1,"iv":"...","tag":"...","data":"..."}
-- — kv = key version, iv/tag/data are base64. The AAD binding is
-- `${workspace_id}:${provider}`, so a copied ciphertext won't decrypt
-- against a different workspace or provider even with the right key.
-- Never write to this column outside lib/integrations.ts.
create table if not exists integrations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  provider text not null,            -- supabase | vercel | twilio | resend | apollo | ...
  credentials jsonb not null default '{}'::jsonb,
  is_connected boolean not null default false,
  connected_at timestamptz,
  unique (workspace_id, provider)
);

-- ============================================================
-- Row Level Security — each workspace only sees its own rows.
-- Assumes the app sets request.jwt.claims with a workspace_id,
-- or filters explicitly in the service-role API layer.
-- These policies are the safety net if anon/public keys are
-- ever used from a client context.
-- ============================================================

alter table workspaces enable row level security;
alter table agents enable row level security;
alter table conversations enable row level security;
alter table tasks enable row level security;
alter table integrations enable row level security;

create policy "workspace_owner_select" on workspaces
  for select using (owner_id = auth.jwt() ->> 'sub');

create policy "agents_workspace_scoped" on agents
  for all using (
    workspace_id in (select id from workspaces where owner_id = auth.jwt() ->> 'sub')
  );

create policy "conversations_workspace_scoped" on conversations
  for all using (
    workspace_id in (select id from workspaces where owner_id = auth.jwt() ->> 'sub')
  );

create policy "tasks_workspace_scoped" on tasks
  for all using (
    workspace_id in (select id from workspaces where owner_id = auth.jwt() ->> 'sub')
  );

create policy "integrations_workspace_scoped" on integrations
  for all using (
    workspace_id in (select id from workspaces where owner_id = auth.jwt() ->> 'sub')
  );

-- ============================================================
-- Helper: current_user_role() pattern (same shape as BoxFlow OS)
-- Not strictly needed since CrewOS uses Clerk + owner_id scoping,
-- but kept for parity if you add a shared-seat role model later.
-- ============================================================

create or replace function current_workspace_ids()
returns setof uuid
language sql stable
security definer
as $$
  select id from workspaces where owner_id = auth.jwt() ->> 'sub';
$$;

-- ---------- report_configs ----------
-- Lets each workspace tell CrewOS which of ITS OWN tables/columns hold a
-- given business metric (e.g. "mrr" lives in the `subscriptions` table,
-- amount is `amount_cents`, dated by `created_at`). Without this, agents
-- like Dana (CFO) have no reliable way to know your schema — every
-- business runs different table names for the same concept.
create table if not exists report_configs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  metric text not null,              -- e.g. mrr, arr, user_growth
  table_name text not null,
  amount_column text,                -- nullable — some metrics are just row counts
  date_column text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, metric)
);

alter table report_configs enable row level security;
create policy "report_configs_workspace_scoped" on report_configs
  for all using (
    workspace_id in (select id from workspaces where owner_id = auth.jwt() ->> 'sub')
  );

-- ============================================================
-- Seed: Box Flow OS as Workspace #1 with all 19 agents.
-- Replace 'REPLACE_WITH_CLERK_USER_ID' before running.
-- ============================================================

insert into workspaces (name, slug, owner_id, plan)
values ('Box Flow OS', 'boxflowos', 'REPLACE_WITH_CLERK_USER_ID', 'enterprise')
on conflict (slug) do nothing;

-- Agents are seeded from the app via lib/agents.ts on first run
-- (see seedAgentsForWorkspace in lib/supabase.ts) rather than
-- hardcoded here, so persona text stays in one place in the code.
