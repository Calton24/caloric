-- Android waitlist for CalCut marketing site
-- Public inserts via anon key; no public reads
-- Also mirrored in ../../supabase/migrations/20260708120000_create_android_waitlist.sql

CREATE TABLE IF NOT EXISTS public.android_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  fitness_goal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT android_waitlist_email_unique UNIQUE (email),
  CONSTRAINT android_waitlist_fitness_goal_check
    CHECK (
      fitness_goal IS NULL
      OR fitness_goal IN (
        'lose_fat',
        'maintain',
        'build_muscle',
        'improve_habits'
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_android_waitlist_created_at
  ON public.android_waitlist (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_android_waitlist_email_lower
  ON public.android_waitlist (lower(email));

ALTER TABLE public.android_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join the Android waitlist"
  ON public.android_waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(trim(name)) BETWEEN 1 AND 120
    AND char_length(trim(email)) BETWEEN 3 AND 254
    AND position('@' in email) > 1
  );

GRANT INSERT ON public.android_waitlist TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.android_waitlist TO service_role;
