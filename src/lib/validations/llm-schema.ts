import { z } from "zod";

/**
 * Schema de validação para chaves API LLM
 */

// Validação para chave OpenAI
const openAIKeySchema = z
  .string()
  .min(1, "A chave API é obrigatória")
  .startsWith("sk-", "Chave OpenAI deve começar com 'sk-'")
  .min(20, "Chave OpenAI muito curta")
  .max(200, "Chave OpenAI muito longa");

// Validação para chave Claude (Anthropic)
const claudeKeySchema = z
  .string()
  .min(1, "A chave API é obrigatória")
  .startsWith("sk-ant-", "Chave Claude deve começar com 'sk-ant-'")
  .min(20, "Chave Claude muito curta")
  .max(200, "Chave Claude muito longa");

// Validação para chave Gemini (Google)
// Nota: Chaves Gemini não têm prefixo fixo, são geralmente strings longas
const geminiKeySchema = z
  .string()
  .min(1, "A chave API é obrigatória")
  .min(20, "Chave Gemini muito curta")
  .max(200, "Chave Gemini muito longa");

/**
 * Schema para formulário BYOK
 */
export const byokFormSchema = z.object({
  provider: z.enum(["openai", "claude", "gemini"], {
    required_error: "Selecione um provedor",
  }),
  api_key: z.string().min(1, "A chave API é obrigatória"),
}).refine(
  (data) => {
    if (data.provider === "openai") {
      return openAIKeySchema.safeParse(data.api_key).success;
    }
    if (data.provider === "claude") {
      return claudeKeySchema.safeParse(data.api_key).success;
    }
    if (data.provider === "gemini") {
      return geminiKeySchema.safeParse(data.api_key).success;
    }
    return true;
  },
  {
    message: "Formato de chave API inválido para o provedor selecionado",
    path: ["api_key"],
  }
);

export type ByokFormData = z.infer<typeof byokFormSchema>;

/**
 * Valida uma chave API sem usar o schema completo
 * Útil para validação em tempo real
 */
export function validateApiKey(provider: "openai" | "claude" | "gemini", key: string): {
  valid: boolean;
  error?: string;
} {
  if (!key || key.trim().length === 0) {
    return { valid: false, error: "A chave API é obrigatória" };
  }

  if (provider === "openai") {
    if (!key.startsWith("sk-")) {
      return { valid: false, error: "Chave OpenAI deve começar com 'sk-'" };
    }
    if (key.length < 20) {
      return { valid: false, error: "Chave OpenAI muito curta" };
    }
    if (key.length > 200) {
      return { valid: false, error: "Chave OpenAI muito longa" };
    }
  }

  if (provider === "claude") {
    if (!key.startsWith("sk-ant-")) {
      return { valid: false, error: "Chave Claude deve começar com 'sk-ant-'" };
    }
    if (key.length < 20) {
      return { valid: false, error: "Chave Claude muito curta" };
    }
    if (key.length > 200) {
      return { valid: false, error: "Chave Claude muito longa" };
    }
  }

  if (provider === "gemini") {
    // Chaves Gemini não têm prefixo fixo, são geralmente strings longas
    if (key.length < 20) {
      return { valid: false, error: "Chave Gemini muito curta" };
    }
    if (key.length > 200) {
      return { valid: false, error: "Chave Gemini muito longa" };
    }
  }

  return { valid: true };
}

/**
 * Mascara uma chave API para exibição (mostra apenas últimos 4 caracteres)
 */
export function maskApiKey(key: string): string {
  if (!key || key.length <= 4) {
    return "****";
  }
  return "****" + key.slice(-4);
}

