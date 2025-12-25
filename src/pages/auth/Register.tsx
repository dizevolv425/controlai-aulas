import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormData } from "@/lib/validations/auth-schema";
import { supabase, getSupabaseClient } from "@/lib/supabase/client";
import { AuthForm } from "@/components/auth/auth-form";
import { Loader2 } from "lucide-react";
import { provisionTenant } from "@/lib/api/provision-tenant";

export default function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError("");

    try {
      const supabaseClient = getSupabaseClient();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !anonKey) {
        setError("Configuração incompleta. Verifique as variáveis de ambiente.");
        setIsLoading(false);
        return;
      }

      // 1. Criar usuário no Supabase Auth
      // Nota: Se confirmação de email estiver habilitada no Supabase, 
      // o usuário precisará confirmar antes de fazer login
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            nome_completo: data.name,
            empresa_nome: data.company,
            nome: data.name,
          },
        },
      });

      if (authError) {
        setError(authError.message || "Erro ao criar conta. Tente novamente.");
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Erro ao criar usuário. Tente novamente.");
        setIsLoading(false);
        return;
      }

      // 2. Provisionar tenant (criar empresa e perfil) via Edge Function
      try {
        // Obter token de autenticação do usuário recém-criado
        // Se houver sessão, usar o token dela; caso contrário, tentar obter da sessão atual
        let authToken: string | undefined;
        if (authData.session?.access_token) {
          authToken = authData.session.access_token;
        } else {
          // Tentar obter sessão atual (pode estar disponível mesmo sem confirmação de email)
          const { data: sessionData } = await supabaseClient.auth.getSession();
          authToken = sessionData?.session?.access_token;
        }

        const provisionResult = await provisionTenant(
          supabaseUrl, 
          anonKey, 
          {
            user_id: authData.user.id,
            email: data.email,
            nome: data.name,
            nome_completo: data.name,
            empresa_nome: data.company,
          },
          authToken // Passar o token de autenticação
        );

        if (!provisionResult.success) {
          setError(provisionResult.error || "Erro ao criar empresa. Tente novamente.");
          setIsLoading(false);
          return;
        }
      } catch (provisionError) {
        console.error("Erro ao provisionar tenant:", provisionError);
        setError(
          provisionError instanceof Error
            ? provisionError.message
            : "Erro ao criar empresa. Verifique sua conexão e tente novamente."
        );
        setIsLoading(false);
        return;
      }

      // 3. Verificar se o usuário precisa confirmar email
      // Se authData.session for null, significa que precisa confirmar email
      if (!authData.session) {
        // Usuário criado, mas precisa confirmar email
        navigate("/auth/login?registered=true&confirm_email=true");
        return;
      }

      // 4. Se já tiver sessão (confirmação desabilitada), fazer login automático
      // Aguardar um pouco para garantir que o perfil foi criado
      setTimeout(async () => {
        const { data: perfil } = await supabaseClient
          .from("perfis")
          .select("role")
          .eq("id", authData.user.id)
          .single();

        if (perfil) {
          const role = (perfil as { role: "master" | "admin" | "user" }).role;
          if (role === "master") {
            navigate("/dashboard/master");
          } else if (role === "admin") {
            navigate("/dashboard/admin");
          } else {
            navigate("/dashboard/colaborador");
          }
        } else {
          navigate("/dashboard");
        }
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro inesperado ao criar conta. Tente novamente."
      );
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
            title="Criar Conta"
            description="Preencha os dados para começar gratuitamente"
            error={error}
            isLoading={isLoading}
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="João Silva"
                {...register("name")}
                className="bg-input border-border"
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Input
                id="company"
                type="text"
                placeholder="Minha Empresa Ltda"
                {...register("company")}
                className="bg-input border-border"
                disabled={isLoading}
              />
              {errors.company && (
                <p className="text-sm text-destructive">{errors.company.message}</p>
              )}
            </div>
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
              <p className="text-xs text-muted-foreground">
                A senha deve ter pelo menos 8 caracteres, incluindo: maiúscula, minúscula, número e caractere especial
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register("confirmPassword")}
                className="bg-input border-border"
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
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
                  Criando conta...
                </>
              ) : (
                "Criar Conta"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Já tem uma conta? </span>
            <Link to="/auth/login" className="text-primary hover:underline">
              Faça login
            </Link>
          </div>
        </AuthForm>
        </div>
      </div>
    </>
  );
}
