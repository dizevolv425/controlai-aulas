# Guia de Deploy da Edge Function provision-tenant

Este guia fornece instruções passo a passo para fazer o deploy da Edge Function `provision-tenant` no Supabase.

## Pré-requisitos

1. **Supabase CLI instalado**
   ```bash
   npm install -g supabase
   # ou
   pnpm add -g supabase
   ```

2. **Acesso ao projeto Supabase**
   - Project Ref: `czzcwplxjljrbwbwgmdx`
   - URL: `https://czzcwplxjljrbwbwgmdx.supabase.co`

## Passo 1: Login no Supabase

```bash
pnpm run supabase:login
# ou
supabase login
```

Isso abrirá o navegador para autenticação. Faça login com sua conta Supabase.

## Passo 2: Linkar o Projeto

```bash
pnpm run supabase:link
# ou
supabase link --project-ref czzcwplxjljrbwbwgmdx
```

Você precisará da senha do banco de dados (`SUPABASE_DB_PASSWORD`) que foi definida ao criar o projeto.

## Passo 3: Configurar Variáveis de Ambiente

Antes do deploy, configure as variáveis de ambiente no Dashboard do Supabase:

1. Acesse: https://supabase.com/dashboard/project/czzcwplxjljrbwbwgmdx/settings/functions
2. Ou via CLI:
   ```bash
   supabase secrets set SUPABASE_URL=https://czzcwplxjljrbwbwgmdx.supabase.co
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
   supabase secrets set SUPABASE_ANON_KEY=sua_anon_key
   ```

**Onde encontrar as chaves:**
- Dashboard: Settings > API
- `SUPABASE_URL`: URL do projeto
- `SUPABASE_SERVICE_ROLE_KEY`: service_role key (secreta)
- `SUPABASE_ANON_KEY`: anon/public key

## Passo 4: Deploy da Edge Function

```bash
pnpm run supabase:deploy:provision-tenant
# ou
supabase functions deploy provision-tenant
```

## Passo 5: Verificar o Deploy

### Verificar via CLI:
```bash
pnpm run supabase:functions:list
```

### Verificar via Dashboard:
https://supabase.com/dashboard/project/czzcwplxjljrbwbwgmdx/functions

A função `provision-tenant` deve aparecer na lista.

### Testar a função:
```bash
curl -X POST https://czzcwplxjljrbwbwgmdx.supabase.co/functions/v1/provision-tenant \
  -H "Content-Type: application/json" \
  -H "apikey: SUA_ANON_KEY" \
  -d '{"user_id":"test","email":"test@test.com","nome":"Test","nome_completo":"Test","empresa_nome":"Test"}'
```

## Verificar Logs

```bash
pnpm run supabase:functions:logs
# ou
supabase functions logs provision-tenant
```

## Troubleshooting

### Erro: "Not logged in"
```bash
pnpm run supabase:login
```

### Erro: "Project not linked"
```bash
pnpm run supabase:link
```

### Erro: "Function not found"
Verifique se está no diretório raiz do projeto e se a função existe em `supabase/functions/provision-tenant/`

### Erro: "Missing environment variables"
Configure as variáveis de ambiente no Dashboard ou via CLI (Passo 3)

### Erro: "CORS error"
O Supabase gerencia CORS automaticamente para Edge Functions. Se persistir, verifique:
- Se a função está deployada corretamente
- Se a URL está correta
- Se não há firewall bloqueando

## Comandos Úteis

```bash
# Listar todas as funções
pnpm run supabase:functions:list

# Ver logs de uma função
pnpm run supabase:functions:logs

# Deploy de uma função específica
pnpm run supabase:deploy:provision-tenant

# Ver status do projeto linkado
supabase status

# Remover link do projeto
supabase unlink
```



