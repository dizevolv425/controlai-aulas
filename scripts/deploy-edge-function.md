# Guia de Deploy da Edge Function create-user

## Pré-requisitos

1. **Instalar Supabase CLI:**
   ```bash
   # Windows (PowerShell)
   scoop install supabase
   
   # Ou via npm
   npm install -g supabase
   
   # Ou via Chocolatey
   choco install supabase
   ```

2. **Fazer login no Supabase:**
   ```bash
   supabase login
   ```

3. **Linkar o projeto:**
   ```bash
   supabase link --project-ref <seu-project-ref>
   ```
   O `project-ref` pode ser encontrado na URL do seu projeto Supabase:
   `https://app.supabase.com/project/<project-ref>`

## Deploy da Edge Function

### Deploy da função create-user:
```bash
supabase functions deploy create-user
```

### Verificar se o deploy foi bem-sucedido:
```bash
supabase functions list
```

## Teste Local (Opcional)

Para testar localmente antes do deploy:

1. **Iniciar Supabase local:**
   ```bash
   supabase start
   ```

2. **Servir a Edge Function localmente:**
   ```bash
   supabase functions serve create-user
   ```

3. **Testar a função:**
   - A função estará disponível em: `http://localhost:54321/functions/v1/create-user`
   - Use o frontend apontando para `http://localhost:54321`

## Configuração de Variáveis de Ambiente

A Edge Function precisa das seguintes variáveis de ambiente no Supabase:

1. Acesse: **Supabase Dashboard > Edge Functions > create-user > Settings**
2. As variáveis abaixo são configuradas automaticamente pelo Supabase:
   - `SUPABASE_URL` - URL do projeto
   - `SUPABASE_SERVICE_ROLE_KEY` - Chave service_role (automática)
   - `SUPABASE_ANON_KEY` - Chave anon (automática)

## Verificação de Logs

Para ver os logs da Edge Function:

```bash
supabase functions logs create-user
```

Ou no Dashboard:
**Supabase Dashboard > Edge Functions > create-user > Logs**

## Troubleshooting

### Erro: "Function not found"
- Verifique se o deploy foi concluído: `supabase functions list`
- Aguarde alguns minutos após o deploy

### Erro: "Permission denied"
- Verifique se o usuário tem role admin ou master
- Verifique se o token de autenticação está sendo enviado

### Erro: "Email already exists"
- O email já está cadastrado no sistema
- Use outro email ou edite o usuário existente
