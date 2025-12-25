/**
 * Helper para chamar Edge Function de provisionamento de tenant
 */
export async function provisionTenant(
  supabaseUrl: string,
  anonKey: string,
  userData: {
    user_id: string;
    email: string;
    nome: string;
    nome_completo: string;
    empresa_nome: string;
  },
  authToken?: string
) {
  const fullUrl = `${supabaseUrl}/functions/v1/provision-tenant`;
  
  // Detectar ambiente (local vs remoto)
  const isLocal = supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1");
  
  // Preparar headers
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "apikey": anonKey,
  };

  // Adicionar token de autenticação se disponível
  // Se não houver token, usar a anon key como Bearer token
  // Isso é necessário porque o Supabase gateway requer o header Authorization
  // A Edge Function usa service_role internamente, então não precisa validar o usuário
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  } else {
    // Usar anon key como token quando não houver sessão disponível
    // A Edge Function não validará este token pois usa service_role
    headers["Authorization"] = `Bearer ${anonKey}`;
  }

  try {
    const response = await fetch(fullUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      // Tentar obter mensagem de erro da resposta
      let errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
        console.error("[provisionTenant] Erro detalhado:", errorData);
      } catch {
        // Se não conseguir parsear JSON, tentar obter texto
        try {
          const text = await response.text();
          console.error("[provisionTenant] Resposta de erro (texto):", text);
          if (text) {
            errorMessage = text.length > 200 ? text.substring(0, 200) + "..." : text;
          }
        } catch {
          // Ignorar se não conseguir ler
        }
      }

      // Mensagens específicas por status code
      if (response.status === 401) {
        throw new Error("Erro de autenticação. Faça login novamente.");
      } else if (response.status === 404) {
        throw new Error(
          "Edge Function não encontrada (404).\n\n" +
          "A Edge Function 'provision-tenant' não está deployada.\n\n" +
          "Para deployar:\n" +
          "1. Instale o Supabase CLI: npm install -g supabase\n" +
          "2. Faça login: supabase login\n" +
          "3. Link seu projeto: supabase link --project-ref <seu-project-ref>\n" +
          "4. Deploy: supabase functions deploy provision-tenant\n\n" +
          "Ou use o Dashboard do Supabase: Edge Functions > Deploy"
        );
      } else if (response.status === 0) {
        // Status 0 geralmente indica CORS ou conexão bloqueada
        throw new Error(
          "Erro de conexão (CORS ou rede bloqueada).\n\n" +
          "Verifique:\n" +
          "1. Se está usando Supabase local, certifique-se de que o Edge Runtime está rodando\n" +
          "2. Se está usando Supabase remoto, verifique se a URL está correta\n" +
          "3. Verifique configurações de CORS no Supabase Dashboard"
        );
      } else if (response.status === 500) {
        throw new Error(`Erro no servidor: ${errorMessage}`);
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[provisionTenant] Erro capturado:", error);

    // Se for erro de rede (Failed to fetch, CORS, etc.)
    if (error instanceof TypeError) {
      const isNetworkError = error.message.includes("fetch") || 
                            error.message.includes("Failed") ||
                            error.message.includes("NetworkError") ||
                            error.message.includes("Network request failed") ||
                            error.message.includes("Load failed");

      if (isNetworkError) {
        if (isLocal) {
          throw new Error(
            "Erro de conexão com Supabase local.\n\n" +
            "A Edge Function não está acessível. Verifique:\n\n" +
            "1. Se o Supabase local está rodando:\n" +
            "   supabase start\n\n" +
            "2. Se o Edge Runtime está ativo (porta 54327)\n\n" +
            "3. Se a Edge Function está servida localmente:\n" +
            "   supabase functions serve provision-tenant\n\n" +
            "4. Verifique se a URL está correta: " + supabaseUrl
          );
        } else {
          throw new Error(
            "Erro de conexão com Supabase remoto.\n\n" +
            "Verifique:\n\n" +
            "1. Se a Edge Function está deployada:\n" +
            "   supabase functions deploy provision-tenant\n\n" +
            "2. Se a URL do Supabase está correta:\n" +
            "   " + supabaseUrl + "\n\n" +
            "3. Se há problemas de CORS ou firewall\n\n" +
            "4. Verifique os logs no Dashboard do Supabase: Edge Functions > Logs"
          );
        }
      }
    }
    
    // Re-throw outros erros (já têm mensagens específicas)
    throw error;
  }
}

