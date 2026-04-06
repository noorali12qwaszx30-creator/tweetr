import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { CancellationReasonsProvider } from "@/contexts/CancellationReasonsContext";
import { IssueReasonsProvider } from "@/contexts/IssueReasonsContext";
import { ActivityLogProvider } from "@/contexts/ActivityLogContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import RoleSelector from "./pages/RoleSelector";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <RoleProvider>
          <CancellationReasonsProvider>
            <IssueReasonsProvider>
              <ActivityLogProvider>
                <TooltipProvider>
                  <ErrorBoundary fallbackTitle="حدث خطأ في التطبيق">
                    <Toaster />
                    <Sonner />
                    <Routes>
                      <Route path="/" element={<RoleSelector />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </ErrorBoundary>
                </TooltipProvider>
              </ActivityLogProvider>
            </IssueReasonsProvider>
          </CancellationReasonsProvider>
        </RoleProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
