import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth-schema";
import { supabase } from "@/lib/supabase/client";
import { AuthForm } from "@/components/auth/auth-form";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      if (searchParams.get("confirm_email") === "true") {
        setSuccess(
          "Conta criada com sucesso! Verifique seu email para confirmar a conta e depois faça login."
        );
      } else {
        setSuccess("Conta criada com sucesso! Faça login para continuar.");
      }
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        setError(authError.message || "Erro ao fazer login. Verifique suas credenciais.");
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        // Aguardar um pouco para garantir que o tenant foi provisionado
        // e então buscar o perfil para redirecionar corretamente
        setTimeout(async () => {
          const { data: perfil } = await supabase
            .from("perfis")
            .select("role")
            .eq("id", authData.user.id)
            .single();

          if (perfil) {
            // Redirecionar baseado no role
            if (perfil.role === "master") {
              navigate("/dashboard/master");
            } else if (perfil.role === "admin") {
              navigate("/dashboard/admin");
            } else {
              navigate("/dashboard/colaborador");
            }
          } else {
            // Se não tiver perfil ainda, redirecionar para dashboard geral
            navigate("/dashboard");
          }
        }, 1000);
      }
    } catch (err) {
      setError("Erro inesperado ao fazer login. Tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link to="/">
              <h1 className="text-3xl font-bold bg-hero-gradient bg-clip-text text-transparent">
                ControlIA.io
              </h1>
            </Link>
          </div>

          <AuthForm
            title="Login"
            description="Entre com suas credenciais para acessar o sistema"
            error={error}
            isLoading={isLoading}
          >
            {success && (
              <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {success}
                </AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register("email")}
                className="bg-input border-border"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                className="bg-input border-border"
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Não tem uma conta? </span>
            <Link to="/auth/register" className="text-primary hover:underline">
              Cadastre-se
            </Link>
          </div>
        </AuthForm>
        </div>
      </div>
    </>
  );
}
