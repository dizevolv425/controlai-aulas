import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface AuthFormProps {
  title: string;
  description: string;
  children: ReactNode;
  error?: string;
  isLoading?: boolean;
}

export function AuthForm({ title, description, children, error, isLoading }: AuthFormProps) {
  return (
    <Card className="border-border">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className={isLoading ? "opacity-50 pointer-events-none" : ""}>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

