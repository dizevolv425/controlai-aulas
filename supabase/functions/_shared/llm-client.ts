// Helper para abstrair chamadas às APIs LLM (OpenAI e Claude)
// Calcula tokens e implementa retry logic

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  tokens_used: number;
  model: string;
}

export interface LLMConfig {
  provider: "openai" | "claude" | "gemini";
  api_key: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

/**
 * Cliente para OpenAI API
 */
async function callOpenAI(
  messages: LLMMessage[],
  config: LLMConfig
): Promise<LLMResponse> {
  const model = config.model || "gpt-4o-mini";
  const temperature = config.temperature ?? 0.7;
  const max_tokens = config.max_tokens || 1000;

  const url = "https://api.openai.com/v1/chat/completions";
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.api_key}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature,
      max_tokens,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Erro desconhecido" } }));
    throw new Error(`OpenAI API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  
  return {
    content: data.choices[0]?.message?.content || "",
    tokens_used: data.usage?.total_tokens || 0,
    model: data.model || model,
  };
}

/**
 * Cliente para Claude (Anthropic) API
 */
async function callClaude(
  messages: LLMMessage[],
  config: LLMConfig
): Promise<LLMResponse> {
  const model = config.model || "claude-3-5-sonnet-20241022";
  const temperature = config.temperature ?? 0.7;
  const max_tokens = config.max_tokens || 1000;

  const url = "https://api.anthropic.com/v1/messages";
  
  // Claude requer formato diferente: system prompt separado
  const systemMessage = messages.find((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.api_key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens,
      temperature,
      system: systemMessage?.content || "",
      messages: conversationMessages.map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Erro desconhecido" } }));
    throw new Error(`Claude API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  
  // Claude retorna uso de tokens no header
  const inputTokens = parseInt(response.headers.get("x-anthropic-ratelimit-requests-token") || "0");
  const outputTokens = parseInt(response.headers.get("x-anthropic-ratelimit-requests-token") || "0");
  const totalTokens = inputTokens + outputTokens || (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

  return {
    content: data.content[0]?.text || "",
    tokens_used: totalTokens,
    model: data.model || model,
  };
}

/**
 * Cliente para Gemini (Google) API
 * Usa o endpoint nativo do Gemini
 */
async function callGemini(
  messages: LLMMessage[],
  config: LLMConfig
): Promise<LLMResponse> {
  const model = config.model || "gemini-1.5-pro";
  const temperature = config.temperature ?? 0.7;
  const max_tokens = config.max_tokens || 1000;

  // Gemini usa endpoint nativo
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.api_key}`;
  
  // Separar mensagens de sistema e conversa
  const systemMessage = messages.find((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");
  
  // Preparar mensagens para Gemini (formato contents)
  const contents: any[] = [];
  
  // Se houver system message, adicionar como primeira mensagem do usuário
  // Gemini não suporta system role nativamente
  if (systemMessage) {
    contents.push({
      role: "user",
      parts: [{ text: `[SYSTEM] ${systemMessage.content}` }],
    });
    // Adicionar resposta vazia do modelo para manter contexto
    contents.push({
      role: "model",
      parts: [{ text: "Entendido. Como posso ajudá-lo?" }],
    });
  }
  
  // Adicionar mensagens da conversa
  conversationMessages.forEach((msg) => {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: max_tokens,
        topP: 0.95,
        topK: 40,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: "Erro desconhecido" } }));
    const errorMessage = errorData.error?.message || errorData.message || response.statusText;
    throw new Error(`Gemini API Error: ${errorMessage}`);
  }

  const data = await response.json();
  
  // Extrair resposta do Gemini
  const candidate = data.candidates?.[0];
  if (!candidate || !candidate.content) {
    throw new Error("Gemini API: Resposta vazia ou inválida");
  }
  
  const content = candidate.content.parts?.[0]?.text || "";
  
  // Obter tokens usados do usageMetadata
  const usageMetadata = data.usageMetadata || {};
  const tokens_used = usageMetadata.totalTokenCount || 0;
  
  // Se não houver totalTokenCount, calcular aproximação
  const estimatedTokens = tokens_used || Math.round(
    (content.length / 4) + 
    (messages.reduce((acc, m) => acc + m.content.length, 0) / 4)
  );

  return {
    content: content.trim(),
    tokens_used: Math.max(tokens_used, estimatedTokens),
    model: model,
  };
}

/**
 * Chama a API LLM com retry logic
 */
export async function invokeLLM(
  messages: LLMMessage[],
  config: LLMConfig,
  retries = 3
): Promise<LLMResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (config.provider === "openai") {
        return await callOpenAI(messages, config);
      } else if (config.provider === "claude") {
        return await callClaude(messages, config);
      } else if (config.provider === "gemini") {
        return await callGemini(messages, config);
      } else {
        throw new Error(`Provider não suportado: ${config.provider}`);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Se for erro de autenticação, não tentar novamente
      if (lastError.message.includes("401") || lastError.message.includes("403")) {
        throw lastError;
      }

      // Se for último tentativa, lançar erro
      if (attempt === retries) {
        throw lastError;
      }

      // Esperar antes de tentar novamente (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Erro desconhecido ao chamar LLM");
}

/**
 * Mascara chave API para logs (mostra apenas últimos 4 caracteres)
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length <= 4) {
    return "****";
  }
  return "****" + apiKey.slice(-4);
}

