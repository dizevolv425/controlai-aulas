import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  DollarSign,
  AlertTriangle,
  TrendingDown,
  MoreVertical,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Check,
  Save,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Empresa {
  id: number;
  nome: string;
  email: string | null;
  plano_id: number;
  status: string;
  is_active: boolean;
  planos?: {
    nome: string;
    preco_mensal: number;
  } | null;
  _count?: {
    perfis: number;
  };
}

interface Plano {
  id: number;
  nome: string;
  preco_mensal: number;
  max_usuarios: number;
  max_agentes: number;
  limite_mensagens_mes: number;
  stripe_price_id: string | null;
  is_active: boolean;
  features: string[] | string | null;
  cor: string | null;
}

export default function Master() {
  const { toast } = useToast();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [empresaDialogOpen, setEmpresaDialogOpen] = useState(false);
  const [planoDialogOpen, setPlanoDialogOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [editingPlano, setEditingPlano] = useState<Plano | null>(null);
  const [empresaFormData, setEmpresaFormData] = useState({
    nome: "",
    email: "",
    plano_id: 0,
    status: "active",
  });
  const [planoFormData, setPlanoFormData] = useState({
    nome: "",
    preco_mensal: 0,
    max_usuarios: 0,
    max_agentes: 0,
    limite_mensagens_mes: 0,
    stripe_price_id: "",
    is_active: true,
    features: [] as string[],
    cor: "#10b981",
  });
  const [newFeature, setNewFeature] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadEmpresas(), loadPlanos()]);
    setLoading(false);
  };

  const loadEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from("empresas")
        .select(`
          *,
          planos (
            nome,
            preco_mensal
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Buscar contagem de usuários por empresa
      const empresasWithCount = await Promise.all(
        (data || []).map(async (empresa) => {
          const { count, error: countError } = await supabase
            .from("perfis")
            .select("*", { count: "exact", head: true })
            .eq("empresa_id", empresa.id);

          if (countError) {
            console.error("Erro ao contar usuários:", countError);
          }

          return {
            ...empresa,
            _count: { perfis: count || 0 },
          };
        })
      );

      setEmpresas(empresasWithCount);
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as empresas",
        variant: "destructive",
      });
    }
  };

  const loadPlanos = async () => {
    try {
      const { data, error } = await supabase
        .from("planos")
        .select("*")
        .order("preco_mensal", { ascending: true });

      if (error) throw error;
      setPlanos(data || []);
    } catch (error) {
      console.error("Erro ao carregar planos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os planos",
        variant: "destructive",
      });
    }
  };

  // Calcular estatísticas
  const totalEmpresas = empresas.length;
  const empresasAtivas = empresas.filter((e) => e.is_active).length;
  const empresasSuspensas = empresas.filter((e) => e.status === "suspended").length;
  const receitaMensal = empresas.reduce((total, empresa) => {
    const preco = empresa.planos?.preco_mensal || 0;
    return total + (empresa.is_active ? preco : 0);
  }, 0);
  const taxaChurn = empresas.length > 0 ? ((empresasSuspensas / totalEmpresas) * 100).toFixed(1) : "0.0";

  // Distribuição por plano
  const distribuicaoPlanos = planos.map((plano) => ({
    nome: plano.nome,
    count: empresas.filter((e) => e.plano_id === plano.id).length,
    cor: plano.cor || "#10b981",
  }));

  const getPlanoColor = (nome: string) => {
    const nomeLower = nome.toLowerCase();
    if (nomeLower.includes("free")) return "bg-green-500";
    if (nomeLower.includes("básico") || nomeLower.includes("basico")) return "bg-blue-500";
    if (nomeLower.includes("empresa")) return "bg-yellow-500";
    if (nomeLower.includes("master")) return "bg-gray-500";
    return "bg-gray-500";
  };

  const filteredEmpresas = empresas.filter((empresa) =>
    empresa.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    empresa.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNewEmpresa = () => {
    setEditingEmpresa(null);
    setEmpresaFormData({
      nome: "",
      email: "",
      plano_id: planos.length > 0 ? planos[0].id : 0,
      status: "active",
    });
    setEmpresaDialogOpen(true);
  };

  const handleEditEmpresa = (empresa: Empresa) => {
    setEditingEmpresa(empresa);
    setEmpresaFormData({
      nome: empresa.nome,
      email: empresa.email || "",
      plano_id: empresa.plano_id,
      status: empresa.status,
    });
    setEmpresaDialogOpen(true);
  };

  const handleSaveEmpresa = async () => {
    if (!empresaFormData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome da empresa é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingEmpresa) {
        const { error } = await supabase
          .from("empresas")
          // @ts-ignore
          .update({
            nome: empresaFormData.nome.trim(),
            email: empresaFormData.email.trim() || null,
            plano_id: empresaFormData.plano_id,
            status: empresaFormData.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingEmpresa.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Empresa atualizada com sucesso",
        });
      } else {
        // Buscar plano Free como padrão se plano_id não foi selecionado
        let planoIdFinal = empresaFormData.plano_id;
        if (!planoIdFinal || planoIdFinal === 0) {
          const planoFree = planos.find((p) => p.nome.toLowerCase() === "free");
          planoIdFinal = planoFree?.id || planos[0]?.id || 0;
        }
        
        if (!planoIdFinal || planoIdFinal === 0) {
          toast({
            title: "Erro",
            description: "É necessário selecionar um plano",
            variant: "destructive",
          });
          return;
        }
        
        const { error } = await supabase
          .from("empresas")
          // @ts-ignore
          .insert({
            nome: empresaFormData.nome.trim(),
            email: empresaFormData.email.trim() || null,
            plano_id: planoIdFinal,
            status: empresaFormData.status,
            is_active: true,
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Empresa criada com sucesso",
        });
      }

      setEmpresaDialogOpen(false);
      loadEmpresas();
    } catch (error) {
      console.error("Erro ao salvar empresa:", error);
      toast({
        title: "Erro",
        description: editingEmpresa
          ? "Não foi possível atualizar a empresa"
          : "Não foi possível criar a empresa",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEmpresa = async (empresaId: number) => {
    if (!confirm("Tem certeza que deseja excluir esta empresa?")) return;

    try {
      const { error } = await supabase.from("empresas").delete().eq("id", empresaId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Empresa excluída com sucesso",
      });

      loadEmpresas();
    } catch (error) {
      console.error("Erro ao excluir empresa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a empresa",
        variant: "destructive",
      });
    }
  };

  const handleNewPlano = () => {
    setEditingPlano(null);
    setPlanoFormData({
      nome: "",
      preco_mensal: 0,
      max_usuarios: 0,
      max_agentes: 0,
      limite_mensagens_mes: 0,
      stripe_price_id: "",
      is_active: true,
      features: [],
      cor: "#10b981",
    });
    setPlanoDialogOpen(true);
  };

  const handleEditPlano = (plano: Plano) => {
    setEditingPlano(plano);
    // Garantir que features seja um array
    let featuresArray: string[] = [];
    if (Array.isArray(plano.features)) {
      featuresArray = plano.features;
    } else if (typeof plano.features === "string") {
      try {
        featuresArray = JSON.parse(plano.features);
      } catch {
        featuresArray = [];
      }
    }

    setPlanoFormData({
      nome: plano.nome,
      preco_mensal: plano.preco_mensal,
      max_usuarios: plano.max_usuarios,
      max_agentes: plano.max_agentes,
      limite_mensagens_mes: plano.limite_mensagens_mes,
      stripe_price_id: plano.stripe_price_id || "",
      is_active: plano.is_active,
      features: featuresArray,
      cor: plano.cor || "#10b981",
    });
    setPlanoDialogOpen(true);
  };

  const handleSavePlano = async () => {
    if (!planoFormData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome do plano é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingPlano) {
        const { error } = await supabase
          .from("planos")
          // @ts-ignore
          .update({
            nome: planoFormData.nome.trim(),
            preco_mensal: planoFormData.preco_mensal,
            max_usuarios: planoFormData.max_usuarios,
            max_agentes: planoFormData.max_agentes,
            limite_mensagens_mes: planoFormData.limite_mensagens_mes,
            stripe_price_id: planoFormData.stripe_price_id.trim() || null,
            is_active: planoFormData.is_active,
            features: planoFormData.features,
            cor: planoFormData.cor,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingPlano.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Plano atualizado com sucesso",
        });
      } else {
        const { error } = await supabase
          .from("planos")
          // @ts-ignore
          .insert({
            nome: planoFormData.nome.trim(),
            preco_mensal: planoFormData.preco_mensal,
            max_usuarios: planoFormData.max_usuarios,
            max_agentes: planoFormData.max_agentes,
            limite_mensagens_mes: planoFormData.limite_mensagens_mes,
            stripe_price_id: planoFormData.stripe_price_id.trim() || null,
            is_active: planoFormData.is_active,
            features: planoFormData.features,
            cor: planoFormData.cor,
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Plano criado com sucesso",
        });
      }

      setPlanoDialogOpen(false);
      loadPlanos();
    } catch (error) {
      console.error("Erro ao salvar plano:", error);
      toast({
        title: "Erro",
        description: editingPlano
          ? "Não foi possível atualizar o plano"
          : "Não foi possível criar o plano",
        variant: "destructive",
      });
    }
  };

  const handleDeletePlano = async (planoId: number) => {
    if (!confirm("Tem certeza que deseja excluir este plano?")) return;

    try {
      const { error } = await supabase.from("planos").delete().eq("id", planoId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Plano excluído com sucesso",
      });

      loadPlanos();
    } catch (error) {
      console.error("Erro ao excluir plano:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o plano",
        variant: "destructive",
      });
    }
  };

  const handleTogglePlano = async (planoId: number, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("planos")
        // @ts-ignore
        .update({ is_active: !currentValue })
        .eq("id", planoId);

      if (error) throw error;

      setPlanos(
        planos.map((p) => (p.id === planoId ? { ...p, is_active: !currentValue } : p))
      );

      toast({
        title: "Sucesso",
        description: "Status do plano atualizado",
      });
    } catch (error) {
      console.error("Erro ao atualizar plano:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o plano",
        variant: "destructive",
      });
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setPlanoFormData({
        ...planoFormData,
        features: [...planoFormData.features, newFeature.trim()],
      });
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setPlanoFormData({
      ...planoFormData,
      features: planoFormData.features.filter((_, i) => i !== index),
    });
  };

  const formatPrice = (preco: number) => {
    if (preco === 0) return "Grátis";
    return `R$ ${preco.toFixed(2).replace(".", ",")}/mês`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Administração da Plataforma</h1>
        <p className="text-muted-foreground mt-2">
          Gerenciamento completo de planos, clientes e operações da ControllA
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmpresas}</div>
            <p className="text-xs text-muted-foreground mt-2">{empresasAtivas} ativas</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {isNaN(receitaMensal) ? "0,00" : receitaMensal.toFixed(2).replace(".", ",")}
            </div>
            <p className="text-xs text-muted-foreground mt-2">+12.5% vs mês anterior</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Suspensas</CardTitle>
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{empresasSuspensas}</div>
            <p className="text-xs text-muted-foreground mt-2">Requer atenção</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Churn</CardTitle>
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxaChurn}%</div>
            <p className="text-xs text-muted-foreground mt-2">-0.8% vs mês anterior</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição de Planos */}
      <div className="grid gap-4 md:grid-cols-4">
        {distribuicaoPlanos.map((item) => (
          <Card key={item.nome} className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${getPlanoColor(item.nome)}`} />
              <div className="flex-1">
                <p className="text-sm font-medium">{item.nome}</p>
                <p className="text-xs text-muted-foreground">{item.count} empresas</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="clientes" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="clientes">Gerenciar Clientes</TabsTrigger>
          <TabsTrigger value="planos">Gerenciar Planos</TabsTrigger>
        </TabsList>

        {/* Aba Gerenciar Clientes */}
        <TabsContent value="clientes" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Lista de Empresas</h2>
              <p className="text-muted-foreground mt-1">
                Gerencie todas as empresas e suas assinaturas
              </p>
            </div>
            <Button
              onClick={handleNewEmpresa}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Empresa
            </Button>
          </div>

          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>

          {loading ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Carregando empresas...</p>
              </CardContent>
            </Card>
          ) : filteredEmpresas.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma empresa encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "Tente uma busca diferente" : "Adicione empresas para começar"}
                </p>
                {!searchTerm && (
                  <Button onClick={handleNewEmpresa} className="bg-green-600 hover:bg-green-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Empresa
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredEmpresas.map((empresa) => (
                <Card key={empresa.id} className="border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`h-10 w-10 rounded-lg ${getPlanoColor(empresa.planos?.nome || "")} flex items-center justify-center`}>
                          <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{empresa.nome}</h3>
                            <div className="flex items-center gap-1">
                              <div className={`h-2 w-2 rounded-full ${getPlanoColor(empresa.planos?.nome || "")}`} />
                              <Badge variant="secondary" className="text-xs">
                                {empresa.planos?.nome || "Sem plano"}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{empresa.email || "Sem email"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-semibold">
                            {!empresa.planos?.preco_mensal || empresa.planos.preco_mensal === 0
                              ? "Grátis"
                              : `R$ ${empresa.planos.preco_mensal.toFixed(2).replace(".", ",")}/mês`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {empresa._count?.perfis || 0} usuários
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {empresa._count?.perfis || 0} ativos
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditEmpresa(empresa)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteEmpresa(empresa.id)}
                              className="text-red-500"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Aba Gerenciar Planos */}
        <TabsContent value="planos" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Planos de Assinatura</h2>
              <p className="text-muted-foreground mt-1">
                Configure e gerencie os planos disponíveis
              </p>
            </div>
            <Button
              onClick={handleNewPlano}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Plano
            </Button>
          </div>

          {loading ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Carregando planos...</p>
              </CardContent>
            </Card>
          ) : planos.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum plano encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Adicione planos para começar a gerenciar assinaturas
                </p>
                <Button onClick={handleNewPlano} className="bg-green-600 hover:bg-green-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Plano
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {planos.map((plano) => (
                <Card key={plano.id} className="border-border flex flex-col h-full">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-xl font-bold">{plano.nome}</CardTitle>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="secondary" className="text-xs">Stripe</Badge>
                        <Switch
                          checked={plano.is_active}
                          onCheckedChange={() => handleTogglePlano(plano.id, plano.is_active)}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col space-y-4">
                    <div className="text-2xl font-bold">
                      {formatPrice(plano.preco_mensal)}
                    </div>
                    <div className="space-y-2 flex-1">
                      {(() => {
                        let featuresArray: string[] = [];
                        if (Array.isArray(plano.features)) {
                          featuresArray = plano.features;
                        } else if (typeof plano.features === "string") {
                          try {
                            featuresArray = JSON.parse(plano.features);
                          } catch {
                            featuresArray = [];
                          }
                        }
                        return featuresArray.length > 0 ? (
                          featuresArray.map((feature, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span className="break-words">{feature}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">Nenhuma feature configurada</p>
                        );
                      })()}
                    </div>
                    <div className="flex gap-2 pt-4 border-t mt-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditPlano(plano)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePlano(plano.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog Empresa */}
      <Dialog open={empresaDialogOpen} onOpenChange={setEmpresaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEmpresa ? "Editar Empresa" : "Nova Empresa"}
            </DialogTitle>
            <DialogDescription>
              {editingEmpresa
                ? "Atualize as informações da empresa"
                : "Preencha os dados para criar uma nova empresa"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Empresa</Label>
              <Input
                id="nome"
                placeholder="Nome da empresa"
                value={empresaFormData.nome}
                onChange={(e) =>
                  setEmpresaFormData({ ...empresaFormData, nome: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={empresaFormData.email}
                onChange={(e) =>
                  setEmpresaFormData({ ...empresaFormData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plano">Plano</Label>
              {planos.length > 0 ? (
                <Select
                  value={empresaFormData.plano_id > 0 ? empresaFormData.plano_id.toString() : planos[0].id.toString()}
                  onValueChange={(value) => {
                    const planoId = parseInt(value);
                    if (!isNaN(planoId)) {
                      setEmpresaFormData({ ...empresaFormData, plano_id: planoId });
                    }
                  }}
                >
                  <SelectTrigger id="plano">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {planos.map((plano) => (
                      <SelectItem key={plano.id} value={plano.id.toString()}>
                        {plano.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input disabled placeholder="Carregando planos..." />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={empresaFormData.status}
                onValueChange={(value) =>
                  setEmpresaFormData({ ...empresaFormData, status: value })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpresaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEmpresa} className="bg-green-600 hover:bg-green-700">
              <Save className="mr-2 h-4 w-4" />
              {editingEmpresa ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Plano */}
      <Dialog open={planoDialogOpen} onOpenChange={setPlanoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlano ? "Editar Plano" : "Novo Plano"}
            </DialogTitle>
            <DialogDescription>
              {editingPlano
                ? "Atualize as informações do plano"
                : "Configure um novo plano de assinatura"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="plano-nome">Nome do Plano</Label>
              <Input
                id="plano-nome"
                placeholder="Ex: Free, Básico, Empresa, Master"
                value={planoFormData.nome}
                onChange={(e) =>
                  setPlanoFormData({ ...planoFormData, nome: e.target.value })
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="preco">Preço Mensal (R$)</Label>
                <Input
                  id="preco"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={planoFormData.preco_mensal}
                  onChange={(e) =>
                    setPlanoFormData({
                      ...planoFormData,
                      preco_mensal: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripe-id">Stripe Price ID</Label>
                <Input
                  id="stripe-id"
                  placeholder="price_xxx"
                  value={planoFormData.stripe_price_id}
                  onChange={(e) =>
                    setPlanoFormData({ ...planoFormData, stripe_price_id: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="max-usuarios">Max Usuários</Label>
                <Input
                  id="max-usuarios"
                  type="number"
                  placeholder="0"
                  value={planoFormData.max_usuarios}
                  onChange={(e) =>
                    setPlanoFormData({
                      ...planoFormData,
                      max_usuarios: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-agentes">Max Agentes</Label>
                <Input
                  id="max-agentes"
                  type="number"
                  placeholder="0"
                  value={planoFormData.max_agentes}
                  onChange={(e) =>
                    setPlanoFormData({
                      ...planoFormData,
                      max_agentes: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limite-mensagens">Limite Mensagens/Mês</Label>
                <Input
                  id="limite-mensagens"
                  type="number"
                  placeholder="0"
                  value={planoFormData.limite_mensagens_mes}
                  onChange={(e) =>
                    setPlanoFormData({
                      ...planoFormData,
                      limite_mensagens_mes: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Features</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar feature..."
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFeature();
                    }
                  }}
                />
                <Button type="button" onClick={addFeature} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2 mt-2">
                {planoFormData.features.map((feature, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">{feature}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFeature(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cor">Cor</Label>
              <Input
                id="cor"
                type="color"
                value={planoFormData.cor}
                onChange={(e) =>
                  setPlanoFormData({ ...planoFormData, cor: e.target.value })
                }
                className="h-12"
              />
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="plano-ativo">Plano Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Planos inativos não aparecerão para novos clientes
                </p>
              </div>
              <Switch
                id="plano-ativo"
                checked={planoFormData.is_active}
                onCheckedChange={(checked) =>
                  setPlanoFormData({ ...planoFormData, is_active: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePlano} className="bg-green-600 hover:bg-green-700">
              <Save className="mr-2 h-4 w-4" />
              {editingPlano ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
