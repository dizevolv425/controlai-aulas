# Script de deploy automatizado da Edge Function provision-tenant (PowerShell)
# Uso: .\scripts\deploy.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Iniciando deploy da Edge Function provision-tenant..." -ForegroundColor Cyan

# Verificar se Supabase CLI está instalado
try {
    $null = Get-Command supabase -ErrorAction Stop
    Write-Host "✅ Supabase CLI encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI não está instalado." -ForegroundColor Red
    Write-Host "Instale com: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Verificar se está logado
try {
    $null = supabase projects list 2>&1
    Write-Host "✅ Autenticado no Supabase" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Não está logado no Supabase. Fazendo login..." -ForegroundColor Yellow
    supabase login
}

# Verificar se o projeto está linkado
if (-not (Test-Path ".supabase\config.toml")) {
    Write-Host "⚠️  Projeto não está linkado. Linkando..." -ForegroundColor Yellow
    Write-Host "Por favor, insira a senha do banco de dados quando solicitado:" -ForegroundColor Yellow
    supabase link --project-ref czzcwplxjljrbwbwgmdx
}

Write-Host "✅ Projeto linkado" -ForegroundColor Green

# Verificar variáveis de ambiente
Write-Host "⚠️  Verificando variáveis de ambiente..." -ForegroundColor Yellow
Write-Host "Certifique-se de que as seguintes variáveis estão configuradas:" -ForegroundColor Yellow
Write-Host "  - SUPABASE_URL" -ForegroundColor White
Write-Host "  - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor White
Write-Host "  - SUPABASE_ANON_KEY" -ForegroundColor White
Write-Host ""
Write-Host "Configure via Dashboard: https://supabase.com/dashboard/project/czzcwplxjljrbwgmdx/settings/functions" -ForegroundColor Cyan
Write-Host "Ou via CLI: supabase secrets set NOME_VARIAVEL=valor" -ForegroundColor Cyan
Write-Host ""
Read-Host "Pressione Enter para continuar com o deploy"

# Fazer deploy da função
Write-Host "📦 Fazendo deploy da função provision-tenant..." -ForegroundColor Cyan
supabase functions deploy provision-tenant

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Teste a função em:" -ForegroundColor Cyan
    Write-Host "https://czzcwplxjljrbwbwgmdx.supabase.co/functions/v1/provision-tenant" -ForegroundColor White
    Write-Host ""
    Write-Host "Ver logs com: pnpm run supabase:functions:logs" -ForegroundColor Cyan
} else {
    Write-Host "❌ Erro no deploy" -ForegroundColor Red
    exit 1
}



