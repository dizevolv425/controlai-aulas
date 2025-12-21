-- Migration: 001_create_base_schema.sql
-- Descrição: Cria o schema base do sistema com todas as tabelas principais
-- Data: 2025-12-21

BEGIN;

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Criar enum para roles de usuário
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('master', 'admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar enum para status de empresa
DO $$ BEGIN
  CREATE TYPE empresa_status AS ENUM ('active', 'suspended', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar enum para status de perfil
DO $$ BEGIN
  CREATE TYPE perfil_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar enum para status de conversa
DO $$ BEGIN
  CREATE TYPE conversa_status AS ENUM ('active', 'archived', 'deleted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABELA: planos
-- Armazena os planos de assinatura disponíveis
-- ============================================================================
CREATE TABLE IF NOT EXISTS planos (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(50) NOT NULL,
  preco_mensal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  max_usuarios INTEGER NOT NULL DEFAULT 1,
  max_agentes INTEGER NOT NULL DEFAULT 1,
  limite_mensagens_mes INTEGER NOT NULL DEFAULT 100,
  stripe_price_id VARCHAR(255) UNIQUE,
  features JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  cor VARCHAR(7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para planos
CREATE INDEX IF NOT EXISTS idx_planos_stripe_price_id ON planos(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_planos_is_active ON planos(is_active);

-- ============================================================================
-- TABELA: empresas (Tenants)
-- Armazena as empresas que usam a plataforma (multi-tenant)
-- ============================================================================
CREATE TABLE IF NOT EXISTS empresas (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  plano_id BIGINT NOT NULL REFERENCES planos(id) ON DELETE RESTRICT,
  chave_api_llm TEXT, -- Será criptografada via pgcrypto ou Supabase Vault
  contexto_ia JSONB DEFAULT '{}'::jsonb,
  stripe_customer_id VARCHAR(255) UNIQUE,
  email VARCHAR(255),
  telefone VARCHAR(20),
  endereco TEXT,
  status empresa_status DEFAULT 'active',
  data_adesao TIMESTAMPTZ DEFAULT NOW(),
  proxima_cobranca TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para empresas (crítico para performance RLS)
CREATE INDEX IF NOT EXISTS idx_empresas_plano_id ON empresas(plano_id);
CREATE INDEX IF NOT EXISTS idx_empresas_stripe_customer_id ON empresas(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_empresas_status ON empresas(status);
CREATE INDEX IF NOT EXISTS idx_empresas_is_active ON empresas(is_active);

-- ============================================================================
-- TABELA: perfis (Colaboradores/Usuários)
-- Armazena os perfis dos usuários vinculados às empresas
-- id referencia auth.users.id (FK para Supabase Auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS perfis (
  id BIGINT PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  email VARCHAR(255) NOT NULL,
  nome_completo VARCHAR(255),
  telefone VARCHAR(20),
  cargo VARCHAR(100),
  status perfil_status DEFAULT 'active',
  ultimo_acesso TIMESTAMPTZ,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para perfis (crítico para performance RLS)
CREATE INDEX IF NOT EXISTS idx_perfis_empresa_id ON perfis(empresa_id);
CREATE INDEX IF NOT EXISTS idx_perfis_role ON perfis(role);
CREATE INDEX IF NOT EXISTS idx_perfis_status ON perfis(status);
CREATE INDEX IF NOT EXISTS idx_perfis_email ON perfis(email);

-- ============================================================================
-- TABELA: agentes_ia
-- Armazena os agentes IA customizados por empresa
-- ============================================================================
CREATE TABLE IF NOT EXISTS agentes_ia (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  instrucoes TEXT NOT NULL, -- System prompt
  icone_url TEXT,
  descricao TEXT,
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  cor VARCHAR(7),
  created_by BIGINT REFERENCES perfis(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para agentes_ia
CREATE INDEX IF NOT EXISTS idx_agentes_ia_empresa_id ON agentes_ia(empresa_id);
CREATE INDEX IF NOT EXISTS idx_agentes_ia_is_active ON agentes_ia(is_active);
CREATE INDEX IF NOT EXISTS idx_agentes_ia_is_popular ON agentes_ia(is_popular);

-- ============================================================================
-- TABELA: conversas (Histórico de Chats)
-- Armazena o histórico de conversas dos usuários com os agentes IA
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversas (
  id BIGSERIAL PRIMARY KEY,
  conversation_uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
  empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  agente_id BIGINT NOT NULL REFERENCES agentes_ia(id) ON DELETE RESTRICT,
  mensagens JSONB DEFAULT '[]'::jsonb,
  titulo VARCHAR(255),
  tokens_usados INTEGER DEFAULT 0,
  status conversa_status DEFAULT 'active',
  contexto_atual JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para conversas
CREATE INDEX IF NOT EXISTS idx_conversas_empresa_id ON conversas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_conversas_user_id ON conversas(user_id);
CREATE INDEX IF NOT EXISTS idx_conversas_agente_id ON conversas(agente_id);
CREATE INDEX IF NOT EXISTS idx_conversas_conversation_uuid ON conversas(conversation_uuid);
CREATE INDEX IF NOT EXISTS idx_conversas_status ON conversas(status);
CREATE INDEX IF NOT EXISTS idx_conversas_created_at ON conversas(created_at DESC);

-- ============================================================================
-- TABELA: uso_recursos (Controle de Limites)
-- Armazena o uso de recursos por empresa por mês
-- ============================================================================
CREATE TABLE IF NOT EXISTS uso_recursos (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  mes_referencia DATE NOT NULL DEFAULT DATE_TRUNC('month', NOW())::DATE,
  mensagens_enviadas INTEGER DEFAULT 0,
  tokens_consumidos INTEGER DEFAULT 0,
  agentes_ativos INTEGER DEFAULT 0,
  usuarios_ativos INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, mes_referencia)
);

-- Índices para uso_recursos
CREATE INDEX IF NOT EXISTS idx_uso_recursos_empresa_id ON uso_recursos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_uso_recursos_mes_referencia ON uso_recursos(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_uso_recursos_empresa_mes ON uso_recursos(empresa_id, mes_referencia);

-- ============================================================================
-- TABELA: auditoria (Logs de Ações Administrativas)
-- Armazena logs de todas as ações administrativas
-- ============================================================================
CREATE TABLE IF NOT EXISTS auditoria (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES perfis(id) ON DELETE SET NULL,
  empresa_id BIGINT REFERENCES empresas(id) ON DELETE SET NULL,
  acao VARCHAR(255) NOT NULL,
  entidade_tipo VARCHAR(100),
  entidade_id BIGINT,
  detalhes JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para auditoria
CREATE INDEX IF NOT EXISTS idx_auditoria_user_id ON auditoria(user_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_empresa_id ON auditoria(empresa_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_acao ON auditoria(acao);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidade_tipo ON auditoria(entidade_tipo);
CREATE INDEX IF NOT EXISTS idx_auditoria_created_at ON auditoria(created_at DESC);

-- ============================================================================
-- FUNÇÕES AUXILIARES
-- ============================================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_planos_updated_at
  BEFORE UPDATE ON planos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON empresas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_perfis_updated_at
  BEFORE UPDATE ON perfis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agentes_ia_updated_at
  BEFORE UPDATE ON agentes_ia
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversas_updated_at
  BEFORE UPDATE ON conversas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_uso_recursos_updated_at
  BEFORE UPDATE ON uso_recursos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

