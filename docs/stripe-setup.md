# Configuração do Stripe

Este documento descreve o processo de configuração do Stripe para o ControlAI, incluindo criação de planos, configuração de webhooks e integração com a plataforma.

## Pré-requisitos

1. Conta no Stripe (https://stripe.com)
2. Acesso ao Stripe Dashboard
3. Chaves de API do Stripe (Secret Key e Publishable Key)

## Passo 1: Criar Produtos e Preços no Stripe

### 1.1 Acessar o Stripe Dashboard

1. Acesse https://dashboard.stripe.com
2. Certifique-se de estar no modo **Test** (para desenvolvimento) ou **Live** (para produção)

### 1.2 Criar Produtos

Para cada plano (Free, Básico, Empresa, Master), crie um produto no Stripe:

1. Vá em **Products** > **Add product**
2. Configure cada produto:

#### Produto: Free
- **Name:** ControlAI - Free
- **Description:** Plano gratuito com recursos limitados
- **Pricing model:** Recurring
- **Price:** R$ 0,00 / mês
- **Billing period:** Monthly
- **Save** e copie o **Price ID** (começa com `price_...`)

#### Produto: Básico
- **Name:** ControlAI - Básico
- **Description:** Plano básico para pequenas equipes
- **Pricing model:** Recurring
- **Price:** R$ 99,00 / mês
- **Billing period:** Monthly
- **Save** e copie o **Price ID**

#### Produto: Empresa
- **Name:** ControlAI - Empresa
- **Description:** Plano empresarial para empresas em crescimento
- **Pricing model:** Recurring
- **Price:** R$ 299,00 / mês
- **Billing period:** Monthly
- **Save** e copie o **Price ID**

#### Produto: Master
- **Name:** ControlAI - Master
- **Description:** Plano enterprise completo
- **Pricing model:** Recurring
- **Price:** R$ 999,00 / mês
- **Billing period:** Monthly
- **Save** e copie o **Price ID**

### 1.3 Atualizar Migration com Price IDs

Após criar os preços no Stripe, atualize a migration `003_seed_planos.sql` com os `stripe_price_id` correspondentes:

```sql
-- Exemplo:
UPDATE planos SET stripe_price_id = 'price_1234567890abcdef' WHERE nome = 'Free';
UPDATE planos SET stripe_price_id = 'price_abcdef1234567890' WHERE nome = 'Básico';
-- ... etc
```

Ou execute manualmente no Supabase SQL Editor:

```sql
UPDATE planos SET stripe_price_id = 'seu_price_id_aqui' WHERE nome = 'Nome do Plano';
```

## Passo 2: Configurar Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env.local`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...  # ou sk_live_... para produção
STRIPE_PUBLISHABLE_KEY=pk_test_...  # ou pk_live_... para produção
STRIPE_WEBHOOK_SECRET=whsec_...  # Será obtido após configurar webhook
```

### 2.1 Obter Chaves de API

1. No Stripe Dashboard, vá em **Developers** > **API keys**
2. Copie a **Secret key** (começa com `sk_test_` ou `sk_live_`)
3. Copie a **Publishable key** (começa com `pk_test_` ou `pk_live_`)

### 2.2 Configurar Variáveis no Supabase

Para Edge Functions, configure as variáveis de ambiente no Supabase Dashboard:

1. Acesse **Edge Functions** > **Settings**
2. Adicione as seguintes variáveis:
   - `STRIPE_SECRET_KEY`: Sua chave secreta do Stripe
   - `STRIPE_WEBHOOK_SECRET`: Será obtido após configurar webhook

## Passo 3: Configurar Webhooks

### 3.1 Criar Endpoint de Webhook

O webhook será implementado como Edge Function (`stripe-webhooks`). Primeiro, você precisa obter a URL do webhook:

**URL do Webhook (produção):**
```
https://seu-projeto.supabase.co/functions/v1/stripe-webhooks
```

**URL do Webhook (local - usando ngrok ou similar):**
```
https://seu-ngrok-url.ngrok.io/functions/v1/stripe-webhooks
```

### 3.2 Configurar Webhook no Stripe

1. No Stripe Dashboard, vá em **Developers** > **Webhooks**
2. Clique em **Add endpoint**
3. Cole a URL do webhook
4. Selecione os eventos a escutar:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Clique em **Add endpoint**
6. Copie o **Signing secret** (começa com `whsec_...`)
7. Adicione o `STRIPE_WEBHOOK_SECRET` nas variáveis de ambiente do Supabase

## Passo 4: Testar Integração

### 4.1 Testar Checkout

1. Use o Stripe CLI para testar localmente:
```bash
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhooks
```

2. Ou teste diretamente no Stripe Dashboard usando o modo Test

### 4.2 Verificar Eventos

1. No Stripe Dashboard, vá em **Developers** > **Events**
2. Verifique se os eventos estão sendo recebidos e processados corretamente
3. Verifique os logs da Edge Function no Supabase Dashboard

## Passo 5: Configurar Portal do Cliente

O Portal do Cliente do Stripe permite que clientes gerenciem suas assinaturas. Ele será implementado via Edge Function `create-portal-session`.

### 5.1 Habilitar Portal do Cliente

1. No Stripe Dashboard, vá em **Settings** > **Billing** > **Customer portal**
2. Configure as opções desejadas:
   - Permitir cancelamento de assinatura
   - Permitir atualização de método de pagamento
   - Permitir visualização de histórico de faturas
3. Salve as configurações

## Troubleshooting

### Webhook não está recebendo eventos

1. Verifique se a URL do webhook está correta
2. Verifique se o `STRIPE_WEBHOOK_SECRET` está configurado corretamente
3. Verifique os logs da Edge Function no Supabase Dashboard
4. Use o Stripe CLI para testar localmente:
```bash
stripe trigger checkout.session.completed
```

### Erro ao criar checkout session

1. Verifique se o `STRIPE_SECRET_KEY` está configurado
2. Verifique se o `stripe_price_id` está correto na tabela `planos`
3. Verifique os logs da Edge Function

### Assinatura não está sendo atualizada

1. Verifique se o webhook está configurado corretamente
2. Verifique se a Edge Function `stripe-webhooks` está processando os eventos
3. Verifique os logs no Supabase Dashboard

## Referências

- [Documentação do Stripe](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)

