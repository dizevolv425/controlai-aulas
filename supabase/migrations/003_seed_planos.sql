-- Migration: 003_seed_planos.sql
-- Descrição: Popular tabela planos com os planos padrão do sistema
-- Data: 2025-01-XX
-- Nota: Os stripe_price_id devem ser configurados no Stripe Dashboard e atualizados aqui

BEGIN;

-- Inserir planos padrão
-- IMPORTANTE: Atualize os stripe_price_id após criar os preços no Stripe Dashboard

-- Plano Free
INSERT INTO planos (nome, preco_mensal, max_usuarios, max_agentes, limite_mensagens_mes, stripe_price_id, features, is_active, cor)
VALUES (
  'Free',
  0.00,
  3,
  1,
  100,
  NULL, -- Será configurado no Stripe Dashboard
  '["Até 3 usuários", "Traga sua própria API", "Suporte por email", "Dashboard básico", "Segurança completa"]'::jsonb,
  true,
  '#6b7280'
) ON CONFLICT DO NOTHING;

-- Plano Básico
INSERT INTO planos (nome, preco_mensal, max_usuarios, max_agentes, limite_mensagens_mes, stripe_price_id, features, is_active, cor)
VALUES (
  'Básico',
  99.00,
  10,
  3,
  1000,
  NULL, -- Será configurado no Stripe Dashboard
  '["Até 10 usuários", "Traga sua própria API", "Suporte por email", "Dashboard de gestão", "Segurança completa"]'::jsonb,
  true,
  '#3b82f6'
) ON CONFLICT DO NOTHING;

-- Plano Empresa
INSERT INTO planos (nome, preco_mensal, max_usuarios, max_agentes, limite_mensagens_mes, stripe_price_id, features, is_active, cor)
VALUES (
  'Empresa',
  299.00,
  50,
  10,
  10000,
  NULL, -- Será configurado no Stripe Dashboard
  '["Até 50 usuários", "Traga sua própria API", "Suporte prioritário", "Analytics avançado", "Customização de contexto IA", "Gestão por departamento"]'::jsonb,
  true,
  '#10b981'
) ON CONFLICT DO NOTHING;

-- Plano Master
INSERT INTO planos (nome, preco_mensal, max_usuarios, max_agentes, limite_mensagens_mes, stripe_price_id, features, is_active, cor)
VALUES (
  'Master',
  999.00,
  0, -- 0 = ilimitado
  0, -- 0 = ilimitado
  0, -- 0 = ilimitado
  NULL, -- Será configurado no Stripe Dashboard
  '["Usuários ilimitados", "Traga sua própria API", "Suporte 24/7 dedicado", "SLA garantido", "Onboarding personalizado", "Infraestrutura dedicada"]'::jsonb,
  true,
  '#a855f7'
) ON CONFLICT DO NOTHING;

COMMIT;

