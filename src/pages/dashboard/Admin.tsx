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
import { Save, Key, Users, Plus, Edit, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createUser } from "@/lib/api/create-user";

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
  const [enableByok, setEnableByok] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
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
    }
  }, [tenant]);

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

      <Tabs defaultValue="api" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="api">
            <Key className="mr-2 h-4 w-4" />
            API & BYOK
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            <Users className="mr-2 h-4 w-4" />
            Usuários
          </TabsTrigger>
        </TabsList>

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
                <div className="space-y-2 pt-4 border-t border-border">
                  <Label htmlFor="api-key">Chave API OpenAI</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="bg-input border-border font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Sua chave será criptografada e armazenada com segurança
                  </p>
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
