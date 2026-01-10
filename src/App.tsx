import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { CancellationReasonsProvider } from "@/contexts/CancellationReasonsContext";
import { ShiftProvider } from "@/contexts/ShiftContext";
import RoleSelector from "./pages/RoleSelector";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import LoadingScreen from "./components/LoadingScreen";

// Lazy load dashboards for better performance
const KitchenDashboard = lazy(() => import("./pages/dashboard/KitchenDashboard"));
const DeliveryDashboard = lazy(() => import("./pages/dashboard/DeliveryDashboard"));
const CashierDashboard = lazy(() => import("./pages/dashboard/CashierDashboard"));
const AdminDashboard = lazy(() => import("./pages/dashboard/AdminDashboard"));
const FieldDashboard = lazy(() => import("./pages/dashboard/FieldDashboard"));
const TakeawayDashboard = lazy(() => import("./pages/dashboard/TakeawayDashboard"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserRouter>
        <RoleProvider>
          <CancellationReasonsProvider>
            <ShiftProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <Routes>
                  <Route path="/" element={<RoleSelector />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route
                    path="/kitchen"
                    element={
                      <Suspense fallback={<LoadingScreen message="جاري تحميل المطبخ..." />}>
                        <KitchenDashboard />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/delivery"
                    element={
                      <Suspense fallback={<LoadingScreen message="جاري تحميل التوصيل..." />}>
                        <DeliveryDashboard />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/cashier"
                    element={
                      <Suspense fallback={<LoadingScreen message="جاري تحميل الكاشير..." />}>
                        <CashierDashboard />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <Suspense fallback={<LoadingScreen message="جاري تحميل لوحة المدير..." />}>
                        <AdminDashboard />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/field"
                    element={
                      <Suspense fallback={<LoadingScreen message="جاري تحميل الميداني..." />}>
                        <FieldDashboard />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/takeaway"
                    element={
                      <Suspense fallback={<LoadingScreen message="جاري تحميل السفري..." />}>
                        <TakeawayDashboard />
                      </Suspense>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </TooltipProvider>
            </ShiftProvider>
          </CancellationReasonsProvider>
        </RoleProvider>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
