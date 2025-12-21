// Edge Function: provision-tenant
// Cria empresa e perfil automaticamente após cadastro de usuário

import { getSupabaseAdmin } from "../_shared/supabase-admin.ts";
import { validateData, createPerfilSchema, createEmpresaSchema } from "../_shared/validation.ts";
import type { EdgeFunctionResponse } from "../_shared/types.ts";

Deno.serve(async (req) => {
  // Permitir apenas POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Método não permitido",
      } as EdgeFunctionResponse),
      {
        status: 405,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();

    // Validar dados de entrada
    const empresaValidation = validateData(createEmpresaSchema, {
      nome: body.empresa_nome || body.nome,
      email: body.email,
    });

    if (!empresaValidation.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: empresaValidation.error,
        } as EdgeFunctionResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const perfilValidation = validateData(createPerfilSchema, {
      user_id: body.user_id,
      empresa_id: 0, // Será atualizado após criar empresa
      role: "admin", // Primeiro usuário é sempre admin
      email: body.email,
      nome_completo: body.nome_completo || body.nome,
    });

    if (!perfilValidation.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: perfilValidation.error,
        } as EdgeFunctionResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const empresaData = empresaValidation.data;
    const perfilData = perfilValidation.data;

    // Verificar se usuário já tem empresa (idempotência)
    const { data: existingPerfil } = await supabaseAdmin
      .from("perfis")
      .select("empresa_id")
      .eq("id", body.user_id)
      .single();

    if (existingPerfil) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Tenant já existe para este usuário",
          data: { empresa_id: existingPerfil.empresa_id },
        } as EdgeFunctionResponse),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Buscar plano Free (padrão)
    const { data: planoFree, error: planoError } = await supabaseAdmin
      .from("planos")
      .select("id")
      .eq("nome", "Free")
      .eq("is_active", true)
      .single();

    if (planoError || !planoFree) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Plano Free não encontrado. Configure os planos primeiro.",
        } as EdgeFunctionResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Criar empresa (tenant)
    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from("empresas")
      .insert({
        nome: empresaData.nome,
        plano_id: planoFree.id,
        email: empresaData.email,
        status: "active",
        is_active: true,
      })
      .select("id")
      .single();

    if (empresaError || !empresa) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro ao criar empresa: ${empresaError?.message || "Erro desconhecido"}`,
        } as EdgeFunctionResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Criar perfil vinculado à empresa
    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from("perfis")
      .insert({
        id: perfilData.user_id,
        empresa_id: empresa.id,
        role: "admin",
        email: perfilData.email,
        nome_completo: perfilData.nome_completo,
        status: "active",
      })
      .select("id, empresa_id, role")
      .single();

    if (perfilError || !perfil) {
      // Rollback: deletar empresa criada
      await supabaseAdmin.from("empresas").delete().eq("id", empresa.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro ao criar perfil: ${perfilError?.message || "Erro desconhecido"}`,
        } as EdgeFunctionResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Registrar ação em auditoria
    await supabaseAdmin.from("auditoria").insert({
      user_id: perfilData.user_id,
      empresa_id: empresa.id,
      acao: "tenant_provisioned",
      entidade_tipo: "empresa",
      entidade_id: empresa.id,
      detalhes: {
        empresa_nome: empresaData.nome,
        plano_id: planoFree.id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Tenant provisionado com sucesso",
        data: {
          empresa_id: empresa.id,
          perfil_id: perfil.id,
          role: perfil.role,
        },
      } as EdgeFunctionResponse),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

