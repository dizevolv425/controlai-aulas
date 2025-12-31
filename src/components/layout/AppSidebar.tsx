import { Home, MessageSquare, Settings, BarChart3, Bot, Plus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/lib/supabase/client";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Chats", url: "/dashboard/colaborador", icon: MessageSquare },
  { title: "Agentes IA", url: "/dashboard/agentes", icon: Bot },
  { title: "Configurações", url: "/dashboard/admin", icon: Settings },
  { title: "Analytics", url: "/dashboard/master", icon: BarChart3 },
];

interface Conversa {
  id: number;
  titulo: string | null;
  conversation_uuid: string;
  agente_id: number | null;
  created_at: string;
  agentes_ia?: {
    nome: string;
  } | null;
}

type ConversaWithAgente = Conversa & {
  agentes_ia: {
    nome: string;
  } | null;
};

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const isCollapsed = state === "collapsed";
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useTenant();
  const [conversas, setConversas] = useState<ConversaWithAgente[]>([]);
  const [loadingConversas, setLoadingConversas] = useState(false);

  const isChatsPage = location.pathname === "/dashboard/colaborador";

  // Debug: Log do profile e role
  useEffect(() => {
    console.log("AppSidebar - Profile:", profile);
    console.log("AppSidebar - Role:", profile?.role);
    console.log("AppSidebar - Profile Loading:", profileLoading);
  }, [profile, profileLoading]);

  useEffect(() => {
    if (isChatsPage && user && profile) {
      loadConversas();
    }
  }, [isChatsPage, user, profile]);

  const loadConversas = async () => {
    if (!user || !profile) return;

    try {
      setLoadingConversas(true);
      const { data, error } = await supabase
        .from("conversas")
        .select(`
          id,
          titulo,
          conversation_uuid,
          agente_id,
          created_at,
          agentes_ia (
            nome
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setConversas(data || []);
    } catch (error) {
      console.error("Erro ao carregar conversas:", error);
    } finally {
      setLoadingConversas(false);
    }
  };

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    if (data.toDateString() === hoje.toDateString()) {
      return "Hoje";
    } else if (data.toDateString() === ontem.toDateString()) {
      return "Ontem";
    } else {
      return data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
    }
  };

  const handleNovaConversa = () => {
    navigate("/dashboard/colaborador");
  };

  const handleSelectConversa = (conversa: ConversaWithAgente) => {
    // TODO: Implementar carregamento da conversa selecionada
    navigate("/dashboard/colaborador", { state: { conversationId: conversa.id } });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          {!isCollapsed && (
            <h2 className="text-xl font-bold bg-hero-gradient bg-clip-text text-transparent">
              ControlIA.io
            </h2>
          )}
          {isCollapsed && (
            <div className="flex items-center justify-center">
              <div className="h-8 w-8 rounded-lg bg-hero-gradient" />
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {(() => {
                // Se o profile ainda está carregando, mostra apenas Dashboard
                if (profileLoading || !profile) {
                  return menuItems
                    .filter((item) => item.url === "/dashboard")
                    .map((item) => {
                      const isActive = location.pathname === item.url || 
                                      (item.url !== "/dashboard" && location.pathname.startsWith(item.url));
                      
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => {
                              navigate(item.url);
                            }}
                          >
                            <item.icon className="h-4 w-4" />
                            {!isCollapsed && <span>{item.title}</span>}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    });
                }
                
                // Usuários com role "user" só veem Chats
                const role = profile.role?.toLowerCase() || "";
                console.log("AppSidebar - Role filtrado:", role);
                if (role === "user") {
                  return menuItems
                    .filter((item) => item.url === "/dashboard/colaborador")
                    .map((item) => {
                      const isActive = location.pathname === item.url || 
                                      (item.url !== "/dashboard" && location.pathname.startsWith(item.url));
                      
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => {
                              navigate(item.url);
                            }}
                          >
                            <item.icon className="h-4 w-4" />
                            {!isCollapsed && <span>{item.title}</span>}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                }
                
                // Admins e Masters veem tudo
                return menuItems.map((item) => {
                  const isActive = location.pathname === item.url || 
                                  (item.url !== "/dashboard" && location.pathname.startsWith(item.url));
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => {
                          navigate(item.url);
                        }}
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                });
              })()}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Histórico de Conversas - Visível apenas na página de Chats */}
        {isChatsPage && (
          <SidebarGroup>
            <div className="flex items-center justify-between px-2 py-1.5">
              <SidebarGroupLabel>Conversas</SidebarGroupLabel>
              {!isCollapsed && (
                <button
                  onClick={handleNovaConversa}
                  className="h-6 w-6 rounded-md hover:bg-sidebar-accent flex items-center justify-center"
                  aria-label="Nova conversa"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {loadingConversas ? (
                  <SidebarMenuItem>
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Carregando...
                    </div>
                  </SidebarMenuItem>
                ) : conversas.length === 0 ? (
                  <SidebarMenuItem>
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Nenhuma conversa ainda
                    </div>
                  </SidebarMenuItem>
                ) : (
                  <SidebarMenuSub>
                    {conversas.map((conversa) => (
                      <SidebarMenuSubItem key={conversa.id}>
                        <SidebarMenuSubButton
                          onClick={() => handleSelectConversa(conversa)}
                          className="flex flex-col items-start gap-1 h-auto py-2"
                        >
                          <span className="truncate w-full text-left">
                            {conversa.titulo || "Nova conversa"}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {conversa.agentes_ia && (
                              <span className="truncate">{conversa.agentes_ia.nome}</span>
                            )}
                            {conversa.agentes_ia && <span>•</span>}
                            <span>{formatarData(conversa.created_at)}</span>
                          </div>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
