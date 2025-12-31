// Helper para rate limiting (100 req/min por empresa)

import { getSupabaseAdmin } from "./supabase-admin.ts";

const RATE_LIMIT = 100; // Requisições por minuto
const WINDOW_DURATION_MS = 60 * 1000; // 1 minuto em milissegundos

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Verifica se a empresa pode fazer uma requisição (rate limiting)
 * @param empresaId ID da empresa
 * @param endpoint Nome do endpoint (ex: "chat-session", "invoke-llm")
 * @returns Resultado da verificação de rate limit
 */
export async function checkRateLimit(
  empresaId: number,
  endpoint: string
): Promise<RateLimitResult> {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const windowStart = new Date(
    Math.floor(now.getTime() / WINDOW_DURATION_MS) * WINDOW_DURATION_MS
  );

  try {
    // Buscar ou criar registro de rate limit
    const { data: existing, error: fetchError } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("endpoint", endpoint)
      .eq("window_start", windowStart.toISOString())
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // Erro diferente de "não encontrado"
      console.error("Erro ao buscar rate limit:", fetchError);
      // Em caso de erro, permitir requisição (fail open)
      return {
        allowed: true,
        remaining: RATE_LIMIT,
        resetAt: new Date(windowStart.getTime() + WINDOW_DURATION_MS),
      };
    }

    if (existing) {
      // Registro existe, verificar se excedeu o limite
      if (existing.requests_count >= RATE_LIMIT) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(windowStart.getTime() + WINDOW_DURATION_MS),
        };
      }

      // Incrementar contador
      const { error: updateError } = await supabase
        .from("rate_limits")
        .update({
          requests_count: existing.requests_count + 1,
          updated_at: now.toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Erro ao atualizar rate limit:", updateError);
        // Fail open
        return {
          allowed: true,
          remaining: RATE_LIMIT - existing.requests_count - 1,
          resetAt: new Date(windowStart.getTime() + WINDOW_DURATION_MS),
        };
      }

      return {
        allowed: true,
        remaining: RATE_LIMIT - existing.requests_count - 1,
        resetAt: new Date(windowStart.getTime() + WINDOW_DURATION_MS),
      };
    } else {
      // Criar novo registro
      const { error: insertError } = await supabase
        .from("rate_limits")
        .insert({
          empresa_id: empresaId,
          endpoint,
          requests_count: 1,
          window_start: windowStart.toISOString(),
        });

      if (insertError) {
        console.error("Erro ao criar rate limit:", insertError);
        // Fail open
        return {
          allowed: true,
          remaining: RATE_LIMIT - 1,
          resetAt: new Date(windowStart.getTime() + WINDOW_DURATION_MS),
        };
      }

      return {
        allowed: true,
        remaining: RATE_LIMIT - 1,
        resetAt: new Date(windowStart.getTime() + WINDOW_DURATION_MS),
      };
    }
  } catch (error) {
    console.error("Erro inesperado em checkRateLimit:", error);
    // Fail open em caso de erro
    return {
      allowed: true,
      remaining: RATE_LIMIT,
      resetAt: new Date(windowStart.getTime() + WINDOW_DURATION_MS),
    };
  }
}

/**
 * Limpa registros antigos de rate limiting (manutenção)
 * Deve ser chamado periodicamente (ex: via cron job ou após cada verificação)
 */
export async function cleanupOldRateLimits(): Promise<void> {
  const supabase = getSupabaseAdmin();

  try {
    const { error } = await supabase.rpc("cleanup_old_rate_limits");

    if (error) {
      console.error("Erro ao limpar rate limits antigos:", error);
    }
  } catch (error) {
    console.error("Erro inesperado ao limpar rate limits:", error);
  }
}

