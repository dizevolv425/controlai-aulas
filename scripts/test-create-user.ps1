# Script PowerShell para testar criação de usuários
# Execute este script após fazer login como admin/master

Write-Host "🧪 Teste de Criação de Usuários" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Verificar variáveis de ambiente
Write-Host "`n📋 Verificando configuração..." -ForegroundColor Yellow

$supabaseUrl = $env:VITE_SUPABASE_URL
$anonKey = $env:VITE_SUPABASE_ANON_KEY

if (-not $supabaseUrl -or -not $anonKey) {
    Write-Host "❌ Variáveis de ambiente não encontradas!" -ForegroundColor Red
    Write-Host "`nPor favor, configure no arquivo .env.local:" -ForegroundColor Yellow
    Write-Host "  VITE_SUPABASE_URL=https://<seu-project-ref>.supabase.co" -ForegroundColor White
    Write-Host "  VITE_SUPABASE_ANON_KEY=<sua-anon-key>" -ForegroundColor White
    exit 1
}

Write-Host "✅ VITE_SUPABASE_URL: $supabaseUrl" -ForegroundColor Green
Write-Host "✅ VITE_SUPABASE_ANON_KEY: [oculto]" -ForegroundColor Green

# Instruções para teste manual
Write-Host "`n📝 Instruções para teste:" -ForegroundColor Cyan
Write-Host "  1. Inicie o servidor de desenvolvimento: pnpm dev" -ForegroundColor White
Write-Host "  2. Faça login como admin ou master" -ForegroundColor White
Write-Host "  3. Navegue para: Dashboard > Configurações > Usuários" -ForegroundColor White
Write-Host "  4. Clique em '+ Adicionar Usuário'" -ForegroundColor White
Write-Host "  5. Preencha o formulário e salve" -ForegroundColor White
Write-Host "  6. Verifique se o usuário aparece na lista" -ForegroundColor White

Write-Host "`n🔍 Verificações:" -ForegroundColor Cyan
Write-Host "  ✓ Edge Function deployada: supabase functions list" -ForegroundColor White
Write-Host "  ✓ Logs da função: supabase functions logs create-user" -ForegroundColor White
Write-Host "  ✓ Usuários criados: Supabase Dashboard > Authentication > Users" -ForegroundColor White
Write-Host "  ✓ Emails enviados: Supabase Dashboard > Edge Functions > Logs" -ForegroundColor White

Write-Host "`n✨ Teste concluído!" -ForegroundColor Green

