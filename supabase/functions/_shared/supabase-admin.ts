// Cliente Supabase Admin (service_role) para uso em Edge Functions
// IMPORTANTE: Este cliente tem acesso total ao banco, use apenas server-side

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Obtém o cliente Supabase Admin com service_role
 * Este cliente bypassa RLS e deve ser usado apenas em Edge Functions
 */
export function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configuradas nas variáveis de ambiente da Edge Function"
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Obtém o cliente Supabase do usuário autenticado
 * Este cliente respeita RLS baseado no token JWT do usuário
 */
export function getSupabaseClient(authToken: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_ANON_KEY devem estar configuradas nas variáveis de ambiente da Edge Function"
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

