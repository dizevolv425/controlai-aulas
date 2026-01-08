// Edge Function: invoke-llm
// Descriptografa chave BYOK e chama API LLM (OpenAI/Claude)
// Retorna resposta da LLM sem expor a chave

import { getSupabaseAdmin, getSupabaseClient } from "../_shared/supabase-admin.ts";
import { validateData, chatMessageSchema } from "../_shared/validation.ts";
import { invokeLLM, maskApiKey, type LLMMessage } from "../_shared/llm-client.ts";
import type { EdgeFunctionResponse } from "../_shared/types.ts";

// Headers CORS padrão
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Descriptografa uma string usando Web Crypto API
 */
async function decryptValue(encryptedBase64: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const keyData = encoder.encode(key.padEnd(32, "0").slice(0, 32));
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  
  // Decodificar base64
  const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
  
  // Extrair IV (primeiros 12 bytes) e dados criptografados
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encrypted
  );
  
  return decoder.decode(decrypted);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Permitir apenas POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Método não permitido",
      } as EdgeFunctionResponse),
      {
        status: 405,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }

  try {
    // Obter token de autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Token de autenticação não fornecido",
        } as EdgeFunctionResponse),
        {
          status: 401,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = getSupabaseClient(token);
    const supabaseAdmin = getSupabaseAdmin();

    // Verificar autenticação do usuário
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Usuário não autenticado",
        } as EdgeFunctionResponse),
        {
          status: 401,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Verificar se o usuário tem perfil
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("perfis")
      .select("id, empresa_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Perfil do usuário não encontrado",
        } as EdgeFunctionResponse),
        {
          status: 404,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Validar dados de entrada
    const body = await req.json();
    const validation = validateData(chatMessageSchema, body);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: validation.error,
        } as EdgeFunctionResponse),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    const { agente_id, message, conversation_uuid } = validation.data;

    // Buscar informações da empresa (incluindo chave BYOK)
    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from("empresas")
      .select("id, nome, chave_api_llm, contexto_ia")
      .eq("id", profile.empresa_id)
      .single();

    if (empresaError || !empresa) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Empresa não encontrada",
        } as EdgeFunctionResponse),
        {
          status: 404,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Verificar se há chave BYOK configurada
    if (!empresa.chave_api_llm) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Chave API LLM não configurada. Configure uma chave BYOK no painel administrativo.",
        } as EdgeFunctionResponse),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Extrair provider e chave criptografada
    // Formato: provider|encrypted:base64
    const [provider, encryptedPart] = empresa.chave_api_llm.split("|");
    
    if (!encryptedPart || !encryptedPart.startsWith("encrypted:")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Formato de chave inválido. Reconfigure a chave BYOK.",
        } as EdgeFunctionResponse),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    const encryptedBase64 = encryptedPart.replace("encrypted:", "");

    // Obter chave mestra de criptografia
    const encryptionKey = Deno.env.get("ENCRYPTION_KEY") || `dev-key-tenant-${empresa.id}`;

    // Descriptografar chave
    let apiKey: string;
    try {
      apiKey = await decryptValue(encryptedBase64, encryptionKey);
    } catch (decryptError) {
      console.error("Erro ao descriptografar chave:", decryptError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Erro ao descriptografar chave API. Verifique a configuração.",
        } as EdgeFunctionResponse),
        {
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Buscar informações do agente
    const { data: agente, error: agenteError } = await supabaseAdmin
      .from("agentes_ia")
      .select("id, nome, instrucoes, descricao")
      .eq("id", agente_id)
      .eq("empresa_id", profile.empresa_id)
      .eq("is_active", true)
      .single();

    if (agenteError || !agente) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Agente IA não encontrado ou inativo",
        } as EdgeFunctionResponse),
        {
          status: 404,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Preparar mensagens para LLM
    const messages: LLMMessage[] = [];
    
    // System prompt: contexto da empresa + instruções do agente
    const systemPrompt = [
      empresa.contexto_ia ? (typeof empresa.contexto_ia === 'string' ? empresa.contexto_ia : JSON.stringify(empresa.contexto_ia)) : null,
      agente.instrucoes,
    ].filter(Boolean).join("\n\n");

    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt,
      });
    }

    // Mensagem do usuário
    messages.push({
      role: "user",
      content: message,
    });

    // Chamar LLM
    const llmResponse = await invokeLLM(messages, {
      provider: provider as "openai" | "claude" | "gemini",
      api_key: apiKey,
    });

    // Registrar uso (opcional - pode ser feito de forma assíncrona)
    try {
      // TODO: Registrar tokens usados na tabela uso_recursos
      // Isso será implementado no Épico 5
    } catch (usageError) {
      // Não falhar se registro de uso falhar
      console.error("Erro ao registrar uso:", usageError);
    }

    // Log mascarado (nunca expor chave completa)
    console.log(`LLM chamado para empresa ${empresa.id}, tokens: ${llmResponse.tokens_used}, chave: ${maskApiKey(apiKey)}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          response: llmResponse.content,
          tokens_used: llmResponse.tokens_used,
          model: llmResponse.model,
        },
      } as EdgeFunctionResponse),
      {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("Erro ao invocar LLM:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao chamar LLM",
      } as EdgeFunctionResponse),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});

