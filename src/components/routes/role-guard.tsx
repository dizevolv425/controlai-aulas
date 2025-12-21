import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { Loader2 } from "lucide-react";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: ("master" | "admin" | "user")[];
  fallbackPath?: string;
}

export function RoleGuard({ children, allowedRoles, fallbackPath = "/dashboard" }: RoleGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: tenantLoading } = useTenant();

  if (authLoading || tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!profile) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!allowedRoles.includes(profile.role)) {
    // Redirecionar para dashboard apropriado baseado no role
    if (profile.role === "admin") {
      return <Navigate to="/dashboard/admin" replace />;
    }
    if (profile.role === "master") {
      return <Navigate to="/dashboard/master" replace />;
    }
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}

