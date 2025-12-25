import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bot, Plus, Edit, Trash2, Shield, Coins, Cog, ShoppingCart, Rocket, Save } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Agente {
  id: number;
  nome: string;
  descricao: string | null;
  instrucoes: string | null;
  icone_url: string | null;
  cor: string | null;
  is_active: boolean;
  is_popular: boolean;
  created_at: string;
  updated_at: string;
}

// Mapeamento de ícones baseado no nome do agente
const getAgentIcon = (nome: string, iconeUrl: string | null) => {
  if (iconeUrl) {
    return null; // Se tiver URL, usar imagem
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
  return Bot; // Ícone padrão
};

// Função para obter cor baseada no nome
const getAgentColor = (nome: string, cor: string | null) => {
  if (cor) return cor;
  
  const nomeLower = nome.toLowerCase();
  if (nomeLower.includes("jurídic") || nomeLower.includes("legal")) {
    return "bg-purple-500";
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

// Opções de ícones para o select
const iconOptions = [
  { value: "shield", label: "Escudo", icon: Shield },
  { value: "coins", label: "Moedas", icon: Coins },
  { value: "cog", label: "Engrenagem", icon: Cog },
  { value: "shopping-cart", label: "Carrinho", icon: ShoppingCart },
  { value: "rocket", label: "Foguete", icon: Rocket },
  { value: "bot", label: "Bot", icon: Bot },
];

// Opções de cores (hex codes)
const colorOptions = [
  { value: "#ec4899", label: "Pink", class: "bg-pink-500" },
  { value: "#f97316", label: "Orange", class: "bg-orange-500" },
  { value: "#a855f7", label: "Purple", class: "bg-purple-500" },
  { value: "#3b82f6", label: "Blue", class: "bg-blue-500" },
  { value: "#10b981", label: "Green", class: "bg-green-500" },
  { value: "#ef4444", label: "Red", class: "bg-red-500" },
  { value: "#eab308", label: "Yellow", class: "bg-yellow-500" },
  { value: "#2563eb", label: "Dark Blue", class: "bg-blue-600" },
];

export default function Agentes() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgente, setEditingAgente] = useState<Agente | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    instrucoes: "",
    icone: "bot", // Ícone selecionado (valor do select)
    cor: "#ec4899", // Cor padrão (pink)
    is_active: true,
    is_popular: false,
  });

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
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAgentes(data || []);
    } catch (error) {
      console.error("Erro ao carregar agentes:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os agentes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePopular = async (agenteId: number, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("agentes_ia")
        // @ts-ignore - Supabase types may not be fully synced
        .update({ is_popular: !currentValue })
        .eq("id", agenteId);

      if (error) throw error;
      
      setAgentes(agentes.map(a => 
        a.id === agenteId ? { ...a, is_popular: !currentValue } : a
      ));
      
      toast({
        title: "Sucesso",
        description: "Agente atualizado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao atualizar agente:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o agente",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (agenteId: number) => {
    if (!confirm("Tem certeza que deseja excluir este agente?")) return;

    try {
      const { error } = await supabase
        .from("agentes_ia")
        .delete()
        .eq("id", agenteId);

      if (error) throw error;
      
      setAgentes(agentes.filter(a => a.id !== agenteId));
      
      toast({
        title: "Sucesso",
        description: "Agente excluído com sucesso",
      });
    } catch (error) {
      console.error("Erro ao excluir agente:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o agente",
        variant: "destructive",
      });
    }
  };

  const handleNewAgent = () => {
    setEditingAgente(null);
    setFormData({
      nome: "",
      descricao: "",
      instrucoes: "",
      icone: "bot",
      cor: "#ec4899",
      is_active: true,
      is_popular: false,
    });
    setDialogOpen(true);
  };

  const handleEdit = (agenteId: number) => {
    const agente = agentes.find(a => a.id === agenteId);
    if (agente) {
      setEditingAgente(agente);
      // Se icone_url contém um dos valores válidos, usar ele; caso contrário, determinar pelo nome
      let selectedIcon = "bot";
      if (agente.icone_url && iconOptions.some(opt => opt.value === agente.icone_url)) {
        selectedIcon = agente.icone_url;
      } else {
        const nomeLower = agente.nome.toLowerCase();
        if (nomeLower.includes("jurídic") || nomeLower.includes("legal")) selectedIcon = "shield";
        else if (nomeLower.includes("financeir") || nomeLower.includes("finance")) selectedIcon = "coins";
        else if (nomeLower.includes("produt")) selectedIcon = "cog";
        else if (nomeLower.includes("customer") || nomeLower.includes("suporte") || nomeLower.includes("atendimento")) selectedIcon = "shopping-cart";
        else if (nomeLower.includes("comercial") || nomeLower.includes("venda")) selectedIcon = "rocket";
      }

      setFormData({
        nome: agente.nome,
        descricao: agente.descricao || "",
        instrucoes: agente.instrucoes || "",
        icone: selectedIcon,
        cor: agente.cor || "#ec4899",
        is_active: agente.is_active,
        is_popular: agente.is_popular,
      });
      setDialogOpen(true);
    }
  };

  const handleSaveAgente = async () => {
    if (!tenant || !user) return;

    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome do agente é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!formData.descricao.trim()) {
      toast({
        title: "Erro",
        description: "A descrição do agente é obrigatória",
        variant: "destructive",
      });
      return;
    }

    if (!formData.instrucoes.trim()) {
      toast({
        title: "Erro",
        description: "As instruções do agente são obrigatórias",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingAgente) {
        // Atualizar agente existente
        const { error } = await supabase
          .from("agentes_ia")
          // @ts-ignore - Supabase types may not be fully synced
          .update({
            nome: formData.nome.trim(),
            descricao: formData.descricao.trim() || null,
            instrucoes: formData.instrucoes.trim() || null,
            icone_url: formData.icone, // Armazenamos o tipo de ícone (shield, bot, etc)
            cor: formData.cor || null,
            is_active: formData.is_active,
            is_popular: formData.is_popular,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingAgente.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Agente atualizado com sucesso",
        });
      } else {
        // Criar novo agente
        const { error } = await supabase
          .from("agentes_ia")
          // @ts-ignore - Supabase types may not be fully synced
          .insert({
            empresa_id: tenant.id,
            nome: formData.nome.trim(),
            descricao: formData.descricao.trim() || null,
            instrucoes: formData.instrucoes.trim() || null,
            icone_url: formData.icone, // Armazenamos o tipo de ícone (shield, bot, etc)
            cor: formData.cor || null,
            is_active: formData.is_active,
            is_popular: formData.is_popular,
            created_by: user.id,
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Agente criado com sucesso",
        });
      }

      setDialogOpen(false);
      loadAgentes();
    } catch (error) {
      console.error("Erro ao salvar agente:", error);
      toast({
        title: "Erro",
        description: editingAgente 
          ? "Não foi possível atualizar o agente"
          : "Não foi possível criar o agente",
        variant: "destructive",
      });
    }
  };

  // Calcular estatísticas
  const totalAgentes = agentes.length;
  const agentesAtivos = agentes.filter(a => a.is_active).length;
  const agentesPopulares = agentes.filter(a => a.is_popular).length;
  const agentesInativos = agentes.filter(a => !a.is_active).length;

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agentes IA</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os agentes de inteligência artificial da sua empresa
          </p>
        </div>
        <Button
          onClick={handleNewAgent}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Agente
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Agentes</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAgentes}</div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agentes Ativos</CardTitle>
            <Bot className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentesAtivos}</div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agentes Populares</CardTitle>
            <Bot className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentesPopulares}</div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agentes Inativos</CardTitle>
            <Bot className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentesInativos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Agentes */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando agentes...</p>
        </div>
      ) : agentes.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum agente encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro agente IA para começar
            </p>
            <Button onClick={handleNewAgent} className="bg-green-600 hover:bg-green-700">
              <Plus className="mr-2 h-4 w-4" />
              Novo Agente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agentes.map((agente) => {
            // Determinar qual ícone usar: se icone_url é um tipo válido, usar ele; caso contrário, usar função helper
            let IconComponent: React.ComponentType<{ className?: string }> = Bot;
            if (agente.icone_url && iconOptions.some(opt => opt.value === agente.icone_url)) {
              const iconOption = iconOptions.find(opt => opt.value === agente.icone_url);
              IconComponent = iconOption?.icon || Bot;
            } else {
              IconComponent = getAgentIcon(agente.nome, agente.icone_url) || Bot;
            }
            
            const iconColor = agente.cor 
              ? (colorOptions.find(opt => opt.value === agente.cor)?.class || getAgentColor(agente.nome, agente.cor))
              : getAgentColor(agente.nome, agente.cor);
            
            return (
              <Card key={agente.id} className="border-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Se icone_url começa com http, é uma URL; caso contrário, é um tipo de ícone */}
                      {agente.icone_url && agente.icone_url.startsWith("http") ? (
                        <img
                          src={agente.icone_url}
                          alt={agente.nome}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className={`h-10 w-10 rounded-lg ${iconColor} flex items-center justify-center`}>
                          <IconComponent className="h-6 w-6 text-white" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg">{agente.nome}</CardTitle>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(agente.id)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(agente.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="mt-2">
                    {agente.descricao || "Sem descrição"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Status:</Label>
                    <Badge className={agente.is_active ? "bg-green-500" : "bg-red-500"}>
                      {agente.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Popular:</Label>
                    <Switch
                      checked={agente.is_popular}
                      onCheckedChange={() => handleTogglePopular(agente.id, agente.is_popular)}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <Label className="text-sm text-muted-foreground">Criado em:</Label>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(agente.created_at)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog para Criar/Editar Agente */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAgente ? "Editar Agente IA" : "Novo Agente IA"}
            </DialogTitle>
            <DialogDescription>
              {editingAgente 
                ? "Atualize as informações do agente"
                : "Configure um novo agente de inteligência artificial para sua empresa"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome">
                Nome do Agente <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nome"
                placeholder="Ex: Jurídico, Financeiro, Comercial"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="descricao">
                Descrição <span className="text-red-500">*</span>
              </Label>
              <Input
                id="descricao"
                placeholder="Breve descrição do agente"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>

            {/* Ícone */}
            <div className="space-y-2">
              <Label htmlFor="icone">Ícone</Label>
              <Select
                value={formData.icone}
                onValueChange={(value) => setFormData({ ...formData, icone: value })}
              >
                <SelectTrigger id="icone" className="w-full">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const iconOption = iconOptions.find(opt => opt.value === formData.icone);
                        const IconComponent = iconOption?.icon || Bot;
                        const colorOption = colorOptions.find(opt => opt.value === formData.cor);
                        const colorClass = colorOption?.class || "bg-pink-500";
                        return (
                          <>
                            <div className={`h-5 w-5 rounded ${colorClass} flex items-center justify-center`}>
                              <IconComponent className="h-3 w-3 text-white" />
                            </div>
                            <span>{iconOption?.label || "Bot"}</span>
                          </>
                        );
                      })()}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((option) => {
                    const IconComponent = option.icon;
                    const colorOption = colorOptions.find(opt => opt.value === formData.cor);
                    const colorClass = colorOption?.class || "bg-pink-500";
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={`h-5 w-5 rounded ${colorClass} flex items-center justify-center`}>
                            <IconComponent className="h-3 w-3 text-white" />
                          </div>
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Preview do ícone:</Label>
                {(() => {
                  const iconOption = iconOptions.find(opt => opt.value === formData.icone);
                  const IconComponent = iconOption?.icon || Bot;
                  const colorOption = colorOptions.find(opt => opt.value === formData.cor);
                  const colorClass = colorOption?.class || "bg-pink-500";
                  return (
                    <div className={`h-6 w-6 rounded ${colorClass} flex items-center justify-center`}>
                      <IconComponent className="h-4 w-4 text-white" />
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Cor */}
            <div className="space-y-3">
              <Label>Cor</Label>
              <div className="grid grid-cols-4 gap-3">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, cor: color.value })}
                    className={`h-12 w-full rounded-lg ${color.class} transition-all ${
                      formData.cor === color.value
                        ? "ring-2 ring-green-500 ring-offset-2 ring-offset-background"
                        : "hover:opacity-80"
                    }`}
                    aria-label={`Selecionar cor ${color.label}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Cor selecionada:</Label>
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: formData.cor }}
                  />
                  <span className="text-sm text-muted-foreground font-mono">
                    {formData.cor}
                  </span>
                </div>
              </div>
            </div>

            {/* Instruções (System Prompt) */}
            <div className="space-y-2">
              <Label htmlFor="instrucoes">
                Instruções do Agente (System Prompt) <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="instrucoes"
                placeholder="Defina o comportamento, contexto e regras do agente. Ex: 'Você é um assistente jurídico especializado em compliance e contratos...'"
                value={formData.instrucoes}
                onChange={(e) => setFormData({ ...formData, instrucoes: e.target.value })}
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Estas instruções serão usadas como contexto do sistema para o agente IA
              </p>
            </div>

            {/* Agente Ativo */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Agente Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Agentes inativos não aparecerão para os usuários
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveAgente}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="mr-2 h-4 w-4" />
              {editingAgente ? "Atualizar" : "Criar"} Agente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

