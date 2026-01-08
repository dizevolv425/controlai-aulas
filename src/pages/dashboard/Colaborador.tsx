import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, Shield, Coins, Cog, ShoppingCart, Rocket, ChevronDown, ChevronUp, X, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { invokeLLM } from "@/lib/api/invoke-llm";
import { useToast } from "@/hooks/use-toast";

interface Agente {
  id: number;
  nome: string;
  descricao: string | null;
  icone_url: string | null;
  cor: string | null;
  is_active: boolean;
  is_popular: boolean;
}

interface Mensagem {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Mapeamento de ícones baseado no nome do agente
const getAgentIcon = (nome: string, iconeUrl: string | null) => {
  if (iconeUrl && iconeUrl.startsWith("http")) {
    return null; // URL de imagem
  }
  
  const nomeLower = nome.toLowerCase();
  if (nomeLower.includes("jurídic") || nomeLower.includes("legal")) {
    return Shield;
  }
  if (nomeLower.includes("financeir") || nomeLower.includes("finance")) {
    return Coins;
  }
  if (nomeLower.includes("produt")) {
    return Cog;
  }
  if (nomeLower.includes("customer") || nomeLower.includes("suporte") || nomeLower.includes("atendimento")) {
    return ShoppingCart;
  }
  if (nomeLower.includes("comercial") || nomeLower.includes("venda")) {
    return Rocket;
  }
  return Bot;
};

// Função para obter cor baseada no nome
const getAgentColor = (nome: string, cor: string | null) => {
  if (cor) return cor;
  
  const nomeLower = nome.toLowerCase();
  if (nomeLower.includes("jurídic") || nomeLower.includes("legal")) {
    return "bg-pink-500";
  }
  if (nomeLower.includes("financeir") || nomeLower.includes("finance")) {
    return "bg-orange-500";
  }
  if (nomeLower.includes("produt")) {
    return "bg-purple-500";
  }
  if (nomeLower.includes("customer") || nomeLower.includes("suporte") || nomeLower.includes("atendimento")) {
    return "bg-blue-500";
  }
  if (nomeLower.includes("comercial") || nomeLower.includes("venda")) {
    return "bg-green-500";
  }
  return "bg-gray-500";
};

export default function Colaborador() {
  const { user } = useAuth();
  const { profile, tenant } = useTenant();
  const { toast } = useToast();
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [agenteSelecionado, setAgenteSelecionado] = useState<Agente | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAgentes, setShowAgentes] = useState(false);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);
  const [conversationUuid, setConversationUuid] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tenant) {
      loadAgentes();
    }
  }, [tenant]);

  const loadAgentes = async () => {
    if (!tenant) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("agentes_ia")
        .select("*")
        .eq("empresa_id", tenant.id)
        .eq("is_active", true)
        .order("is_popular", { ascending: false })
        .order("nome", { ascending: true });

      if (error) throw error;
      setAgentes(data || []);
    } catch (error) {
      console.error("Erro ao carregar agentes:", error);
    } finally {
      setLoading(false);
    }
  };

  const agentesPopulares = agentes.filter(a => a.is_popular);
  const outrosAgentes = agentes.filter(a => !a.is_popular);

  const handleSelectAgente = (agente: Agente) => {
    setAgenteSelecionado(agente);
    setShowAgentes(false);
    setChatDialogOpen(true);
    // Limpar mensagens anteriores ao selecionar novo agente
    setMensagens([]);
    setConversationUuid(null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const handleSend = async () => {
    if (!input.trim() || !agenteSelecionado || enviandoMensagem) return;

    const mensagemUsuario = input.trim();
    setInput("");
    setEnviandoMensagem(true);

    // Adicionar mensagem do usuário ao histórico
    const novaMensagemUsuario: Mensagem = {
      id: `user-${Date.now()}`,
      role: "user",
      content: mensagemUsuario,
      timestamp: new Date(),
    };

    setMensagens((prev) => [...prev, novaMensagemUsuario]);

    try {
      // Chamar Edge Function invoke-llm
      const response = await invokeLLM({
        agente_id: agenteSelecionado.id,
        message: mensagemUsuario,
        conversation_uuid: conversationUuid || undefined,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || "Erro ao obter resposta da IA");
      }

      // Adicionar resposta da IA ao histórico
      const novaMensagemIA: Mensagem = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.data.response,
        timestamp: new Date(),
      };

      setMensagens((prev) => [...prev, novaMensagemIA]);

      // Se for a primeira mensagem, gerar UUID para a conversa
      if (!conversationUuid) {
        // TODO: Criar conversa no banco e obter UUID real (será implementado no Épico 4)
        // Por enquanto, usar UUID temporário
        setConversationUuid(crypto.randomUUID());
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível enviar a mensagem",
        variant: "destructive",
      });

      // Remover mensagem do usuário se falhar
      setMensagens((prev) => prev.filter((msg) => msg.id !== novaMensagemUsuario.id));
    } finally {
      setEnviandoMensagem(false);
    }
  };

  const nomeUsuario = profile?.nome_completo || profile?.email || user?.email || "Usuário";

  return (
    <div className="space-y-8">
      {/* Mensagem de Boas-vindas */}
      <div>
        <h1 className="text-3xl font-bold">Olá, {nomeUsuario}</h1>
        <p className="text-muted-foreground mt-2">
          ControllA para sua Empresa
        </p>
      </div>

      {/* Agentes Populares */}
      {agentesPopulares.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Agentes Populares</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {agentesPopulares.map((agente) => {
              const IconComponent = getAgentIcon(agente.nome, agente.icone_url) || Bot;
              const colorClass = getAgentColor(agente.nome, agente.cor);
              
              return (
                <Card
                  key={agente.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleSelectAgente(agente)}
                >
                  <CardContent className="p-6 flex items-center gap-4">
                    {agente.icone_url && agente.icone_url.startsWith("http") ? (
                      <img
                        src={agente.icone_url}
                        alt={agente.nome}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className={`h-12 w-12 rounded-lg ${colorClass} flex items-center justify-center`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{agente.nome}</h3>
                      {agente.descricao && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {agente.descricao}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Área de Input de Prompts */}
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-2">
              <Textarea
                placeholder="Insira um comando para o ControllA"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="min-h-[100px] bg-input border-border resize-none"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || !agenteSelecionado}
                className="bg-green-600 hover:bg-green-700 text-white h-[100px] w-[100px] rounded-full shrink-0"
                size="icon"
              >
                <Send className="h-6 w-6" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Agentes (Collapsible) */}
        <Collapsible open={showAgentes} onOpenChange={setShowAgentes}>
          <Card>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-6 h-auto"
              >
                <span className="font-semibold">Escolha um Agente</span>
                {showAgentes ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Selecione um Agente
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {agentes.map((agente) => {
                      const IconComponent = getAgentIcon(agente.nome, agente.icone_url) || Bot;
                      const colorClass = getAgentColor(agente.nome, agente.cor);
                      const isSelected = agenteSelecionado?.id === agente.id;
                      
                      return (
                        <Button
                          key={agente.id}
                          variant={isSelected ? "default" : "outline"}
                          className="h-auto p-4 flex flex-col items-center gap-2"
                          onClick={() => handleSelectAgente(agente)}
                        >
                          {agente.icone_url && agente.icone_url.startsWith("http") ? (
                            <img
                              src={agente.icone_url}
                              alt={agente.nome}
                              className="h-8 w-8 rounded-lg object-cover"
                            />
                          ) : (
                            <div className={`h-8 w-8 rounded-lg ${colorClass} flex items-center justify-center`}>
                              <IconComponent className="h-4 w-4 text-white" />
                            </div>
                          )}
                          <span className="text-sm">{agente.nome}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Indicador de Agente Selecionado */}
      {agenteSelecionado && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Agente selecionado:</span>
          <span className="font-semibold text-foreground">{agenteSelecionado.nome}</span>
        </div>
      )}

      {/* Dialog de Chat */}
      <Dialog open={chatDialogOpen} onOpenChange={setChatDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {agenteSelecionado && (
                <>
                  {agenteSelecionado.icone_url && agenteSelecionado.icone_url.startsWith("http") ? (
                    <img
                      src={agenteSelecionado.icone_url}
                      alt={agenteSelecionado.nome}
                      className="h-8 w-8 rounded-lg object-cover"
                    />
                  ) : (
                    <div className={`h-8 w-8 rounded-lg ${getAgentColor(agenteSelecionado.nome, agenteSelecionado.cor)} flex items-center justify-center`}>
                      {(() => {
                        const IconComponent = getAgentIcon(agenteSelecionado.nome, agenteSelecionado.icone_url) || Bot;
                        return <IconComponent className="h-4 w-4 text-white" />;
                      })()}
                    </div>
                  )}
                  <span>{agenteSelecionado.nome}</span>
                </>
              )}
            </DialogTitle>
            {agenteSelecionado?.descricao && (
              <DialogDescription>{agenteSelecionado.descricao}</DialogDescription>
            )}
          </DialogHeader>

          {/* Área de Mensagens */}
          <div className="flex-1 overflow-y-auto min-h-[400px] max-h-[500px] space-y-4 p-4 border rounded-lg bg-muted/30">
            {mensagens.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Inicie uma conversa</p>
                  <p className="text-sm mt-2">
                    Envie uma mensagem para começar a conversar com {agenteSelecionado?.nome}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {mensagens.map((mensagem) => (
                  <div
                    key={mensagem.id}
                    className={`flex ${mensagem.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        mensagem.role === "user"
                          ? "bg-green-600 text-white"
                          : "bg-background border border-border"
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {mensagem.content}
                      </div>
                      <div
                        className={`text-xs mt-1 ${
                          mensagem.role === "user" ? "text-green-100" : "text-muted-foreground"
                        }`}
                      >
                        {mensagem.timestamp.toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                {enviandoMensagem && (
                  <div className="flex justify-start">
                    <div className="bg-background border border-border rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Área de Input */}
          <div className="flex gap-2 pt-4 border-t">
            <Textarea
              placeholder="Digite sua mensagem..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={enviandoMensagem || !agenteSelecionado}
              className="min-h-[80px] bg-input border-border resize-none"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || !agenteSelecionado || enviandoMensagem}
              className="bg-green-600 hover:bg-green-700 text-white h-[80px] w-[80px] rounded-full shrink-0"
              size="icon"
            >
              {enviandoMensagem ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
