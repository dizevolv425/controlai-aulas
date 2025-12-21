# Supabase - ControlAI

Este diretório contém toda a configuração e código relacionado ao Supabase.

## Estrutura

```
supabase/
├── migrations/          # Migrations SQL do banco de dados
├── functions/           # Edge Functions (Deno)
│   └── _shared/        # Código compartilhado entre funções
└── config.toml         # Configuração do projeto Supabase
```

## Migrations

As migrations estão em `migrations/` e devem ser aplicadas em ordem sequencial.

Para aplicar migrations:
1. Via Supabase Dashboard: Database > Migrations > New Migration
2. Via Supabase CLI: `supabase db push`
3. Via MCP Supabase: Use o servidor MCP no Cursor

## Edge Functions

As Edge Functions estão em `functions/` e são escritas em TypeScript/Deno.

Para deploy de uma função:
1. Via Supabase Dashboard: Edge Functions > Deploy
2. Via Supabase CLI: `supabase functions deploy <nome-funcao>`
3. Via MCP Supabase: Use o servidor MCP no Cursor

## Variáveis de Ambiente

As Edge Functions precisam das seguintes variáveis de ambiente configuradas no Supabase Dashboard:

- `SUPABASE_URL` - URL do projeto Supabase
- `SUPABASE_ANON_KEY` - Chave anônima (pública)
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço (privada, apenas para Edge Functions)

## Documentação

- [Guia de Migrations](../docs/migrations.md)
- [Arquitetura do Sistema](../docs/architecture.md)

