# 🚀 Guia Rápido de Deploy da Edge Function

## Deploy Rápido (3 passos)

### 1. Login no Supabase
```bash
pnpm run supabase:login
```

### 2. Linkar o Projeto
```bash
pnpm run supabase:link
```
*Você precisará da senha do banco de dados (`SUPABASE_DB_PASSWORD`)*

### 3. Configurar Variáveis de Ambiente

**Via Dashboard (Recomendado):**
1. Acesse: https://supabase.com/dashboard/project/czzcwplxjljrbwgmdx/settings/functions
2. Adicione as seguintes variáveis:
   - `SUPABASE_URL` = `https://czzcwplxjljrbwbwgmdx.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = (encontre em Settings > API)
   - `SUPABASE_ANON_KEY` = (encontre em Settings > API)

**Via CLI:**
```bash
supabase secrets set SUPABASE_URL=https://czzcwplxjljrbwgmdx.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
supabase secrets set SUPABASE_ANON_KEY=sua_anon_key
```

### 4. Deploy
```bash
pnpm run supabase:deploy:provision-tenant
```

## Scripts Automatizados

### Windows (PowerShell)
```powershell
.\scripts\deploy.ps1
```

### Linux/Mac (Bash)
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

## Verificar Deploy

### Listar funções:
```bash
pnpm run supabase:functions:list
```

### Ver logs:
```bash
pnpm run supabase:functions:logs
```

### Testar função:
```bash
curl -X POST https://czzcwplxjljrbwbwgmdx.supabase.co/functions/v1/provision-tenant \
  -H "Content-Type: application/json" \
  -H "apikey: SUA_ANON_KEY" \
  -d '{"user_id":"test","email":"test@test.com","nome":"Test","nome_completo":"Test","empresa_nome":"Test"}'
```

## Troubleshooting

### ❌ "Supabase CLI não encontrado"
```bash
npm install -g supabase
# ou
pnpm add -g supabase
```

### ❌ "Not logged in"
```bash
pnpm run supabase:login
```

### ❌ "Project not linked"
```bash
pnpm run supabase:link
```

### ❌ "Missing environment variables"
Configure as variáveis no Dashboard: https://supabase.com/dashboard/project/czzcwplxjljrbwgmdx/settings/functions

## Documentação Completa

Para instruções detalhadas, consulte: [scripts/deploy-edge-function.md](scripts/deploy-edge-function.md)



