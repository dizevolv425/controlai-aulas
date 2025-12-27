# Edge Function: create-user

## Visão Geral

A Edge Function `create-user` permite que administradores (admin/master) criem novos usuários no sistema. Ela cria o usuário no `auth.users` do Supabase e o perfil correspondente na tabela `perfis`.

## Funcionalidades

- ✅ Validação de permissões (apenas admin/master)
- ✅ Validação de dados com Zod
- ✅ Verificação de email duplicado
- ✅ Criação de usuário no auth.users
- ✅ Criação de perfil na tabela perfis
- ✅ Envio de email de convite
- ✅ Registro de auditoria
- ✅ Rollback automático em caso de erro

## Deploy

### Método 1: Script Automatizado (Recomendado)

```powershell
.\scripts\deploy-create-user.ps1
```

### Método 2: Manual

```bash
# 1. Instalar Supabase CLI (se ainda não instalado)
npm install -g supabase

# 2. Fazer login
supabase login

# 3. Linkar projeto
supabase link --project-ref <seu-project-ref>

# 4. Deploy
supabase functions deploy create-user
```

## Teste

### Via Interface Web

1. Faça login como admin ou master
2. Navegue: **Dashboard > Configurações > Usuários**
3. Clique em **"+ Adicionar Usuário"**
4. Preencha o formulário e salve

### Verificar Logs

```bash
supabase functions logs create-user
```

Ou no Dashboard: **Edge Functions > create-user > Logs**

## Configuração de Email

### Verificar Status do Email

1. **Supabase Dashboard > Settings > Auth > SMTP Settings**
2. Verifique se o SMTP está configurado
3. Se não estiver, configure um provedor (Gmail, SendGrid, etc.)

### Provedores Suportados

- **Gmail** (requer App Password)
- **SendGrid**
- **Mailgun**
- **Amazon SES**
- **Outros SMTP compatíveis**

### Configuração Básica (Gmail)

1. Acesse: **Supabase Dashboard > Settings > Auth > SMTP Settings**
2. Preencha:
   - **Host**: `smtp.gmail.com`
   - **Port**: `587`
   - **Username**: Seu email Gmail
   - **Password**: App Password (não a senha normal)
   - **Sender email**: Seu email Gmail
   - **Sender name**: Nome do remetente

3. **Gerar App Password no Gmail:**
   - Acesse: https://myaccount.google.com/apppasswords
   - Gere uma senha de app
   - Use essa senha no campo Password

### Testar Envio de Email

1. Crie um usuário via interface
2. Verifique os logs da Edge Function
3. Verifique a caixa de entrada do email (ou spam)
4. No Dashboard: **Authentication > Users** - verifique se o status é "Invited"

## Estrutura da Requisição

```typescript
POST /functions/v1/create-user
Headers:
  Authorization: Bearer <token>
  apikey: <anon-key>
  Content-Type: application/json

Body:
{
  "email": "usuario@exemplo.com",
  "nome_completo": "Nome Completo",
  "role": "user" | "admin" | "master",
  "status": "ativo" | "inativo",
  "empresa_id": 1
}
```

## Resposta de Sucesso

```json
{
  "success": true,
  "message": "Usuário criado com sucesso",
  "data": {
    "user_id": "uuid",
    "email": "usuario@exemplo.com",
    "nome_completo": "Nome Completo",
    "role": "user",
    "empresa_id": 1
  }
}
```

## Resposta de Erro

```json
{
  "success": false,
  "error": "Mensagem de erro específica"
}
```

## Códigos de Status HTTP

- `200` - Sucesso
- `400` - Dados inválidos ou email duplicado
- `401` - Não autenticado
- `403` - Sem permissão
- `405` - Método não permitido
- `500` - Erro interno do servidor

## Segurança

- ✅ Validação de autenticação
- ✅ Verificação de permissões (RLS)
- ✅ Validação de dados com Zod
- ✅ Uso de service_role apenas server-side
- ✅ Auditoria de ações
- ✅ Rollback em caso de erro

## Troubleshooting

### Erro: "Function not found"
- Verifique se o deploy foi concluído
- Aguarde alguns minutos após o deploy
- Verifique: `supabase functions list`

### Erro: "Permission denied"
- Verifique se o usuário tem role admin ou master
- Verifique se o token de autenticação está sendo enviado
- Verifique os logs da função

### Erro: "Email already exists"
- O email já está cadastrado
- Use outro email ou edite o usuário existente

### Email não está sendo enviado
- Verifique configuração SMTP no Dashboard
- Verifique logs da Edge Function
- Verifique spam/lixo eletrônico
- Em desenvolvimento local, emails podem não ser enviados

## Próximos Passos

1. ✅ Deploy da função
2. ✅ Testar criação de usuários
3. ✅ Configurar SMTP para emails
4. ✅ Personalizar template de email (opcional)
5. ✅ Monitorar logs e métricas

