/**
 * Helper para chamar Edge Function de criação de usuário
 */
export async function createUser(
  supabaseUrl: string,
  anonKey: string,
  userData: {
    email: string;
    nome_completo: string;
    role: "master" | "admin" | "user";
    status: "ativo" | "inativo";
    empresa_id: number;
  },
  authToken: string
) {
  const fullUrl = `${supabaseUrl}/functions/v1/create-user`;
  
  // Preparar headers
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "apikey": anonKey,
    "Authorization": `Bearer ${authToken}`,
  };

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
        console.error("[createUser] Erro detalhado:", errorData);
      } catch {
        // Se não conseguir parsear JSON, tentar obter texto
        try {
          const text = await response.text();
          console.error("[createUser] Resposta de erro (texto):", text);
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
      } else if (response.status === 403) {
        throw new Error("Você não tem permissão para criar usuários.");
      } else if (response.status === 404) {
        throw new Error(
          "Edge Function não encontrada (404).\n\n" +
          "A Edge Function 'create-user' não está deployada.\n\n" +
          "Para deployar:\n" +
          "1. Instale o Supabase CLI: npm install -g supabase\n" +
          "2. Faça login: supabase login\n" +
          "3. Link seu projeto: supabase link --project-ref <seu-project-ref>\n" +
          "4. Deploy: supabase functions deploy create-user\n\n" +
          "Ou use o Dashboard do Supabase: Edge Functions > Deploy"
        );
      } else if (response.status === 500) {
        throw new Error(`Erro no servidor: ${errorMessage}`);
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[createUser] Erro capturado:", error);

    // Se for erro de rede
    if (error instanceof TypeError) {
      const isNetworkError = error.message.includes("fetch") || 
                            error.message.includes("Failed") ||
                            error.message.includes("NetworkError") ||
                            error.message.includes("Network request failed") ||
                            error.message.includes("Load failed");

      if (isNetworkError) {
        const isLocal = supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1");
        
        if (isLocal) {
          throw new Error(
            "Erro de conexão com Supabase local.\n\n" +
            "A Edge Function não está acessível. Verifique:\n\n" +
            "1. Se o Supabase local está rodando:\n" +
            "   supabase start\n\n" +
            "2. Se o Edge Runtime está ativo (porta 54327)\n\n" +
            "3. Se a Edge Function está servida localmente:\n" +
            "   supabase functions serve create-user\n\n" +
            "4. Verifique se a URL está correta: " + supabaseUrl
          );
        } else {
          throw new Error(
            "Erro de conexão com Supabase remoto.\n\n" +
            "Verifique:\n\n" +
            "1. Se a Edge Function está deployada:\n" +
            "   supabase functions deploy create-user\n\n" +
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

