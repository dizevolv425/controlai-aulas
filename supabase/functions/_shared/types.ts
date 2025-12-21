// Tipos TypeScript compartilhados entre Edge Functions

/**
 * Tipos de roles de usuário
 */
export type UserRole = "master" | "admin" | "user";

/**
 * Status de empresa
 */
export type EmpresaStatus = "active" | "suspended" | "inactive";

/**
 * Status de perfil
 */
export type PerfilStatus = "active" | "inactive" | "suspended";

/**
 * Status de conversa
 */
export type ConversaStatus = "active" | "archived" | "deleted";

/**
 * Estrutura de resposta padrão das Edge Functions
 */
export interface EdgeFunctionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Dados do perfil do usuário autenticado
 */
export interface UserProfile {
  id: string; // UUID
  empresa_id: number;
  role: UserRole;
  email: string;
  nome_completo: string | null;
  telefone: string | null;
  cargo: string | null;
  status: PerfilStatus;
}

/**
 * Dados da empresa (tenant)
 */
export interface Empresa {
  id: number;
  nome: string;
  plano_id: number;
  stripe_customer_id: string | null;
  status: EmpresaStatus;
  is_active: boolean;
}

/**
 * Dados do plano
 */
export interface Plano {
  id: number;
  nome: string;
  preco_mensal: number;
  max_usuarios: number;
  max_agentes: number;
  limite_mensagens_mes: number;
  stripe_price_id: string | null;
}

/**
 * Dados de auditoria
 */
export interface AuditLog {
  user_id: number | null;
  empresa_id: number | null;
  acao: string;
  entidade_tipo: string | null;
  entidade_id: number | null;
  detalhes: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Dados de uso de recursos
 */
export interface UsoRecursos {
  empresa_id: number;
  mes_referencia: string; // YYYY-MM-DD
  mensagens_enviadas: number;
  tokens_consumidos: number;
  agentes_ativos: number;
  usuarios_ativos: number;
}

/**
 * Dados de agente IA
 */
export interface AgenteIA {
  id: number;
  empresa_id: number;
  nome: string;
  instrucoes: string;
  icone_url: string | null;
  descricao: string | null;
  is_active: boolean;
  is_popular: boolean;
  cor: string | null;
  created_by: number | null;
}

/**
 * Dados de conversa
 */
export interface Conversa {
  id: number;
  conversation_uuid: string;
  empresa_id: number;
  user_id: number;
  agente_id: number;
  mensagens: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: string;
  }>;
  titulo: string | null;
  tokens_usados: number;
  status: ConversaStatus;
  contexto_atual: Record<string, unknown>;
}

