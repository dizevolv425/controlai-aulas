-- Drop da política problemática
DROP POLICY IF EXISTS "perfis_select_own_empresa" ON perfis;

-- Recriar a política corrigida para evitar recursão infinita
CREATE POLICY "perfis_select_own_empresa"
  ON perfis FOR SELECT
  USING (
    id = auth.uid() -- Pode sempre ver próprio perfil (evita recursão)
    OR empresa_id = user_empresa_id() -- Pode ver perfis da mesma empresa
  );

