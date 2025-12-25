-- Migration: 004_fix_perfis_rls_recursion.sql
-- Descrição: Corrige recursão infinita na política RLS da tabela perfis
-- Data: 2025-01-23

BEGIN;

-- Drop da política problemática
DROP POLICY IF EXISTS "perfis_select_own_empresa" ON perfis;

-- Recriar a política corrigida para evitar recursão infinita
-- Agora permite que o usuário veja sempre o próprio perfil primeiro,
-- e depois usa a função auxiliar user_empresa_id() que é SECURITY DEFINER
-- para evitar recursão
CREATE POLICY "perfis_select_own_empresa"
  ON perfis FOR SELECT
  USING (
    id = auth.uid() -- Pode sempre ver próprio perfil (evita recursão)
    OR empresa_id = user_empresa_id() -- Pode ver perfis da mesma empresa
  );

COMMIT;

