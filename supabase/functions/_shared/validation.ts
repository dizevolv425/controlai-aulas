// Schemas de validação Zod para Edge Functions

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

/**
 * Schema para validar dados de criação de empresa
 */
export const createEmpresaSchema = z.object({
  nome: z.string().min(1).max(255),
  email: z.string().email().optional(),
  telefone: z.string().max(20).optional(),
});

/**
 * Schema para validar dados de criação de perfil
 */
export const createPerfilSchema = z.object({
  user_id: z.string().uuid(), // UUID do auth.users
  empresa_id: z.number().int().positive().optional(), // Opcional na criação inicial
  role: z.enum(["master", "admin", "user"]).default("user"),
  email: z.string().email(),
  nome_completo: z.string().max(255).optional(),
  telefone: z.string().max(20).optional(),
  cargo: z.string().max(100).optional(),
});

/**
 * Schema para validar dados de atualização de perfil
 */
export const updatePerfilSchema = z.object({
  nome_completo: z.string().max(255).optional(),
  telefone: z.string().max(20).optional(),
  cargo: z.string().max(100).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});

/**
 * Schema para validar dados de criação de agente IA
 */
export const createAgenteIASchema = z.object({
  empresa_id: z.number().int().positive(),
  nome: z.string().min(1).max(255),
  instrucoes: z.string().min(1),
  descricao: z.string().optional(),
  icone_url: z.string().url().optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  is_popular: z.boolean().default(false),
});

/**
 * Schema para validar dados de atualização de agente IA
 */
export const updateAgenteIASchema = z.object({
  nome: z.string().min(1).max(255).optional(),
  instrucoes: z.string().min(1).optional(),
  descricao: z.string().optional(),
  icone_url: z.string().url().optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  is_active: z.boolean().optional(),
  is_popular: z.boolean().optional(),
});

/**
 * Schema para validar dados de armazenamento de chave BYOK
 */
export const storeByokKeySchema = z.object({
  provider: z.enum(["openai", "claude", "gemini"]),
  api_key: z.string().min(1),
});

/**
 * Schema para validar dados de mensagem de chat
 */
export const chatMessageSchema = z.object({
  conversation_uuid: z.string().uuid().optional(),
  agente_id: z.number().int().positive(),
  message: z.string().min(1),
});

/**
 * Schema para validar dados de contexto IA da empresa
 */
export const contextoIASchema = z.object({
  system_prompt: z.string().max(2000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
});

/**
 * Helper para validar dados com Zod e retornar erro formatado
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      return { success: false, error: `Validação falhou: ${errors}` };
    }
    return { success: false, error: "Erro de validação desconhecido" };
  }
}

