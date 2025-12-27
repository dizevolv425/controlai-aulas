import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, Shield, Coins, Cog, ShoppingCart, Rocket, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Agente {
  id: number;
  nome: string;
  descricao: string | null;
  icone_url: string | null;
  cor: string | null;
  is_active: boolean;
  is_popular: boolean;
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
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [agenteSelecionado, setAgenteSelecionado] = useState<Agente | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAgentes, setShowAgentes] = useState(false);

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
  };

  const handleSend = () => {
    if (!input.trim() || !agenteSelecionado) return;
    // TODO: Implementar envio de mensagem
    console.log("Enviar mensagem:", input, "para agente:", agenteSelecionado.nome);
    setInput("");
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
    </div>
  );
}
