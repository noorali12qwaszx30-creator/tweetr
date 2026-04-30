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
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const queryClient = new QueryClient();

const AppContent = () => {
  useVersionCheck();
  return (
    <BrowserRouter>
      <AuthProvider>
        <RoleProvider>
          <CancellationReasonsProvider>
            <IssueReasonsProvider>
              <ActivityLogProvider>
                <TooltipProvider>
                  <ErrorBoundary fallbackTitle="حدث خطأ في التطبيق">
                    <PushNotificationsBridge />
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
  );
};

const PushNotificationsBridge = () => {
  usePushNotifications();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppContent />
  </QueryClientProvider>
);

export default App;
