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
import { NotificationsBlockOverlay } from "@/components/NotificationsBlockOverlay";
import { GpsBlockOverlay } from "@/components/GpsBlockOverlay";
import RoleSelector from "./pages/RoleSelector";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const queryClient = new QueryClient();

const AppContent = () => {
  useVersionCheck();
  useEffect(() => {
    // Create the notification channel as early as possible so that FCM
    // notifications arriving while the app is killed can be displayed
    // by the system using the correct importance/sound settings.
    if (!Capacitor.isNativePlatform()) return;
    (async () => {
      try {
        await LocalNotifications.createChannel({
          id: 'orders',
          name: 'الطلبات',
          description: 'تنبيهات الطلبات الجديدة وتغيير الحالات',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#F97316',
        });
      } catch {
        // ignore
      }
    })();
  }, []);
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
                    <NotificationsBlockOverlay />
                    <GpsBlockOverlay />
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
