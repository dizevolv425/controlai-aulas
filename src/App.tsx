import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/auth-context";
import { TenantProvider } from "@/contexts/tenant-context";
import { ProtectedRoute } from "@/components/routes/protected-route";
import { RoleGuard } from "@/components/routes/role-guard";
import { SubscriptionGuard } from "@/components/routes/subscription-guard";
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Colaborador from "./pages/dashboard/Colaborador";
import Admin from "./pages/dashboard/Admin";
import Master from "./pages/dashboard/Master";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <TenantProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/register" element={<Register />} />
              
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route
                  path="colaborador"
                  element={
                    <SubscriptionGuard>
                      <Colaborador />
                    </SubscriptionGuard>
                  }
                />
                <Route
                  path="admin"
                  element={
                    <RoleGuard allowedRoles={["admin", "master"]}>
                      <Admin />
                    </RoleGuard>
                  }
                />
                <Route
                  path="master"
                  element={
                    <RoleGuard allowedRoles={["master"]}>
                      <Master />
                    </RoleGuard>
                  }
                />
              </Route>
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TenantProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
