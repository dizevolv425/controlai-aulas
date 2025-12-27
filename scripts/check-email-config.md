# Verificação de Configuração de Email

## Checklist de Verificação

### 1. Verificar SMTP no Supabase Dashboard

1. Acesse: **Supabase Dashboard > Settings > Auth > SMTP Settings**
2. Verifique se há configuração SMTP ativa
3. Se não houver, configure um provedor

### 2. Testar Envio de Email

#### Método 1: Via Interface
1. Crie um usuário via **Dashboard > Configurações > Usuários**
2. Verifique se recebeu email de convite
3. Verifique logs: **Edge Functions > create-user > Logs**

#### Método 2: Via Dashboard
1. **Authentication > Users > Invite User**
2. Preencha email e role
3. Verifique se o email foi enviado

### 3. Verificar Logs

```bash
# Via CLI
supabase functions logs create-user

# Ou no Dashboard
# Edge Functions > create-user > Logs
```

Procure por:
- ✅ "Email sent successfully"
- ❌ "Failed to send email"
- ❌ "SMTP not configured"

### 4. Verificar Status do Usuário

1. **Authentication > Users**
2. Procure pelo email criado
3. Status deve ser:
   - **"Invited"** - Email enviado, aguardando confirmação
   - **"Confirmed"** - Email confirmado, usuário ativo

### 5. Configurar SMTP (se necessário)

#### Gmail
```
Host: smtp.gmail.com
Port: 587
Username: seu-email@gmail.com
Password: [App Password]
Sender email: seu-email@gmail.com
Sender name: ControlAI
```

#### SendGrid
```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: [API Key]
Sender email: seu-email@exemplo.com
Sender name: ControlAI
```

### 6. Testar Localmente

Em desenvolvimento local, emails podem não ser enviados. Para testar:

1. Use **Inbucket** (incluído no Supabase local)
2. Acesse: `http://localhost:54324`
3. Verifique emails recebidos

### 7. Personalizar Email (Opcional)

1. **Supabase Dashboard > Settings > Auth > Email Templates**
2. Personalize o template de "Invite User"
3. Use variáveis: `{{ .Email }}`, `{{ .Token }}`, etc.

## Problemas Comuns

### Email não chega
- ✅ Verifique spam/lixo eletrônico
- ✅ Verifique configuração SMTP
- ✅ Verifique logs da Edge Function
- ✅ Teste com outro provedor de email

### Erro "SMTP not configured"
- Configure SMTP no Dashboard
- Verifique credenciais
- Teste conexão SMTP

### Email chega mas link não funciona
- Verifique URL de redirecionamento
- Verifique configuração de site_url
- Verifique se o token está correto

## Próximos Passos

1. ✅ Configurar SMTP
2. ✅ Testar envio de email
3. ✅ Personalizar template (opcional)
4. ✅ Monitorar taxa de entrega
5. ✅ Configurar domínio personalizado (opcional)

