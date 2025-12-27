# Script PowerShell para deploy da Edge Function create-user
# Execute este script na raiz do projeto

Write-Host "🚀 Iniciando deploy da Edge Function create-user..." -ForegroundColor Cyan

# Verificar se o Supabase CLI está instalado
Write-Host "`n📦 Verificando Supabase CLI..." -ForegroundColor Yellow
try {
    $supabaseVersion = supabase --version 2>&1
    Write-Host "✅ Supabase CLI encontrado: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host "`nPor favor, instale o Supabase CLI:" -ForegroundColor Yellow
    Write-Host "  - Via npm: npm install -g supabase" -ForegroundColor White
    Write-Host "  - Via scoop: scoop install supabase" -ForegroundColor White
    Write-Host "  - Via Chocolatey: choco install supabase" -ForegroundColor White
    exit 1
}

# Verificar se está logado
Write-Host "`n🔐 Verificando autenticação..." -ForegroundColor Yellow
try {
    supabase projects list 2>&1 | Out-Null
    Write-Host "✅ Autenticado no Supabase" -ForegroundColor Green
} catch {
    Write-Host "❌ Não autenticado no Supabase!" -ForegroundColor Red
    Write-Host "`nPor favor, faça login:" -ForegroundColor Yellow
    Write-Host "  supabase login" -ForegroundColor White
    exit 1
}

# Verificar se o projeto está linkado
Write-Host "`n🔗 Verificando link do projeto..." -ForegroundColor Yellow
$configPath = "supabase\config.toml"
if (Test-Path $configPath) {
    $configContent = Get-Content $configPath -Raw
    if ($configContent -match 'project_id\s*=') {
        Write-Host "✅ Projeto linkado" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Projeto não linkado" -ForegroundColor Yellow
        Write-Host "`nPor favor, linke o projeto:" -ForegroundColor Yellow
        Write-Host "  supabase link --project-ref <seu-project-ref>" -ForegroundColor White
        $link = Read-Host "Deseja linkar agora? (s/n)"
        if ($link -eq "s" -or $link -eq "S") {
            $projectRef = Read-Host "Digite o project-ref"
            supabase link --project-ref $projectRef
        } else {
            exit 1
        }
    }
} else {
    Write-Host "❌ Arquivo config.toml não encontrado!" -ForegroundColor Red
    exit 1
}

# Fazer deploy da função
Write-Host "`n📤 Fazendo deploy da Edge Function create-user..." -ForegroundColor Yellow
try {
    supabase functions deploy create-user
    Write-Host "`n✅ Deploy concluído com sucesso!" -ForegroundColor Green
    Write-Host "`n📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "  1. Verifique os logs: supabase functions logs create-user" -ForegroundColor White
    Write-Host "  2. Teste a criação de usuários na interface web" -ForegroundColor White
    Write-Host "  3. Verifique o envio de emails no Dashboard do Supabase" -ForegroundColor White
} catch {
    Write-Host "`n❌ Erro no deploy!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host "`n✨ Processo concluído!" -ForegroundColor Green

