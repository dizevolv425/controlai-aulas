# Guia de Teste - Criação de Usuários

## Pré-requisitos

1. Edge Function `create-user` deployada
2. Usuário logado com role `admin` ou `master`
3. Empresa (tenant) criada e ativa

## Teste via Interface Web

### Passo 1: Acessar a página de Admin
1. Faça login como admin ou master
2. Navegue para: **Dashboard > Configurações > Aba "Usuários"**

### Passo 2: Criar novo usuário
1. Clique no botão **"+ Adicionar Usuário"**
2. Preencha o formulário:
   - **Email**: `teste@exemplo.com`
   - **Nome Completo**: `Usuário Teste`
   - **Role**: Selecione `Usuário`, `Admin` ou `Master`
3. Clique em **"Adicionar"**

### Passo 3: Verificar resultado
- ✅ **Sucesso**: Toast verde com mensagem "Usuário criado com sucesso"
- ❌ **Erro**: Toast vermelho com mensagem de erro específica

### Passo 4: Verificar criação
1. O novo usuário deve aparecer na lista
2. Verifique se o avatar mostra as iniciais corretas
3. Verifique se o email e nome estão corretos

## Teste via Console do Navegador

Abra o Console do Navegador (F12) e execute:

```javascript
// Verificar se a função está acessível
const response = await fetch('https://<seu-project-ref>.supabase.co/functions/v1/create-user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': '<sua-anon-key>',
    'Authorization': `Bearer ${localStorage.getItem('sb-<project-ref>-auth-token')}`
  },
  body: JSON.stringify({
    email: 'teste@exemplo.com',
    nome_completo: 'Usuário Teste',
    role: 'user',
    status: 'ativo',
    empresa_id: 1
  })
});

const data = await response.json();
console.log(data);
```

## Verificar Email de Convite

### No Supabase Dashboard:
1. Acesse: **Authentication > Users**
2. Procure pelo email criado
3. Verifique se o usuário foi criado
4. O status deve ser "Invited" (não confirmado)

### Verificar logs de email:
1. **Supabase Dashboard > Edge Functions > create-user > Logs**
2. Procure por mensagens relacionadas a email
3. Verifique se há erros no envio

### Configurar SMTP (se necessário):
1. **Supabase Dashboard > Settings > Auth > SMTP Settings**
2. Configure seu provedor de email (Gmail, SendGrid, etc.)
3. Teste o envio de emails

## Testes de Validação

### Teste 1: Email duplicado
- Tente criar um usuário com email já existente
- **Esperado**: Erro "Este email já está cadastrado"

### Teste 2: Permissões
- Faça login como usuário comum (role: `user`)
- Tente criar um usuário
- **Esperado**: Erro de permissão

### Teste 3: Dados inválidos
- Tente criar usuário sem email
- Tente criar usuário sem nome
- **Esperado**: Erro de validação

### Teste 4: Empresa diferente (para admins)
- Como admin, tente criar usuário em empresa diferente
- **Esperado**: Erro de permissão

## Checklist de Verificação

- [ ] Edge Function deployada com sucesso
- [ ] Usuário criado aparece na lista
- [ ] Email de convite enviado (verificar inbox ou logs)
- [ ] Usuário pode fazer login após confirmar email
- [ ] Permissões funcionando corretamente
- [ ] Validações funcionando
- [ ] Logs de auditoria sendo registrados

## Próximos Passos

1. **Configurar SMTP** para envio real de emails
2. **Personalizar email de convite** (opcional)
3. **Adicionar mais validações** se necessário
4. **Monitorar logs** para identificar problemas

