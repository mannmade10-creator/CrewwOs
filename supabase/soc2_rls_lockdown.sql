-- =============================================================
-- Migration: soc2_rls_lockdown
-- Created: 2026-10-19
-- Purpose: Deny anon/authenticated direct table access.
-- All CrewwOS data goes through the service-role Next.js API layer
-- (Clerk auth + getWorkspace owner_id check). RLS is defense-in-depth.
-- =============================================================

-- 1. WORKSPACES
DROP POLICY IF EXISTS "service_role_all" ON public.workspaces;
CREATE POLICY "deny_direct_access" ON public.workspaces
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

-- 2. AGENTS
DROP POLICY IF EXISTS "deny_direct_access" ON public.agents;
CREATE POLICY "deny_direct_access" ON public.agents
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

-- 3. CONVERSATIONS
DROP POLICY IF EXISTS "deny_direct_access" ON public.conversations;
CREATE POLICY "deny_direct_access" ON public.conversations
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

-- 4. TASKS
DROP POLICY IF EXISTS "deny_direct_access" ON public.tasks;
CREATE POLICY "deny_direct_access" ON public.tasks
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

-- 5. INTEGRATIONS (stores encrypted API keys — highest sensitivity)
DROP POLICY IF EXISTS "deny_direct_access" ON public.integrations;
CREATE POLICY "deny_direct_access" ON public.integrations
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

-- 6. AUDIT_LOGS
DROP POLICY IF EXISTS "deny_direct_access" ON public.audit_logs;
CREATE POLICY "deny_direct_access" ON public.audit_logs
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

-- 7. NIA_CREDITS
DROP POLICY IF EXISTS "anon_deny_nia_credits" ON public.nia_credits;
DROP POLICY IF EXISTS "deny_direct_access" ON public.nia_credits;
CREATE POLICY "deny_direct_access" ON public.nia_credits
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

-- 8. CONTACT_LEADS: fix cross-tenant read vulnerability
-- The "Allow authenticated reads" policy had qual=true meaning ANY signed-in
-- user could SELECT every row (every client's leads) via the anon/service key.
DROP POLICY IF EXISTS "Allow authenticated reads" ON public.contact_leads;
DROP POLICY IF EXISTS "Allow public inserts" ON public.contact_leads;
DROP POLICY IF EXISTS "anon_insert_only" ON public.contact_leads;
DROP POLICY IF EXISTS "deny_reads" ON public.contact_leads;
-- Public forms can still INSERT (booking/contact forms); reads blocked.
CREATE POLICY "anon_insert_only" ON public.contact_leads
  AS PERMISSIVE FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "deny_reads" ON public.contact_leads
  AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (false);

-- 9. CRM_LEADS: block anon reads (authenticated reads already workspace-scoped by existing policy)
DROP POLICY IF EXISTS "deny_reads_to_anon" ON public.crm_leads;
CREATE POLICY "deny_reads_to_anon" ON public.crm_leads
  AS RESTRICTIVE FOR SELECT TO anon USING (false);

-- 10. NOTIFICATIONS
DROP POLICY IF EXISTS "deny_direct_access" ON public.notifications;
CREATE POLICY "deny_direct_access" ON public.notifications
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

-- 11. ORGANIZATIONS
DROP POLICY IF EXISTS "deny_direct_access" ON public.organizations;
CREATE POLICY "deny_direct_access" ON public.organizations
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

-- 12. SUBSCRIPTIONS
DROP POLICY IF EXISTS "deny_direct_access" ON public.subscriptions;
CREATE POLICY "deny_direct_access" ON public.subscriptions
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

-- 13. SUPPORT_TICKETS
DROP POLICY IF EXISTS "deny_direct_access" ON public.support_tickets;
CREATE POLICY "deny_direct_access" ON public.support_tickets
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

-- 14. SYSTEM_HEALTH
DROP POLICY IF EXISTS "deny_direct_access" ON public.system_health;
CREATE POLICY "deny_direct_access" ON public.system_health
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

-- 15. EDGE_DEVICES
DROP POLICY IF EXISTS "deny_direct_access" ON public.edge_devices;
CREATE POLICY "deny_direct_access" ON public.edge_devices
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

-- 16. APPOINTMENTS: keep anon INSERT (public booking forms); block reads
DROP POLICY IF EXISTS "deny_reads" ON public.appointments;
CREATE POLICY "deny_reads" ON public.appointments
  AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (false);

-- 17. Enable RLS + deny on remaining user data tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_access" ON public.orders;
CREATE POLICY "deny_direct_access" ON public.orders
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_access" ON public.profiles;
CREATE POLICY "deny_direct_access" ON public.profiles
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_access" ON public.referrals;
CREATE POLICY "deny_direct_access" ON public.referrals
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

ALTER TABLE public.saved_deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_access" ON public.saved_deals;
CREATE POLICY "deny_direct_access" ON public.saved_deals
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_access" ON public.user_subscriptions;
CREATE POLICY "deny_direct_access" ON public.user_subscriptions
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

-- 18. Enable RLS on di_* tables (sports data — currently no RLS at all)
ALTER TABLE public.di_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.di_parks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.di_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.di_pitcher_arsenals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.di_batter_pitch_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.di_batter_pitcher_h2h ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.di_batter_game_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.di_weather ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.di_odds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.di_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.di_parlays ENABLE ROW LEVEL SECURITY;
-- These are read-only sports data tables; anon reads are fine but explicit is better than implicit
CREATE POLICY "anon_read_only" ON public.di_games AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_only" ON public.di_parks AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_only" ON public.di_players AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_only" ON public.di_pitcher_arsenals AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_only" ON public.di_batter_pitch_splits AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_only" ON public.di_batter_pitcher_h2h AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_only" ON public.di_batter_game_log AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_only" ON public.di_weather AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_only" ON public.di_odds AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_only" ON public.di_picks AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_only" ON public.di_parlays AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);

-- 19. Revoke SELECT from anon/authenticated on sensitive tables
-- Belt-and-suspenders: removes GraphQL schema exposure even if a permissive policy slips in
REVOKE SELECT ON public.workspaces FROM anon, authenticated;
REVOKE SELECT ON public.agents FROM anon, authenticated;
REVOKE SELECT ON public.conversations FROM anon, authenticated;
REVOKE SELECT ON public.tasks FROM anon, authenticated;
REVOKE SELECT ON public.integrations FROM anon, authenticated;
REVOKE SELECT ON public.audit_logs FROM anon, authenticated;
REVOKE SELECT ON public.nia_credits FROM anon, authenticated;
REVOKE SELECT ON public.contact_leads FROM anon, authenticated;
REVOKE SELECT ON public.crm_leads FROM anon, authenticated;
REVOKE SELECT ON public.notifications FROM anon, authenticated;
REVOKE SELECT ON public.organizations FROM anon, authenticated;
REVOKE SELECT ON public.subscriptions FROM anon, authenticated;
REVOKE SELECT ON public.support_tickets FROM anon, authenticated;
REVOKE SELECT ON public.system_health FROM anon, authenticated;
REVOKE SELECT ON public.edge_devices FROM anon, authenticated;
REVOKE SELECT ON public.orders FROM anon, authenticated;
REVOKE SELECT ON public.profiles FROM anon, authenticated;
REVOKE SELECT ON public.referrals FROM anon, authenticated;
REVOKE SELECT ON public.saved_deals FROM anon, authenticated;
REVOKE SELECT ON public.user_subscriptions FROM anon, authenticated;
