-- Migration: 006_enable_pgcrypto_and_setup_encryption.sql
-- Descrição: Configura criptografia para chaves BYOK usando pgcrypto
-- Nota: pgcrypto já está habilitado na migration 001, mas adicionamos configurações adicionais aqui

BEGIN;

-- Verificar se a extensão pgcrypto está habilitada (já está na 001, mas verificamos)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Criar função para obter a chave mestra de criptografia
-- A chave mestra será armazenada em variável de ambiente no Supabase
-- Esta função será usada nas Edge Functions para criptografar/descriptografar
CREATE OR REPLACE FUNCTION get_encryption_key()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- A chave mestra deve ser configurada via variável de ambiente do Supabase
  -- Se não estiver configurada, usar uma chave padrão (apenas para desenvolvimento)
  -- IMPORTANTE: Em produção, sempre configure ENCRYPTION_KEY no Supabase
  RETURN COALESCE(
    current_setting('app.encryption_key', true),
    'dev-key-change-in-production-' || current_setting('app.tenant_id', true)
  );
END;
$$;

-- Criar função auxiliar para criptografar dados
-- Esta função será usada nas Edge Functions via SQL
CREATE OR REPLACE FUNCTION encrypt_value(value TEXT)
RETURNS BYTEA
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := get_encryption_key();
  
  -- Usar pgp_sym_encrypt para criptografar o valor
  RETURN pgp_sym_encrypt(value, encryption_key, 'compress-algo=1, cipher-algo=aes256');
END;
$$;

-- Criar função auxiliar para descriptografar dados
-- Esta função será usada nas Edge Functions via SQL
CREATE OR REPLACE FUNCTION decrypt_value(encrypted_value BYTEA)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := get_encryption_key();
  
  -- Usar pgp_sym_decrypt para descriptografar o valor
  RETURN pgp_sym_decrypt(encrypted_value, encryption_key, 'compress-algo=1');
EXCEPTION
  WHEN OTHERS THEN
    -- Se falhar na descriptografia, retornar NULL
    RETURN NULL;
END;
$$;

-- Adicionar comentários explicativos
COMMENT ON FUNCTION get_encryption_key() IS 'Retorna a chave mestra de criptografia configurada via variável de ambiente';
COMMENT ON FUNCTION encrypt_value(TEXT) IS 'Criptografa um valor texto usando a chave mestra';
COMMENT ON FUNCTION decrypt_value(BYTEA) IS 'Descriptografa um valor criptografado usando a chave mestra';

COMMIT;

