# 🚀 Instruções de Deploy - Edge Function create-user

## Resumo Rápido

Este guia contém todas as instruções necessárias para:
1. ✅ Fazer deploy da Edge Function `create-user`
2. ✅ Testar criação de usuários
3. ✅ Verificar envio de emails de convite

## 📋 Pré-requisitos

- [ ] Node.js instalado (para npm)
- [ ] Acesso ao projeto Supabase
- [ ] Credenciais de admin/master no sistema

## 🔧 Passo 1: Instalar Supabase CLI

Escolha um método:

### Opção A: Via npm (Recomendado)
```powershell
npm install -g supabase
```

### Opção B: Via Scoop
```powershell
scoop install supabase
```

### Opção C: Via Chocolatey
```powershell
choco install supabase
```

## 🔐 Passo 2: Autenticar no Supabase

```powershell
supabase login
```

Siga as instruções no navegador para autenticar.

## 🔗 Passo 3: Linkar Projeto

```powershell
supabase link --project-ref <seu-project-ref>
```

**Onde encontrar o project-ref:**
- Acesse: https://app.supabase.com/project/<project-ref>
- O `project-ref` está na URL do seu projeto

## 📤 Passo 4: Deploy da Edge Function

### Método Automatizado (Recomendado)
```powershell
.\scripts\deploy-create-user.ps1
```

### Método Manual
```powershell
supabase functions deploy create-user
```

### Verificar Deploy
```powershell
supabase functions list
```

Você deve ver `create-user` na lista.

## 🧪 Passo 5: Testar Criação de Usuários

### Via Interface Web

1. **Inicie o servidor de desenvolvimento:**
   ```powershell
   pnpm dev
   ```

2. **Acesse a aplicação:**
   - URL: http://localhost:3000

3. **Faça login como admin ou master**

4. **Navegue para:**
   - Dashboard > Configurações > Aba "Usuários"

5. **Crie um novo usuário:**
   - Clique em **"+ Adicionar Usuário"**
   - Preencha:
     - Email: `teste@exemplo.com`
     - Nome Completo: `Usuário Teste`
     - Role: `Usuário` (ou Admin/Master)
   - Clique em **"Adicionar"**

6. **Verifique o resultado:**
   - ✅ Toast verde = Sucesso
   - ❌ Toast vermelho = Erro (verifique logs)

### Verificar Criação

1. **Na lista de usuários:**
   - O novo usuário deve aparecer
   - Verifique avatar, nome e email

2. **No Supabase Dashboard:**
   - **Authentication > Users**
   - Procure pelo email criado
   - Status deve ser "Invited"

## 📧 Passo 6: Verificar Envio de Emails

### Verificar Configuração SMTP

1. **Acesse:** Supabase Dashboard > Settings > Auth > SMTP Settings
2. **Verifique se há configuração ativa**
3. **Se não houver, configure:**

#### Configuração Gmail (Exemplo)
```
Host: smtp.gmail.com
Port: 587
Username: seu-email@gmail.com
Password: [App Password - não a senha normal]
Sender email: seu-email@gmail.com
Sender name: ControlAI
```

**Como gerar App Password no Gmail:**
1. Acesse: https://myaccount.google.com/apppasswords
2. Gere uma senha de app
3. Use essa senha no campo Password

### Verificar Logs de Email

```powershell
supabase functions logs create-user
```

Ou no Dashboard:
**Edge Functions > create-user > Logs**

Procure por:
- ✅ "Email sent successfully"
- ❌ "Failed to send email"
- ❌ "SMTP not configured"

### Verificar Recebimento

1. **Verifique a caixa de entrada** do email criado
2. **Verifique spam/lixo eletrônico**
3. **No Dashboard:** Authentication > Users > Status deve ser "Invited"

## 🔍 Troubleshooting

### Erro: "Function not found"
```powershell
# Verificar se está deployada
supabase functions list

# Se não estiver, fazer deploy novamente
supabase functions deploy create-user
```

### Erro: "Permission denied"
- Verifique se está logado como admin ou master
- Verifique se o token de autenticação está sendo enviado
- Verifique logs: `supabase functions logs create-user`

### Erro: "Email already exists"
- O email já está cadastrado
- Use outro email ou edite o usuário existente

### Email não está sendo enviado
1. Verifique configuração SMTP no Dashboard
2. Verifique logs da Edge Function
3. Verifique spam/lixo eletrônico
4. Em desenvolvimento local, emails podem não ser enviados (use Inbucket)

## 📚 Documentação Adicional

- **Deploy detalhado:** `scripts/deploy-edge-function.md`
- **Testes detalhados:** `scripts/test-create-user.md`
- **Configuração de email:** `scripts/check-email-config.md`
- **Documentação completa:** `docs/edge-function-create-user.md`

## ✅ Checklist Final

- [ ] Supabase CLI instalado
- [ ] Autenticado no Supabase
- [ ] Projeto linkado
- [ ] Edge Function deployada
- [ ] Teste de criação bem-sucedido
- [ ] SMTP configurado
- [ ] Email de convite sendo enviado
- [ ] Logs verificados

## 🎉 Pronto!

Agora você pode criar usuários via interface web e eles receberão emails de convite automaticamente!

