-- ChainShield: W3C VC + Presentation Exchange schema
-- Run ONCE in Supabase dashboard -> SQL Editor.

-- Ed25519 keypairs for signing VCs and VPs
CREATE TABLE IF NOT EXISTS public.user_keys (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  public_key_hex TEXT NOT NULL,
  private_key_hex TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'Ed25519',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Presentation requests created by verifiers
CREATE TABLE IF NOT EXISTS public.presentation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verifier_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  verifier_did TEXT NOT NULL,
  verifier_name TEXT,
  purpose TEXT NOT NULL,
  required_types TEXT[] NOT NULL,
  required_fields JSONB,
  target_holder_did TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'fulfilled', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pex_requests_verifier ON public.presentation_requests(verifier_user_id);
CREATE INDEX IF NOT EXISTS idx_pex_requests_target ON public.presentation_requests(target_holder_did);

-- Holder responses containing signed Verifiable Presentations
CREATE TABLE IF NOT EXISTS public.presentation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.presentation_requests(id) ON DELETE CASCADE,
  holder_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  holder_did TEXT NOT NULL,
  vp_json JSONB NOT NULL,
  disclosed_fields JSONB,
  vp_signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
  vc_signatures_valid BOOLEAN NOT NULL DEFAULT FALSE,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pex_responses_request ON public.presentation_responses(request_id);
CREATE INDEX IF NOT EXISTS idx_pex_responses_holder ON public.presentation_responses(holder_user_id);

-- Signed VC proof attached to each credential (backward-compatible: optional)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS key_id TEXT;
