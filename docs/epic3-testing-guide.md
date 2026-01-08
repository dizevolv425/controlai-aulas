# Guia de Teste - Épico 3: Gestão Segura de Chaves LLM

Este documento descreve como testar todas as funcionalidades implementadas no Épico 3.

## Pré-requisitos

1. **Supabase Configurado**
   - Projeto Supabase criado e linkado
   - Variável de ambiente `ENCRYPTION_KEY` configurada no Supabase Dashboard
   - Edge Functions deployadas

2. **Credenciais de Teste**
   - Chave API OpenAI válida (formato: `sk-...`)
   - OU chave API Claude válida (formato: `sk-ant-...`)
   - Conta de admin no sistema

## Passo 1: Deploy das Migrations

```bash
# Aplicar migration de criptografia
supabase migration up
```

Ou via Supabase Dashboard:
1. Acesse o Dashboard do Supabase
2. Vá em Database > Migrations
3. Certifique-se que a migration `006_enable_pgcrypto_and_setup_encryption.sql` está aplicada

## Passo 2: Deploy das Edge Functions

```bash
# Deploy store-byok-key
supabase functions deploy store-byok-key

# Deploy invoke-llm
supabase functions deploy invoke-llm
```

**IMPORTANTE**: Configure a variável de ambiente `ENCRYPTION_KEY` nas Edge Functions:
1. Acesse Supabase Dashboard > Edge Functions
2. Selecione `store-byok-key`
3. Vá em Settings > Secrets
4. Adicione: `ENCRYPTION_KEY` = `sua-chave-mestra-secreta-aqui` (32+ caracteres)
5. Repita para `invoke-llm`

## Passo 3: Teste do Formulário BYOK

1. **Acesse como Admin**
   - Faça login com uma conta que tenha role `admin` ou `master`
   - Acesse `/dashboard/admin`

2. **Configure Chave BYOK**
   - Clique na aba "API & BYOK"
   - Ative o toggle "Habilitar BYOK"
   - Selecione o provedor (OpenAI ou Claude)
   - Digite sua chave API
   - Clique em "Salvar Chave API"

3. **Verificar Sucesso**
   - Deve aparecer mensagem de sucesso: "Chave API armazenada com sucesso"
   - O formulário deve ser limpo
   - Verifique no banco de dados que `empresas.chave_api_llm` foi atualizado (não deve mostrar a chave completa)

## Passo 4: Teste da Função invoke-llm

**Nota**: Este teste requer que o Épico 4 (Chat) esteja implementado. Por enquanto, podemos testar via curl ou Postman.

```bash
# Obtenha o token de autenticação
TOKEN="seu-token-jwt-aqui"
SUPABASE_URL="sua-url-supabase-aqui"

# Teste invoke-llm
curl -X POST \
  "${SUPABASE_URL}/functions/v1/invoke-llm" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "agente_id": 1,
    "message": "Olá, como você pode me ajudar?"
  }'
```

**Resposta Esperada**:
```json
{
  "success": true,
  "data": {
    "response": "Olá! Eu sou um assistente...",
    "tokens_used": 150,
    "model": "gpt-4o-mini"
  }
}
```

## Passo 5: Verificação de Segurança

### ✅ Checklist de Segurança

- [ ] A chave API nunca é retornada ao cliente
- [ ] A chave é criptografada antes de ser armazenada no banco
- [ ] Apenas admins podem configurar chaves BYOK
- [ ] A chave é descriptografada apenas no servidor (Edge Function)
- [ ] Logs mascarados mostram apenas últimos 4 caracteres

### Teste de Segurança

1. **Verificar Banco de Dados**
   ```sql
   -- A chave não deve estar em texto plano
   SELECT id, nome, LEFT(chave_api_llm, 50) as chave_preview
   FROM empresas
   WHERE chave_api_llm IS NOT NULL;
   ```
   - A chave deve estar no formato: `provider|encrypted:base64...`

2. **Verificar Resposta da API**
   - Chame `invoke-llm` e verifique que a resposta não contém a chave API
   - Verifique os logs da Edge Function - a chave deve estar mascarada

## Passo 6: Teste End-to-End Completo

1. **Fluxo Completo**:
   - Admin configura chave BYOK (Passo 3)
   - Colaborador acessa chat (quando Épico 4 estiver pronto)
   - Colaborador envia mensagem
   - Sistema descriptografa chave, chama LLM e retorna resposta
   - Verificar que tudo funciona sem erros

2. **Verificar Auditoria**:
   ```sql
   SELECT * FROM auditoria
   WHERE acao = 'store_byok_key'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
   - Deve haver registro da ação de armazenar chave

## Troubleshooting

### Erro: "Edge Function não encontrada"
- **Solução**: Verifique se as Edge Functions foram deployadas
- **Comando**: `supabase functions list`

### Erro: "Erro ao descriptografar chave"
- **Solução**: Verifique se `ENCRYPTION_KEY` está configurada corretamente
- **Verificar**: Dashboard > Edge Functions > Settings > Secrets

### Erro: "Chave API inválida"
- **Solução**: Verifique o formato da chave:
  - OpenAI: deve começar com `sk-`
  - Claude: deve começar com `sk-ant-`

### Erro: "Apenas administradores podem configurar chaves BYOK"
- **Solução**: Certifique-se que o usuário tem role `admin` ou `master`
- **Verificar**: Tabela `perfis.role`

## Próximos Passos

Após validar o Épico 3:
- ✅ Épico 3 completo e testado
- ⏭️ Épico 4: Chat Colaborador (usará `invoke-llm`)

## Notas Importantes

1. **ENCRYPTION_KEY**: Em produção, use uma chave forte (32+ caracteres aleatórios)
2. **Testes**: Use chaves de teste da OpenAI/Claude, não chaves de produção
3. **Backup**: Certifique-se de ter backup das chaves antes de testar
4. **RLS**: As chaves estão protegidas por RLS - apenas a empresa pode ver sua própria chave

