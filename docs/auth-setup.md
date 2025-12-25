# Configuração de Autenticação - ControlAI

## Configurações Necessárias no Supabase Dashboard

### 1. Desabilitar Confirmação de Email

Para permitir login imediato após cadastro (sem confirmação de email):

1. Acesse o Supabase Dashboard
2. Vá em **Authentication** > **Settings** > **Email Auth**
3. Desabilite a opção **"Enable email confirmations"**
4. Salve as alterações

**Importante:** Se a confirmação de email estiver habilitada, os usuários precisarão confirmar o email antes de fazer login.

### 2. Configurar URLs de Redirecionamento

1. Em **Authentication** > **URL Configuration**
2. Adicione as URLs permitidas:
   - `http://localhost:3000` (desenvolvimento)
   - `https://seu-dominio.netlify.app` (produção)

### 3. Verificar Edge Function de Provisionamento

A Edge Function `provision-tenant` deve estar deployada e ativa:
- Verifique em **Edge Functions** > **provision-tenant**
- Certifique-se de que está com status **ACTIVE**

### 4. Verificar Trigger de Provisionamento

O trigger `on_auth_user_created` deve estar ativo no banco:
- Verifique em **Database** > **Triggers**
- O trigger deve executar a função `handle_new_user()` após INSERT em `auth.users`

## Fluxo de Cadastro

1. Usuário preenche formulário de registro
2. Sistema cria usuário em `auth.users` via Supabase Auth
3. Trigger `on_auth_user_created` é executado automaticamente
4. Trigger chama Edge Function `provision-tenant`
5. Edge Function cria:
   - Empresa (tenant) com plano Free
   - Perfil vinculando usuário à empresa com role `admin`
6. Sistema registra ação em `auditoria`

## Requisitos de Senha

A senha deve atender aos seguintes critérios:
- Mínimo de 8 caracteres
- Pelo menos uma letra maiúscula
- Pelo menos uma letra minúscula
- Pelo menos um número
- Pelo menos um caractere especial

## Troubleshooting

### Erro: "Invalid login credentials" após cadastro

**Causa:** Confirmação de email está habilitada no Supabase

**Solução:** Desabilite a confirmação de email conforme instruções acima, ou peça ao usuário para verificar o email antes de fazer login.

### Erro: "Plano Free não encontrado"

**Causa:** Plano Free não foi criado no banco

**Solução:** Execute a migration ou SQL para criar o plano Free:
```sql
INSERT INTO planos (nome, preco_mensal, max_usuarios, max_agentes, limite_mensagens_mes, is_active, cor)
VALUES ('Free', 0.00, 1, 1, 100, true, '#6B7280')
ON CONFLICT DO NOTHING;
```

### Erro: "Tenant já existe para este usuário"

**Causa:** Usuário já tem empresa vinculada (idempotência funcionando)

**Solução:** Este é um comportamento esperado. O sistema evita criar duplicatas.

