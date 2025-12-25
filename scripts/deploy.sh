#!/bin/bash

# Script de deploy automatizado da Edge Function provision-tenant
# Uso: ./scripts/deploy.sh

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy da Edge Function provision-tenant..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI não está instalado.${NC}"
    echo "Instale com: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI encontrado${NC}"

# Verificar se está logado
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Não está logado no Supabase. Fazendo login...${NC}"
    supabase login
fi

echo -e "${GREEN}✅ Autenticado no Supabase${NC}"

# Verificar se o projeto está linkado
if [ ! -f ".supabase/config.toml" ]; then
    echo -e "${YELLOW}⚠️  Projeto não está linkado. Linkando...${NC}"
    echo "Por favor, insira a senha do banco de dados quando solicitado:"
    supabase link --project-ref czzcwplxjljrbwbwgmdx
fi

echo -e "${GREEN}✅ Projeto linkado${NC}"

# Verificar se as variáveis de ambiente estão configuradas
echo -e "${YELLOW}⚠️  Verificando variáveis de ambiente...${NC}"
echo "Certifique-se de que as seguintes variáveis estão configuradas:"
echo "  - SUPABASE_URL"
echo "  - SUPABASE_SERVICE_ROLE_KEY"
echo "  - SUPABASE_ANON_KEY"
echo ""
echo "Configure via Dashboard: https://supabase.com/dashboard/project/czzcwplxjljrbwbwgmdx/settings/functions"
echo "Ou via CLI: supabase secrets set NOME_VARIAVEL=valor"
echo ""
read -p "Pressione Enter para continuar com o deploy..."

# Fazer deploy da função
echo -e "${GREEN}📦 Fazendo deploy da função provision-tenant...${NC}"
supabase functions deploy provision-tenant

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
    echo ""
    echo "Teste a função em:"
    echo "https://czzcwplxjljrbwbwgmdx.supabase.co/functions/v1/provision-tenant"
    echo ""
    echo "Ver logs com: pnpm run supabase:functions:logs"
else
    echo -e "${RED}❌ Erro no deploy${NC}"
    exit 1
fi



