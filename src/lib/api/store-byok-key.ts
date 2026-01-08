// Cliente API para armazenar chave BYOK via Edge Function

import { supabase } from "@/lib/supabase/client";

export interface StoreByokKeyRequest {
  provider: "openai" | "claude" | "gemini";
  api_key: string;
}

export interface StoreByokKeyResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Armazena chave API LLM de forma criptografada via Edge Function
 */
export async function storeByokKey(
  data: StoreByokKeyRequest
): Promise<StoreByokKeyResponse> {
  try {
    // Obter URL da Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error("VITE_SUPABASE_URL não configurada");
    }

    const functionUrl = `${supabaseUrl}/functions/v1/store-byok-key`;

    // Obter token de autenticação
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("Usuário não autenticado");
    }

    // Chamar Edge Function
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(data),
    });

    const result: StoreByokKeyResponse = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Erro ao armazenar chave BYOK");
    }

    return result;
  } catch (error) {
    console.error("Erro ao armazenar chave BYOK:", error);
    
    if (error instanceof Error) {
      // Verificar se é erro de rede
      if (error.message.includes("fetch")) {
        return {
          success: false,
          error: "Erro de conexão. Verifique sua internet e tente novamente.",
        };
      }
      
      // Verificar se é erro de função não encontrada
      if (error.message.includes("404") || error.message.includes("not found")) {
        return {
          success: false,
          error: "Edge Function não encontrada. Verifique se a função store-byok-key foi deployada.",
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "Erro desconhecido ao armazenar chave BYOK",
    };
  }
}

