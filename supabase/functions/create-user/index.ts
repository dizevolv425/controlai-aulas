// Edge Function: create-user
// Cria usuário no auth.users e perfil na tabela perfis
// Apenas admins e masters podem criar usuários

import { getSupabaseAdmin, getSupabaseClient } from "../_shared/supabase-admin.ts";
import { validateData } from "../_shared/validation.ts";
import type { EdgeFunctionResponse } from "../_shared/types.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Schema de validação para criação de usuário
const createUserSchema = z.object({
  email: z.string().email(),
  nome_completo: z.string().min(1).max(255),
  role: z.enum(["master", "admin", "user"]).default("user"),
  status: z.enum(["ativo", "inativo"]).default("ativo"),
  empresa_id: z.number().int().positive(),
});

// Headers CORS padrão
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
    const supabaseAdmin = getSupabaseAdmin();
    
    // Obter token de autenticação do header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
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

    const authToken = authHeader.replace("Bearer ", "");
    const supabaseClient = getSupabaseClient(authToken);

    // Verificar se o usuário está autenticado e tem permissão (admin ou master)
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

    // Buscar perfil do usuário autenticado
    const { data: currentProfile, error: profileError } = await supabaseAdmin
      .from("perfis")
      .select("role, empresa_id")
      .eq("id", user.id)
      .single();

    if (profileError || !currentProfile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Perfil não encontrado",
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

    // Verificar se o usuário tem permissão (admin ou master)
    if (currentProfile.role !== "admin" && currentProfile.role !== "master") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Apenas administradores podem criar usuários",
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

    const body = await req.json();

    // Validar dados de entrada
    const validation = validateData(createUserSchema, body);
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

    const userData = validation.data;

    // Verificar se o usuário autenticado tem acesso à empresa especificada
    // Masters podem criar usuários em qualquer empresa, admins apenas na sua
    if (currentProfile.role === "admin" && currentProfile.empresa_id !== userData.empresa_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Você não tem permissão para criar usuários nesta empresa",
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

    // Verificar se o email já existe no auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email === userData.email);
    
    if (emailExists) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Este email já está cadastrado",
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

    // Criar usuário no auth.users
    const { data: newAuthUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      email_confirm: false, // Usuário precisará confirmar email
      user_metadata: {
        nome_completo: userData.nome_completo,
      },
    });

    if (createUserError || !newAuthUser.user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro ao criar usuário: ${createUserError?.message || "Erro desconhecido"}`,
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

    // Criar perfil na tabela perfis
    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from("perfis")
      .insert({
        id: newAuthUser.user.id,
        empresa_id: userData.empresa_id,
        role: userData.role,
        email: userData.email,
        nome_completo: userData.nome_completo,
        status: userData.status === "ativo" ? "active" : "inactive",
      })
      .select("id, empresa_id, role, email, nome_completo")
      .single();

    if (perfilError || !perfil) {
      // Rollback: deletar usuário criado no auth
      await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro ao criar perfil: ${perfilError?.message || "Erro desconhecido"}`,
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

    // Enviar email de convite (opcional - pode ser configurado)
    try {
      await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email: userData.email,
      });
    } catch (emailError) {
      // Não falhar se o email não puder ser enviado
      console.warn("Erro ao enviar email de convite:", emailError);
    }

    // Registrar ação em auditoria
    await supabaseAdmin.from("auditoria").insert({
      user_id: user.id,
      empresa_id: userData.empresa_id,
      acao: "user_created",
      entidade_tipo: "perfil",
      entidade_id: perfil.id,
      detalhes: {
        email: userData.email,
        role: userData.role,
        created_by: currentProfile.role,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Usuário criado com sucesso",
        data: {
          user_id: perfil.id,
          email: perfil.email,
          nome_completo: perfil.nome_completo,
          role: perfil.role,
          empresa_id: perfil.empresa_id,
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
    return new Response(
      JSON.stringify({
        success: false,
        error: `Erro interno: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
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

