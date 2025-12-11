import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RoleProvider } from "@/contexts/RoleContext";
import { OrderProvider } from "@/contexts/OrderContext";
import { CancellationReasonsProvider } from "@/contexts/CancellationReasonsContext";
import { ShiftProvider } from "@/contexts/ShiftContext";
import RoleSelector from "./pages/RoleSelector";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <RoleProvider>
        <OrderProvider>
          <CancellationReasonsProvider>
            <ShiftProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <Routes>
                  <Route path="/" element={<RoleSelector />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </TooltipProvider>
            </ShiftProvider>
          </CancellationReasonsProvider>
        </OrderProvider>
      </RoleProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
