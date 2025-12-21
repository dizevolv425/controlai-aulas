-- Migration: 002_create_provision_trigger.sql
-- Descrição: Cria trigger e função para provisionar tenant automaticamente após cadastro
-- Data: 2025-12-21

BEGIN;

-- Função para chamar a Edge Function de provisionamento
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  response JSONB;
BEGIN
  -- Obter URL e service_role_key das configurações do Supabase
  -- Nota: Em produção, essas variáveis devem estar configuradas no Supabase Dashboard
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Se não estiverem configuradas, usar valores padrão do ambiente
  IF supabase_url IS NULL THEN
    supabase_url := 'https://czzcwplxjljrbwbwgmdx.supabase.co';
  END IF;

  -- Chamar Edge Function de provisionamento via HTTP
  -- Usando pg_net para fazer requisição HTTP
  SELECT content::jsonb INTO response
  FROM http((
    'POST',
    supabase_url || '/functions/v1/provision-tenant',
    ARRAY[
      http_header('Content-Type', 'application/json'),
      http_header('Authorization', 'Bearer ' || COALESCE(service_role_key, '')),
      http_header('apikey', COALESCE(service_role_key, ''))
    ],
    'application/json',
    json_build_object(
      'user_id', NEW.id::text,
      'email', NEW.email,
      'nome', COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
      'nome_completo', COALESCE(NEW.raw_user_meta_data->>'nome_completo', ''),
      'empresa_nome', COALESCE(NEW.raw_user_meta_data->>'empresa_nome', 'Nova Empresa')
    )::text
  )::http_request);

  -- Se houver erro na resposta, logar mas não falhar o cadastro
  IF response->>'success' = 'false' THEN
    RAISE WARNING 'Erro ao provisionar tenant: %', response->>'error';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, logar mas não impedir criação do usuário
    RAISE WARNING 'Erro ao chamar provision-tenant: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que executa após inserção em auth.users
-- Nota: Triggers em auth.users precisam ser criados via SQL direto no Supabase Dashboard
-- ou via migration aplicada com service_role
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMIT;

