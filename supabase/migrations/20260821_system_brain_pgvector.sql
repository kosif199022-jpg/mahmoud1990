-- KOSIF system brain: server-only vector memory and audit telemetry.
-- Based on the supplied pgvector draft, hardened so financial embeddings are never public-readable.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.kosif_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding VECTOR(768) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kosif_embeddings_hnsw
  ON public.kosif_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE TABLE IF NOT EXISTS public.kosif_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'rejected')),
  execution_time_ms INTEGER NOT NULL CHECK (execution_time_ms >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.match_kosif_embeddings(
  query_embedding VECTOR(768),
  match_threshold DOUBLE PRECISION DEFAULT 0.70,
  match_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    ke.id,
    ke.content,
    ke.metadata,
    1 - (ke.embedding <=> query_embedding) AS similarity
  FROM public.kosif_embeddings AS ke
  WHERE 1 - (ke.embedding <=> query_embedding) >= match_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 50);
$$;

ALTER TABLE public.kosif_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kosif_audit_logs ENABLE ROW LEVEL SECURITY;

-- Intentionally no anon/authenticated policies. Access goes through trusted Edge/server services.
REVOKE ALL ON public.kosif_embeddings FROM anon, authenticated;
REVOKE ALL ON public.kosif_audit_logs FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.match_kosif_embeddings(VECTOR, DOUBLE PRECISION, INTEGER) FROM PUBLIC;

COMMENT ON TABLE public.kosif_embeddings IS 'Server-only KOSIF vector memory; do not expose directly to browsers.';
COMMENT ON TABLE public.kosif_audit_logs IS 'Immutable-style execution telemetry written by trusted KOSIF services.';
