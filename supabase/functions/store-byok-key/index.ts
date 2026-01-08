// Edge Function: store-byok-key
// Armazena chave API LLM de forma criptografada
// Apenas admins podem armazenar chaves BYOK

import { getSupabaseAdmin, getSupabaseClient } from "../_shared/supabase-admin.ts";
import { validateData, storeByokKeySchema } from "../_shared/validation.ts";
import type { EdgeFunctionResponse } from "../_shared/types.ts";

// Headers CORS padrão
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Criptografa uma string usando Web Crypto API
 * Usa AES-GCM para criptografia segura
 */
async function encryptValue(value: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, "0").slice(0, 32)); // AES precisa de 32 bytes
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes para AES-GCM
  const data = encoder.encode(value);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    data
  );
  
  // Combinar IV e dados criptografados e converter para base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
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

    // Verificar se o usuário é admin da empresa
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

    // Verificar se o usuário é admin ou master
    if (profile.role !== "admin" && profile.role !== "master") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Apenas administradores podem configurar chaves BYOK",
        } as EdgeFunctionResponse),
        {
          status: 403,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Validar dados de entrada
    const body = await req.json();
    const validation = validateData(storeByokKeySchema, body);
    
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

    const { provider, api_key } = validation.data;

    // Validar formato da chave
    if (provider === "openai" && !api_key.startsWith("sk-")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Chave OpenAI inválida. Deve começar com 'sk-'",
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

    if (provider === "claude" && !api_key.startsWith("sk-ant-")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Chave Claude inválida. Deve começar com 'sk-ant-'",
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

    if (provider === "gemini" && api_key.length < 20) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Chave Gemini inválida. A chave deve ter pelo menos 20 caracteres",
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

    // Obter chave mestra de criptografia
    // Em produção, configure ENCRYPTION_KEY no Supabase Dashboard
    const encryptionKey = Deno.env.get("ENCRYPTION_KEY") || `dev-key-tenant-${profile.empresa_id}`;
    
    // Criptografar chave usando Web Crypto API
    const encryptedKey = await encryptValue(api_key, encryptionKey);
    
    // Formato armazenado: provider|encrypted:base64
    const encryptedKeyData = `${provider}|encrypted:${encryptedKey}`;

    // Atualizar empresa com chave criptografada
    const { error: updateError } = await supabaseAdmin
      .from("empresas")
      .update({
        chave_api_llm: encryptedKeyData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.empresa_id);

    if (updateError) {
      throw updateError;
    }

    // Registrar ação em auditoria
    try {
      await supabaseAdmin.from("auditoria").insert({
        user_id: user.id,
        empresa_id: profile.empresa_id,
        acao: "store_byok_key",
        entidade_tipo: "empresa",
        entidade_id: profile.empresa_id,
        detalhes: {
          provider,
          key_masked: "****" + api_key.slice(-4),
        },
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
        user_agent: req.headers.get("user-agent") || "unknown",
      });
    } catch (auditError) {
      // Não falhar se auditoria falhar
      console.error("Erro ao registrar auditoria:", auditError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Chave API armazenada com sucesso",
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
    console.error("Erro ao armazenar chave BYOK:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao armazenar chave",
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
