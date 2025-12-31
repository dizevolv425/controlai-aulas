import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Save, Key, Users, Plus, Edit, Trash2, CreditCard, Brain, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createUser } from "@/lib/api/create-user";
import { validateApiKey, maskApiKey } from "@/lib/validations/llm-schema";

interface Usuario {
  id: string;
  email: string;
  nome_completo: string | null;
  role: "master" | "admin" | "user";
  status: string;
  ultimo_acesso: string | null;
  cargo: string | null;
  avatar_url: string | null;
  empresa_id: number;
}

export default function Admin() {
  const { user, session } = useAuth();
  const { profile, tenant } = useTenant();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [apiKeyProvider, setApiKeyProvider] = useState<"openai" | "claude">("openai");
  const [apiKeyError, setApiKeyError] = useState("");
  const [enableByok, setEnableByok] = useState(false);
  const [savingByok, setSavingByok] = useState(false);
  const [contextoIA, setContextoIA] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlano, setLoadingPlano] = useState(true);
  const [plano, setPlano] = useState<any>(null);
  const [uso, setUso] = useState<any>(null);
  const [agentesCount, setAgentesCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    nome_completo: "",
    role: "user" as "master" | "admin" | "user",
    status: "ativo",
  });

  useEffect(() => {
    if (tenant) {
      loadUsuarios();
      loadPlanoInfo();
      loadContextoIA();
    }
  }, [tenant]);

  const loadPlanoInfo = async () => {
    if (!tenant) return;

    try {
      setLoadingPlano(true);
      
      // Buscar informações do plano
      const { data: planoData, error: planoError } = await supabase
        .from("planos")
        .select("*")
        .eq("id", tenant.plano_id)
        .single();

      if (planoError) throw planoError;
      setPlano(planoData);

      // Buscar uso atual do mês
      const mesAtual = new Date();
      const mesReferencia = `${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, "0")}-01`;
      
      const { data: usoData, error: usoError } = await supabase
        .from("uso_recursos")
        .select("*")
        .eq("empresa_id", tenant.id)
        .eq("mes_referencia", mesReferencia)
        .single();

      if (usoError && usoError.code !== "PGRST116") {
        console.error("Erro ao buscar uso:", usoError);
      }
      setUso(usoData || { mensagens_enviadas: 0, tokens_consumidos: 0, agentes_ativos: 0, usuarios_ativos: 0 });

      // Contar agentes ativos
      const { count: agentesCount, error: agentesError } = await supabase
        .from("agentes_ia")
        .select("*", { count: "exact", head: true })
        .eq("empresa_id", tenant.id)
        .eq("is_active", true);

      if (agentesError) {
        console.error("Erro ao contar agentes:", agentesError);
      }
      setAgentesCount(agentesCount || 0);
    } catch (error) {
      console.error("Erro ao carregar informações do plano:", error);
    } finally {
      setLoadingPlano(false);
    }
  };

  const loadContextoIA = async () => {
    if (!tenant) return;

    try {
      const { data, error } = await supabase
        .from("empresas")
        .select("contexto_ia")
        .eq("id", tenant.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Erro ao buscar contexto IA:", error);
        return;
      }

      if (data?.contexto_ia) {
        // Se contexto_ia é um objeto JSON, converter para string
        if (typeof data.contexto_ia === "object") {
          setContextoIA(JSON.stringify(data.contexto_ia, null, 2));
        } else {
          setContextoIA(data.contexto_ia);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar contexto IA:", error);
    }
  };

  const handleSaveContextoIA = async () => {
    if (!tenant) return;

    try {
      let contextoToSave: any = contextoIA.trim();
      
      // Tentar parsear como JSON se possível
      try {
        contextoToSave = JSON.parse(contextoIA.trim());
      } catch {
        // Se não for JSON válido, salvar como string
        contextoToSave = contextoIA.trim();
      }

      const { error } = await supabase
        .from("empresas")
        // @ts-ignore
        .update({ 
          contexto_ia: contextoToSave || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tenant.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Contexto IA atualizado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao salvar contexto IA:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o contexto IA",
        variant: "destructive",
      });
    }
  };

  const loadUsuarios = async () => {
    if (!tenant) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("perfis")
        .select("*")
        .eq("empresa_id", tenant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (usuarioId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "ativo" ? "inativo" : "ativo";
      const { error } = await supabase
        .from("perfis")
        // @ts-ignore - Supabase types may not be fully synced
        .update({ status: newStatus })
        .eq("id", usuarioId);

      if (error) throw error;

      setUsuarios(
        usuarios.map((u) => (u.id === usuarioId ? { ...u, status: newStatus } : u))
      );

      toast({
        title: "Sucesso",
        description: "Status do usuário atualizado",
      });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRole = async (usuarioId: string, newRole: "master" | "admin" | "user") => {
    try {
      const { error } = await supabase
        .from("perfis")
        // @ts-ignore - Supabase types may not be fully synced
        .update({ role: newRole })
        .eq("id", usuarioId);

      if (error) throw error;

      setUsuarios(
        usuarios.map((u) => (u.id === usuarioId ? { ...u, role: newRole } : u))
      );

      toast({
        title: "Sucesso",
        description: "Role do usuário atualizado",
      });
    } catch (error) {
      console.error("Erro ao atualizar role:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o role",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (usuarioId: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

    try {
      const { error } = await supabase.from("perfis").delete().eq("id", usuarioId);

      if (error) throw error;

      setUsuarios(usuarios.filter((u) => u.id !== usuarioId));

      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso",
      });
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o usuário",
        variant: "destructive",
      });
    }
  };

  const handleNewUsuario = () => {
    setEditingUsuario(null);
    setFormData({
      email: "",
      nome_completo: "",
      role: "user",
      status: "ativo",
    });
    setDialogOpen(true);
  };

  const handleEdit = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setFormData({
      email: usuario.email,
      nome_completo: usuario.nome_completo || "",
      role: usuario.role,
      status: usuario.status,
    });
    setDialogOpen(true);
  };

  const handleSaveUsuario = async () => {
    if (!tenant || !user) return;

    if (!formData.email.trim()) {
      toast({
        title: "Erro",
        description: "O email é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!formData.nome_completo.trim()) {
      toast({
        title: "Erro",
        description: "O nome completo é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingUsuario) {
        // Atualizar usuário existente
        const { error } = await supabase
          .from("perfis")
          // @ts-ignore - Supabase types may not be fully synced
          .update({
            email: formData.email.trim(),
            nome_completo: formData.nome_completo.trim(),
            role: formData.role,
            status: formData.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingUsuario.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Usuário atualizado com sucesso",
        });
      } else {
        // Criar novo usuário via Edge Function
        if (!session?.access_token) {
          toast({
            title: "Erro",
            description: "Sessão expirada. Faça login novamente.",
            variant: "destructive",
          });
          return;
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !anonKey) {
          toast({
            title: "Erro",
            description: "Configuração do Supabase não encontrada",
            variant: "destructive",
          });
          return;
        }

        const result = await createUser(
          supabaseUrl,
          anonKey,
          {
            email: formData.email.trim(),
            nome_completo: formData.nome_completo.trim(),
            role: formData.role,
            status: formData.status as "ativo" | "inativo",
            empresa_id: tenant.id,
          },
          session.access_token
        );

        if (!result.success) {
          throw new Error(result.error || "Erro ao criar usuário");
        }

        toast({
          title: "Sucesso",
          description: "Usuário criado com sucesso. Um email de convite foi enviado.",
        });
      }

      setDialogOpen(false);
      loadUsuarios();
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
      toast({
        title: "Erro",
        description: editingUsuario
          ? "Não foi possível atualizar o usuário"
          : "Não foi possível criar o usuário",
        variant: "destructive",
      });
    }
  };

  const getIniciais = (nome: string | null, email: string) => {
    if (nome) {
      const partes = nome.split(" ");
      if (partes.length >= 2) {
        return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
      }
      return nome.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const formatarUltimoAcesso = (ultimoAcesso: string | null) => {
    if (!ultimoAcesso) return "Nunca";
    const data = new Date(ultimoAcesso);
    const hoje = new Date();
    const diffTime = Math.abs(hoje.getTime() - data.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      master: "Master",
      admin: "Admin",
      user: "Usuário",
    };
    return labels[role] || role;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Configurações da Empresa</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as configurações do seu tenant
        </p>
      </div>

      <Tabs defaultValue="plano" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="plano">
            <BarChart3 className="mr-2 h-4 w-4" />
            Plano e Uso
          </TabsTrigger>
          <TabsTrigger value="api">
            <Key className="mr-2 h-4 w-4" />
            API & BYOK
          </TabsTrigger>
          <TabsTrigger value="contexto">
            <Brain className="mr-2 h-4 w-4" />
            Contexto IA
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            <Users className="mr-2 h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="mr-2 h-4 w-4" />
            Faturamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plano" className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Plano Atual</CardTitle>
              <CardDescription>
                Informações sobre seu plano e uso de recursos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingPlano ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">Carregando informações do plano...</p>
                </div>
              ) : (
                <>
                  {plano && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm text-muted-foreground">Plano</p>
                          <p className="text-xl font-bold mt-1">{plano.nome}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Preço Mensal</p>
                          <p className="text-xl font-bold mt-1">
                            {plano.preco_mensal === 0
                              ? "Grátis"
                              : `R$ ${plano.preco_mensal.toFixed(2).replace(".", ",")}`}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="p-4 rounded-lg border border-border">
                          <p className="text-sm text-muted-foreground mb-2">Usuários</p>
                          <div className="flex items-center justify-between">
                            <p className="text-2xl font-bold">
                              {usuarios.filter((u) => u.status === "ativo").length}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              / {plano.max_usuarios === 0 ? "∞" : plano.max_usuarios}
                            </p>
                          </div>
                          {plano.max_usuarios > 0 && (
                            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500"
                                style={{
                                  width: `${Math.min(
                                    (usuarios.filter((u) => u.status === "ativo").length / plano.max_usuarios) * 100,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>

                        <div className="p-4 rounded-lg border border-border">
                          <p className="text-sm text-muted-foreground mb-2">Agentes IA</p>
                          <div className="flex items-center justify-between">
                            <p className="text-2xl font-bold">{agentesCount}</p>
                            <p className="text-sm text-muted-foreground">
                              / {plano.max_agentes === 0 ? "∞" : plano.max_agentes}
                            </p>
                          </div>
                          {plano.max_agentes > 0 && (
                            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500"
                                style={{
                                  width: `${Math.min((agentesCount / plano.max_agentes) * 100, 100)}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>

                        <div className="p-4 rounded-lg border border-border">
                          <p className="text-sm text-muted-foreground mb-2">Mensagens/Mês</p>
                          <div className="flex items-center justify-between">
                            <p className="text-2xl font-bold">{uso?.mensagens_enviadas || 0}</p>
                            <p className="text-sm text-muted-foreground">
                              / {plano.limite_mensagens_mes === 0 ? "∞" : plano.limite_mensagens_mes}
                            </p>
                          </div>
                          {plano.limite_mensagens_mes > 0 && (
                            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-yellow-500"
                                style={{
                                  width: `${Math.min(
                                    ((uso?.mensagens_enviadas || 0) / plano.limite_mensagens_mes) * 100,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>

                        <div className="p-4 rounded-lg border border-border">
                          <p className="text-sm text-muted-foreground mb-2">Tokens Consumidos</p>
                          <p className="text-2xl font-bold">
                            {uso?.tokens_consumidos?.toLocaleString("pt-BR") || 0}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Este mês</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>BYOK - Bring Your Own Key</CardTitle>
              <CardDescription>
                Use sua própria chave de API para maior controle e segurança
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="byok-toggle" className="text-base font-medium">
                    Habilitar BYOK
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Utilize sua própria chave de API OpenAI
                  </p>
                </div>
                <Switch
                  id="byok-toggle"
                  checked={enableByok}
                  onCheckedChange={setEnableByok}
                />
              </div>

              {enableByok && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <Label htmlFor="api-provider">Provedor</Label>
                    <Select
                      value={apiKeyProvider}
                      onValueChange={(value: "openai" | "claude") => {
                        setApiKeyProvider(value);
                        setApiKey("");
                        setApiKeyError("");
                      }}
                    >
                      <SelectTrigger id="api-provider">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="claude">Claude (Anthropic)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api-key">
                      Chave API {apiKeyProvider === "openai" ? "OpenAI" : "Claude"}
                    </Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder={apiKeyProvider === "openai" ? "sk-..." : "sk-ant-..."}
                      value={apiKey}
                      onChange={(e) => {
                        const value = e.target.value;
                        setApiKey(value);
                        // Validação em tempo real
                        if (value) {
                          const validation = validateApiKey(apiKeyProvider, value);
                          if (!validation.valid) {
                            setApiKeyError(validation.error || "");
                          } else {
                            setApiKeyError("");
                          }
                        } else {
                          setApiKeyError("");
                        }
                      }}
                      className={`bg-input border-border font-mono ${
                        apiKeyError ? "border-red-500" : ""
                      }`}
                    />
                    {apiKeyError && (
                      <p className="text-xs text-red-500">{apiKeyError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Sua chave será criptografada e armazenada com segurança. 
                      {apiKeyProvider === "openai" 
                        ? " Formato esperado: sk-..." 
                        : " Formato esperado: sk-ant-..."}
                    </p>
                  </div>

                  <Button
                    onClick={async () => {
                      if (!tenant) return;
                      
                      // Validação final
                      const validation = validateApiKey(apiKeyProvider, apiKey);
                      if (!validation.valid) {
                        toast({
                          title: "Erro",
                          description: validation.error || "Chave API inválida",
                          variant: "destructive",
                        });
                        return;
                      }

                      setSavingByok(true);
                      try {
                        // TODO: Implementar Edge Function store-byok-key no Épico 4
                        // Por enquanto, apenas mostrar mensagem
                        toast({
                          title: "Em desenvolvimento",
                          description: "A funcionalidade de armazenamento criptografado será implementada no Épico 4",
                        });
                      } catch (error) {
                        console.error("Erro ao salvar chave BYOK:", error);
                        toast({
                          title: "Erro",
                          description: "Não foi possível salvar a chave API",
                          variant: "destructive",
                        });
                      } finally {
                        setSavingByok(false);
                      }
                    }}
                    disabled={!apiKey || !!apiKeyError || savingByok}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {savingByok ? "Salvando..." : "Salvar Chave API"}
                  </Button>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <h4 className="font-medium mb-2">Informações de Uso</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Requisições este mês</p>
                    <p className="text-2xl font-bold mt-1">12,458</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Custo estimado</p>
                    <p className="text-2xl font-bold mt-1">R$ 245,00</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contexto" className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Contexto IA da Empresa</CardTitle>
              <CardDescription>
                Configure o contexto padrão que será injetado em todas as conversas da sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contexto-ia">System Prompt / Contexto</Label>
                <Textarea
                  id="contexto-ia"
                  placeholder="Ex: Você é um assistente especializado em atendimento ao cliente da empresa XYZ. Sempre seja cordial e profissional..."
                  value={contextoIA}
                  onChange={(e) => setContextoIA(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Este contexto será injetado automaticamente em todas as conversas dos colaboradores da sua empresa.
                  Você pode usar JSON ou texto simples.
                </p>
              </div>
              <Button onClick={handleSaveContextoIA} className="bg-green-600 hover:bg-green-700">
                <Save className="mr-2 h-4 w-4" />
                Salvar Contexto
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Gerenciar Usuários</h2>
              <p className="text-muted-foreground mt-1">
                Controle o acesso e permissões dos colaboradores
              </p>
            </div>
            <Button
              onClick={handleNewUsuario}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Usuário
            </Button>
          </div>

          {loading ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Carregando usuários...</p>
              </CardContent>
            </Card>
          ) : usuarios.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum usuário encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Adicione usuários para começar a gerenciar sua equipe
                </p>
                <Button onClick={handleNewUsuario} className="bg-green-600 hover:bg-green-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Usuário
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {usuarios.map((usuario) => (
                <Card key={usuario.id} className="border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-green-600 text-white">
                            {getIniciais(usuario.nome_completo, usuario.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {usuario.nome_completo || usuario.email}
                          </h3>
                          <p className="text-sm text-muted-foreground">{usuario.email}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Último acesso: {formatarUltimoAcesso(usuario.ultimo_acesso)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Select
                          value={usuario.role}
                          onValueChange={(value) =>
                            handleUpdateRole(usuario.id, value as "master" | "admin" | "user")
                          }
                        >
                          <SelectTrigger className="w-[120px] bg-muted">
                            <SelectValue>{getRoleLabel(usuario.role)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Usuário</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            {profile?.role === "master" && (
                              <SelectItem value="master">Master</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`status-${usuario.id}`} className="text-sm">
                            Ativo
                          </Label>
                          <Switch
                            id={`status-${usuario.id}`}
                            checked={usuario.status === "ativo"}
                            onCheckedChange={() =>
                              handleToggleStatus(usuario.id, usuario.status)
                            }
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(usuario)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(usuario.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Faturamento e Assinatura</CardTitle>
              <CardDescription>
                Gerencie sua assinatura e métodos de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-2">Portal do Cliente Stripe</p>
                <p className="text-sm mb-4">
                  Acesse o portal do Stripe para gerenciar sua assinatura, método de pagamento e histórico de faturas.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    toast({
                      title: "Em desenvolvimento",
                      description: "A integração com o Stripe Portal será implementada no Épico 3",
                    });
                  }}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Abrir Portal do Cliente
                </Button>
              </div>
              {plano && (
                <div className="p-4 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">Plano Atual</p>
                  <p className="text-lg font-semibold mt-1">{plano.nome}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plano.preco_mensal === 0
                      ? "Plano gratuito"
                      : `R$ ${plano.preco_mensal.toFixed(2).replace(".", ",")}/mês`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para Adicionar/Editar Usuário */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUsuario ? "Editar Usuário" : "Adicionar Usuário"}
            </DialogTitle>
            <DialogDescription>
              {editingUsuario
                ? "Atualize as informações do usuário"
                : "Preencha os dados para adicionar um novo usuário"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!editingUsuario}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome_completo">Nome Completo</Label>
              <Input
                id="nome_completo"
                placeholder="Nome completo do usuário"
                value={formData.nome_completo}
                onChange={(e) =>
                  setFormData({ ...formData, nome_completo: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value as "master" | "admin" | "user" })
                }
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {profile?.role === "master" && (
                    <SelectItem value="master">Master</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveUsuario}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="mr-2 h-4 w-4" />
              {editingUsuario ? "Atualizar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
