import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./auth-context";
import { supabase } from "@/lib/supabase/client";

interface Tenant {
  id: number;
  nome: string;
  plano_id: number;
  status: string;
  is_active: boolean;
}

interface Profile {
  id: string;
  empresa_id: number;
  role: "master" | "admin" | "user";
  email: string;
  nome_completo: string | null;
  cargo: string | null;
  status: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  profile: Profile | null;
  loading: boolean;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTenantData = async () => {
    if (!user) {
      setTenant(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      // Buscar perfil do usuário
      const { data: perfilData, error: perfilError } = await supabase
        .from("perfis")
        .select("*")
        .eq("id", user.id)
        .single();

      if (perfilError || !perfilData) {
        console.error("Erro ao buscar perfil:", perfilError);
        setTenant(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(perfilData as Profile);

      // Buscar dados da empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from("empresas")
        .select("*")
        .eq("id", perfilData.empresa_id)
        .single();

      if (empresaError || !empresaData) {
        console.error("Erro ao buscar empresa:", empresaError);
        setTenant(null);
        setLoading(false);
        return;
      }

      setTenant(empresaData as Tenant);
    } catch (error) {
      console.error("Erro ao carregar dados do tenant:", error);
      setTenant(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenantData();
  }, [user]);

  const refreshTenant = async () => {
    setLoading(true);
    await loadTenantData();
  };

  return (
    <TenantContext.Provider
      value={{
        tenant,
        profile,
        loading,
        refreshTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant deve ser usado dentro de TenantProvider");
  }
  return context;
}

