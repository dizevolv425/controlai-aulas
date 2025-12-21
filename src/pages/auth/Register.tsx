import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormData } from "@/lib/validations/auth-schema";
import { supabase } from "@/lib/supabase/client";
import { AuthForm } from "@/components/auth/auth-form";
import { Loader2 } from "lucide-react";

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
      // Criar usuário no Supabase Auth
      // O trigger handle_new_user() será executado automaticamente após o cadastro
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            nome_completo: data.name,
            empresa_nome: data.company,
            nome: data.name, // Fallback
          },
        },
      });

      if (authError) {
        setError(authError.message || "Erro ao criar conta. Tente novamente.");
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        // O provisionamento do tenant será feito via trigger/Edge Function
        // Por enquanto, redirecionamos para login
        navigate("/auth/login?registered=true");
      }
    } catch (err) {
      setError("Erro inesperado ao criar conta. Tente novamente.");
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
