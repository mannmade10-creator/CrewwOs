-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003 — campaigns table
-- Run AFTER 001 (set_updated_at) and 002 (leads + riley_drips)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.campaigns (
  id                  uuid        primary key default gen_random_uuid(),
  ref                 text        not null unique,
  client_name         text        not null,
  client_phone        text,
  description         text,
  status              text        not null default 'draft',
  mailers_sent        integer     not null default 0,
  qr_scans            integer     not null default 0,
  leads_count         integer     not null default 0,
  appointments_count  integer     not null default 0,
  revenue_cents       integer     not null default 0,
  cost_cents          integer     not null default 0,
  mailed_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger campaigns_updated_at
  before update on public.campaigns
  for each row execute procedure public.set_updated_at();

create index if not exists campaigns_ref_idx on public.campaigns (ref);
create index if not exists campaigns_status_idx on public.campaigns (status);

alter table public.campaigns enable row level security;

create policy "Service role full access"
  on public.campaigns
  for all
  using (true)
  with check (true);

-- RPC: safely increment a campaign stat counter
create or replace function public.increment_campaign_stat(
  p_ref    text,
  p_column text
)
returns void
language plpgsql
security definer
as $$
begin
  if p_column not in ('qr_scans', 'leads_count', 'appointments_count') then
    raise exception 'Invalid column: %', p_column;
  end if;

  execute format(
    'update public.campaigns set %I = %I + 1 where ref = $1',
    p_column, p_column
  ) using p_ref;
end;
$$;