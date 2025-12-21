# Guia de Migrations do Supabase

Este documento descreve o processo de criação e aplicação de migrations no projeto ControlAI.

## Estrutura de Diretórios

```
supabase/
├── migrations/          # Arquivos SQL de migration
│   ├── 001_create_base_schema.sql
│   ├── 002_create_rls_policies.sql
│   └── ...
└── config.toml          # Configuração do projeto Supabase
```

## Convenções de Nomenclatura

- Migrations devem seguir o padrão: `XXX_description.sql`
- `XXX` é um número sequencial de 3 dígitos (001, 002, 003...)
- Use descrições claras e em snake_case
- Exemplos:
  - `001_create_base_schema.sql`
  - `002_create_rls_policies.sql`
  - `003_seed_planos.sql`

## Processo de Criação de Migration

### 1. Criar arquivo de migration

Crie um novo arquivo em `supabase/migrations/` seguindo a convenção de nomenclatura:

```sql
-- Migration: 001_create_base_schema.sql
-- Descrição: Cria as tabelas base do sistema

-- Sua SQL aqui
```

### 2. Aplicar migration localmente (se usando Supabase CLI)

```bash
# Se tiver Supabase CLI instalado
supabase migration up

# Ou aplicar migration específica
supabase db reset
```

### 3. Aplicar migration em produção

**Opção A: Via Supabase Dashboard**
1. Acesse o Supabase Dashboard
2. Vá em Database > Migrations
3. Cole o conteúdo do arquivo SQL
4. Execute a migration

**Opção B: Via Supabase CLI (recomendado)**
```bash
# Fazer link com o projeto
supabase link --project-ref seu-project-ref

# Aplicar migrations pendentes
supabase db push
```

**Opção C: Via MCP Supabase (usando Cursor)**
- Use o servidor MCP Supabase para aplicar migrations diretamente

## Boas Práticas

1. **Sempre teste localmente primeiro**: Teste migrations em ambiente de desenvolvimento antes de aplicar em produção

2. **Migrations devem ser idempotentes**: Use `IF NOT EXISTS` e `IF EXISTS` quando apropriado

3. **Não modifique migrations já aplicadas**: Se precisar corrigir, crie uma nova migration

4. **Documente mudanças complexas**: Adicione comentários explicando lógica complexa

5. **Backup antes de migrations destrutivas**: Sempre faça backup antes de migrations que alteram ou deletam dados

6. **Use transações**: Envolva operações relacionadas em transações quando possível

## Exemplo de Migration

```sql
-- Migration: 001_create_base_schema.sql
-- Cria as tabelas base do sistema

BEGIN;

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Criar enum para roles
CREATE TYPE user_role AS ENUM ('master', 'admin', 'user');

-- Criar tabela planos
CREATE TABLE IF NOT EXISTS planos (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(50) NOT NULL,
  preco_mensal DECIMAL(10,2) NOT NULL,
  max_usuarios INTEGER NOT NULL,
  max_agentes INTEGER NOT NULL,
  limite_mensagens_mes INTEGER NOT NULL,
  stripe_price_id VARCHAR(255) UNIQUE,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  cor VARCHAR(7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_planos_stripe_price_id ON planos(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_planos_is_active ON planos(is_active);

COMMIT;
```

## Troubleshooting

### Erro: "relation already exists"
- Use `IF NOT EXISTS` ao criar tabelas
- Verifique se a migration já foi aplicada

### Erro: "permission denied"
- Verifique se está usando as credenciais corretas
- Em produção, certifique-se de ter permissões adequadas

### Migration falhou no meio
- Revise os logs de erro
- Se necessário, crie uma migration de rollback
- Sempre teste em ambiente de desenvolvimento primeiro

## Referências

- [Documentação do Supabase Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

