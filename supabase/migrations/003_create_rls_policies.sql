-- Migration: 003_create_rls_policies.sql
-- Descrição: Implementa políticas Row-Level Security (RLS) em todas as tabelas
-- Data: 2025-12-21

BEGIN;

-- ============================================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================================

ALTER TABLE planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentes_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE uso_recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FUNÇÃO AUXILIAR: Obter empresa_id do usuário autenticado
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_empresa_id()
RETURNS BIGINT AS $$
  SELECT empresa_id FROM perfis WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- FUNÇÃO AUXILIAR: Obter role do usuário autenticado
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS user_role AS $$
  SELECT role FROM perfis WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- POLÍTICAS RLS: planos
-- ============================================================================

-- SELECT: Todos podem ver planos ativos
CREATE POLICY "planos_select_active"
  ON planos FOR SELECT
  USING (is_active = true);

-- INSERT/UPDATE/DELETE: Apenas via service_role (Edge Functions)

-- ============================================================================
-- POLÍTICAS RLS: empresas
-- ============================================================================

-- SELECT: Usuário deve ter perfil vinculado à empresa
CREATE POLICY "empresas_select_own"
  ON empresas FOR SELECT
  USING (
    id IN (
      SELECT empresa_id FROM perfis WHERE id = auth.uid()
    )
  );

-- UPDATE: Apenas role admin ou master da própria empresa
CREATE POLICY "empresas_update_admin_master"
  ON empresas FOR UPDATE
  USING (
    id IN (
      SELECT empresa_id FROM perfis 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'master')
    )
  );

-- INSERT: Apenas via Edge Function (service_role)
-- Não criamos política INSERT para usuários comuns

-- ============================================================================
-- POLÍTICAS RLS: perfis
-- ============================================================================

-- SELECT: Usuário pode ver próprio perfil e perfis da própria empresa
-- Usa a função auxiliar para evitar recursão infinita
CREATE POLICY "perfis_select_own_empresa"
  ON perfis FOR SELECT
  USING (
    id = auth.uid() -- Pode sempre ver próprio perfil (evita recursão)
    OR empresa_id = user_empresa_id() -- Pode ver perfis da mesma empresa
  );

-- UPDATE: Usuário pode atualizar próprio perfil; admin pode atualizar qualquer perfil da empresa
CREATE POLICY "perfis_update_own"
  ON perfis FOR UPDATE
  USING (
    id = auth.uid() -- Pode atualizar próprio perfil
    OR (
      empresa_id IN (
        SELECT empresa_id FROM perfis WHERE id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM perfis 
        WHERE id = auth.uid() 
        AND role = 'admin'
      )
    ) -- Admin pode atualizar perfis da própria empresa
  );

-- INSERT: Apenas via Edge Function (service_role)
-- Não criamos política INSERT para usuários comuns

-- ============================================================================
-- POLÍTICAS RLS: agentes_ia
-- ============================================================================

-- SELECT: Usuários da empresa podem ver agentes ativos
CREATE POLICY "agentes_ia_select_own_empresa"
  ON agentes_ia FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM perfis WHERE id = auth.uid()
    )
    AND is_active = true
  );

-- INSERT: Apenas role admin da empresa
CREATE POLICY "agentes_ia_insert_admin"
  ON agentes_ia FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM perfis 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- UPDATE: Apenas role admin da empresa
CREATE POLICY "agentes_ia_update_admin"
  ON agentes_ia FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM perfis 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- DELETE: Apenas role admin da empresa
CREATE POLICY "agentes_ia_delete_admin"
  ON agentes_ia FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM perfis 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================================================
-- POLÍTICAS RLS: conversas
-- ============================================================================

-- SELECT: Usuário pode ver próprias conversas; admin pode ver todas da empresa
CREATE POLICY "conversas_select_own"
  ON conversas FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM perfis WHERE id = auth.uid()
    )
    AND (
      user_id = auth.uid() -- Próprias conversas
      OR EXISTS (
        SELECT 1 FROM perfis 
        WHERE id = auth.uid() 
        AND role = 'admin'
        AND empresa_id = conversas.empresa_id
      ) -- Admin pode ver todas da empresa
    )
  );

-- INSERT: Usuário pode criar conversas na própria empresa
CREATE POLICY "conversas_insert_own_empresa"
  ON conversas FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM perfis WHERE id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- UPDATE: Usuário pode atualizar próprias conversas
CREATE POLICY "conversas_update_own"
  ON conversas FOR UPDATE
  USING (
    user_id = auth.uid()
    AND empresa_id IN (
      SELECT empresa_id FROM perfis WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- POLÍTICAS RLS: uso_recursos
-- ============================================================================

-- SELECT: Usuários podem ver uso da própria empresa
CREATE POLICY "uso_recursos_select_own_empresa"
  ON uso_recursos FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM perfis WHERE id = auth.uid()
    )
  );

-- INSERT/UPDATE: Apenas via Edge Functions (service_role)
-- Não criamos políticas INSERT/UPDATE para usuários comuns

-- ============================================================================
-- POLÍTICAS RLS: auditoria
-- ============================================================================

-- SELECT: Admin pode ver auditoria da própria empresa; master pode ver todas
CREATE POLICY "auditoria_select_admin_master"
  ON auditoria FOR SELECT
  USING (
    -- Master pode ver tudo
    EXISTS (
      SELECT 1 FROM perfis 
      WHERE id = auth.uid() 
      AND role = 'master'
    )
    OR
    -- Admin pode ver auditoria da própria empresa
    (
      empresa_id IN (
        SELECT empresa_id FROM perfis WHERE id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM perfis 
        WHERE id = auth.uid() 
        AND role = 'admin'
      )
    )
  );

-- INSERT: Apenas via Edge Functions (service_role)
-- Não criamos política INSERT para usuários comuns

COMMIT;

