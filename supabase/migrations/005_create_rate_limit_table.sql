-- Migration: 005_create_rate_limit_table.sql
-- Descrição: Cria tabela para controle de rate limiting (100 req/min por empresa)
-- Data: 2025-01-XX

BEGIN;

-- ============================================================================
-- TABELA: rate_limits
-- Controla o rate limiting por empresa e endpoint
-- ============================================================================
CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  requests_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Uma empresa pode ter apenas um registro por endpoint por janela de tempo
  UNIQUE(empresa_id, endpoint, window_start)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_empresa_endpoint ON rate_limits(empresa_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- Função para limpar registros antigos (janelas de mais de 1 minuto)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE rate_limits IS 'Controla rate limiting por empresa e endpoint (100 req/min)';
COMMENT ON COLUMN rate_limits.empresa_id IS 'ID da empresa (tenant)';
COMMENT ON COLUMN rate_limits.endpoint IS 'Endpoint da API (ex: chat-session, invoke-llm)';
COMMENT ON COLUMN rate_limits.requests_count IS 'Número de requisições na janela atual';
COMMENT ON COLUMN rate_limits.window_start IS 'Início da janela de tempo (resetado a cada minuto)';

COMMIT;

