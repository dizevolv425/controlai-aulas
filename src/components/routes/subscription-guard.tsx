import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useTenant } from "@/hooks/use-tenant";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface SubscriptionGuardProps {
  children: ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { tenant, loading } = useTenant();
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tenant) {
    // Se o usuário está autenticado mas não tem tenant, redireciona para dashboard
    // em vez de login (pois o problema pode ser que o perfil/tenant não foi criado ainda)
    if (user) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/auth/login" replace />;
  }

  // Verificar se assinatura está ativa
  // Por enquanto, verificamos apenas se empresa está ativa
  // No Épico 3, adicionaremos verificação de assinatura Stripe
  if (!tenant.is_active || tenant.status !== "active") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Assinatura Inativa</CardTitle>
            <CardDescription>
              Sua assinatura está inativa ou expirada. Ative sua assinatura para continuar usando a plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/dashboard/admin">Gerenciar Assinatura</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

