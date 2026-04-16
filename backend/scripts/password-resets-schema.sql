-- ChainShield: password_resets table for Supabase
-- Run this ONCE in Supabase dashboard -> SQL Editor

CREATE TABLE IF NOT EXISTS public.password_resets (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON public.password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON public.password_resets(expires_at);

ALTER TABLE public.password_resets DISABLE ROW LEVEL SECURITY;
