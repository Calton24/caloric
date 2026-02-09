-- Migration: Fix subscriptions table constraints and RLS policies
-- 
-- This migration corrects several issues:
-- 1. Removes redundant UNIQUE constraint (stripe_subscription_id is already UNIQUE)
-- 2. Makes stripe_customer_id nullable (user may not have customer ID before first subscription)
-- 3. Removes incorrect service_role RLS policy (service_role BYPASSES RLS by default in Supabase)
-- 4. Ensures authenticated users can ONLY SELECT their own subscriptions (no INSERT/UPDATE/DELETE)

-- =============================================================================
-- 1. Drop redundant unique constraint
-- =============================================================================
-- The stripe_subscription_id column is already UNIQUE, so UNIQUE(user_id, stripe_subscription_id)
-- is redundant and adds unnecessary index overhead.
ALTER TABLE public.subscriptions 
  DROP CONSTRAINT IF EXISTS unique_user_stripe_subscription;

-- =============================================================================
-- 2. Make stripe_customer_id nullable
-- =============================================================================
-- A user may exist in Supabase before they ever subscribe, in which case we won't
-- have a Stripe customer ID yet. Making this NOT NULL is brittle.
ALTER TABLE public.subscriptions 
  ALTER COLUMN stripe_customer_id DROP NOT NULL;

-- =============================================================================
-- 3. Fix RLS policies
-- =============================================================================
-- 
-- BACKGROUND:
-- In Supabase, the service_role key BYPASSES RLS entirely. This is by design.
-- Therefore, creating RLS policies for service_role is pointless and can cause confusion.
-- 
-- The existing "Service role can manage all subscriptions" policy:
-- - Uses USING clause for ALL operations, but INSERT requires WITH CHECK, not USING
-- - Is redundant since service_role bypasses RLS anyway
--
-- CORRECT APPROACH:
-- - Only create RLS policies for authenticated users
-- - Users can only SELECT their own subscriptions
-- - All writes happen via webhooks using service_role (bypasses RLS)

-- Drop the incorrect service role policy
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.subscriptions;

-- Drop and recreate user policy to ensure it's correct
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;

CREATE POLICY "Users can view their own subscriptions"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Explicitly deny INSERT/UPDATE/DELETE for authenticated users
-- (These are implicitly denied since no policies grant them, but being explicit is clearer)
-- No policy = no access for operations not covered by a policy when RLS is enabled

-- =============================================================================
-- 4. Verify grants are correct
-- =============================================================================
-- authenticated: SELECT only
-- service_role: ALL (bypasses RLS, uses direct grants)

-- Revoke any existing grants and reset to correct state
REVOKE ALL ON public.subscriptions FROM authenticated;
REVOKE ALL ON public.subscriptions FROM anon;

-- Grant SELECT only to authenticated users
GRANT SELECT ON public.subscriptions TO authenticated;

-- service_role already has full access via Supabase defaults, but be explicit
GRANT ALL ON public.subscriptions TO service_role;

-- =============================================================================
-- Add comment explaining the security model
-- =============================================================================
COMMENT ON TABLE public.subscriptions IS 
  'Subscription records synced from Stripe via webhooks. '
  'Users can only read their own subscriptions (RLS enforced). '
  'All writes happen via stripe-webhook Edge Function using service_role (bypasses RLS).';
