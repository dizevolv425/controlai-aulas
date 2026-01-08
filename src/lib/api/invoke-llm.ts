// Cliente API para invocar LLM via Edge Function

import { supabase } from "@/lib/supabase/client";

export interface InvokeLLMRequest {
  agente_id: number;
  message: string;
  conversation_uuid?: string;
}

export interface InvokeLLMResponse {
  success: boolean;
  data?: {
    response: string;
    tokens_used: number;
    model: string;
  };
  error?: string;
}

/**
 * Invoca LLM via Edge Function (descriptografa chave e chama API)
 */
export async function invokeLLM(
  data: InvokeLLMRequest
): Promise<InvokeLLMResponse> {
  try {
    // Obter URL da Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error("VITE_SUPABASE_URL não configurada");
    }

    const functionUrl = `${supabaseUrl}/functions/v1/invoke-llm`;

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

    const result: InvokeLLMResponse = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Erro ao chamar LLM");
    }

    return result;
  } catch (error) {
    console.error("Erro ao invocar LLM:", error);
    
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
          error: "Edge Function não encontrada. Verifique se a função invoke-llm foi deployada.",
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "Erro desconhecido ao chamar LLM",
    };
  }
}

