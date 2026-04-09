-- ERP Row Level Security — clean slate + role-based policies
-- Run in Supabase SQL Editor or via: supabase db push / migration apply
--
-- Prerequisites: profiles.id = auth.users.id; role stored in profiles.role.
-- Helper get_user_role() is SECURITY DEFINER so policies can read role without RLS recursion.

-- =============================================================================
-- 1) Drop existing policies (clean slate)
-- =============================================================================

-- profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_users_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_insert" ON public.profiles;

-- orders
DROP POLICY IF EXISTS "orders_select_finance" ON public.orders;
DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
DROP POLICY IF EXISTS "orders_finance_select" ON public.orders;
DROP POLICY IF EXISTS "orders_viewer_select" ON public.orders;

-- customers
DROP POLICY IF EXISTS "customers_select_finance" ON public.customers;
DROP POLICY IF EXISTS "customers_admin_all" ON public.customers;
DROP POLICY IF EXISTS "customers_finance_select" ON public.customers;

-- inventory
DROP POLICY IF EXISTS "inventory_select_wh" ON public.inventory;
DROP POLICY IF EXISTS "inventory_admin_all" ON public.inventory;
DROP POLICY IF EXISTS "inventory_warehouse_select" ON public.inventory;

-- shopify_events
DROP POLICY IF EXISTS "shopify_events_admin" ON public.shopify_events;
DROP POLICY IF EXISTS "shopify_events_admin_all" ON public.shopify_events;

-- invite_log
DROP POLICY IF EXISTS "invite_log_admin" ON public.invite_log;
DROP POLICY IF EXISTS "invite_log_admin_all" ON public.invite_log;
DROP POLICY IF EXISTS "invite_log_user_select_own" ON public.invite_log;

-- sync_logs
DROP POLICY IF EXISTS "sync_logs_admin" ON public.sync_logs;
DROP POLICY IF EXISTS "sync_logs_admin_all" ON public.sync_logs;

-- =============================================================================
-- 2) Helper: current user's role from profiles (avoids repeating subqueries)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

COMMENT ON FUNCTION public.get_user_role() IS
  'Returns profiles.role for auth.uid(); SECURITY DEFINER to avoid RLS recursion on profiles.';

-- =============================================================================
-- 3) Enable RLS on all tables
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 4) profiles — own read; admin read all / update any / insert (invites)
-- =============================================================================

-- Logged-in users can read exactly their profile row.
CREATE POLICY "profiles_users_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admins can read every profile row.
CREATE POLICY "profiles_admin_select_all"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.get_user_role() = 'admin');

-- Admins may update any profile (e.g. change roles).
CREATE POLICY "profiles_admin_update"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Admins may insert profiles (e.g. invite pipeline).
CREATE POLICY "profiles_admin_insert"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role() = 'admin');

-- =============================================================================
-- 5) orders — admin full; finance + viewer SELECT; warehouse none
-- =============================================================================

-- Admins: SELECT, INSERT, UPDATE, DELETE.
CREATE POLICY "orders_admin_all"
  ON public.orders
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Finance: read-only.
CREATE POLICY "orders_finance_select"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (public.get_user_role() = 'finance');

-- Viewer: read-only (dashboard aggregates / counts).
CREATE POLICY "orders_viewer_select"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (public.get_user_role() = 'viewer');

-- =============================================================================
-- 6) customers — admin full; finance SELECT; warehouse + viewer none
-- =============================================================================

CREATE POLICY "customers_admin_all"
  ON public.customers
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "customers_finance_select"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (public.get_user_role() = 'finance');

-- =============================================================================
-- 7) inventory — admin full; warehouse SELECT; finance + viewer none
-- =============================================================================

CREATE POLICY "inventory_admin_all"
  ON public.inventory
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "inventory_warehouse_select"
  ON public.inventory
  FOR SELECT
  TO authenticated
  USING (public.get_user_role() = 'warehouse');

-- =============================================================================
-- 8) shopify_events — admin only (full access)
-- =============================================================================

CREATE POLICY "shopify_events_admin_all"
  ON public.shopify_events
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- =============================================================================
-- 9) invite_log — admin full; users read rows for their JWT email
-- =============================================================================

CREATE POLICY "invite_log_admin_all"
  ON public.invite_log
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Invited user can see invite rows where email matches JWT email (auth.email() deprecated; use jwt claim).
CREATE POLICY "invite_log_user_select_own"
  ON public.invite_log
  FOR SELECT
  TO authenticated
  USING (
    lower(trim(email)) = lower(trim(coalesce((auth.jwt() ->> 'email'), '')))
    AND (auth.jwt() ->> 'email') IS NOT NULL
    AND (auth.jwt() ->> 'email') <> ''
  );

-- =============================================================================
-- 10) sync_logs — admin only (full access)
-- =============================================================================

CREATE POLICY "sync_logs_admin_all"
  ON public.sync_logs
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');
