import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Schema de validação para variáveis de ambiente
const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url("VITE_SUPABASE_URL deve ser uma URL válida"),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, "VITE_SUPABASE_ANON_KEY é obrigatória"),
});

// Validação das variáveis de ambiente
const getEnvVars = () => {
  const env = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => e.path.join(".")).join(", ");
      throw new Error(
        `Variáveis de ambiente faltando ou inválidas: ${missingVars}. ` +
        `Verifique seu arquivo .env.local`
      );
    }
    throw error;
  }
};

// Cliente Supabase singleton
let supabaseClient: ReturnType<typeof createClient> | null = null;

/**
 * Obtém ou cria o cliente Supabase
 * @returns Instância do cliente Supabase configurada
 * @throws Error se as variáveis de ambiente não estiverem configuradas
 */
export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const env = getEnvVars();

  supabaseClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseClient;
}

// Exportar cliente padrão para uso direto
export const supabase = getSupabaseClient();

