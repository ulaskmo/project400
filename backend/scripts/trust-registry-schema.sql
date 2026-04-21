-- ChainShield: Trust Registry migration
-- Adds trust_level column to users table.
-- Run ONCE in Supabase dashboard -> SQL Editor.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS trust_level TEXT NOT NULL DEFAULT 'unverified'
  CHECK (trust_level IN ('unverified', 'verified', 'accredited'));

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS trust_note TEXT;

CREATE INDEX IF NOT EXISTS idx_users_trust_level ON public.users(trust_level);
