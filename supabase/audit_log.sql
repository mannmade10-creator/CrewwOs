-- ============================================================
-- audit_log — written by lib/audit.ts, read by lib/security-scan.ts.
-- Run this in the Supabase SQL editor for the CrewOS project.
-- Safe to re-run.
-- ============================================================

create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade, -- null for events before a workspace is resolved
  actor_id text not null,            -- Clerk user id
  action text not null,              -- e.g. auth.access_denied, auth.rate_limited, integration.connect
  target text,
  metadata jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_workspace_created_idx on audit_log (workspace_id, created_at desc);

alter table audit_log enable row level security;

drop policy if exists "audit_log_workspace_scoped" on audit_log;
create policy "audit_log_workspace_scoped" on audit_log
  for select using (
    workspace_id in (select id from workspaces where owner_id = auth.jwt() ->> 'sub')
  );
