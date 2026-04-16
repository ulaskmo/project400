-- ChainShield: users table for Supabase
-- Run this ONCE in Supabase dashboard → SQL Editor → paste → Run

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('holder', 'issuer', 'verifier', 'admin')),
  did TEXT,
  organization_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Disable Row Level Security (backend uses service role key and handles auth itself)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
