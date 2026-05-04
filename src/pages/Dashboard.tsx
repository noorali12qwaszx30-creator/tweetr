import { lazy, Suspense } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const CashierDashboard = lazy(() => import('./dashboard/CashierDashboard'));
const FieldDashboard = lazy(() => import('./dashboard/FieldDashboard'));
const DeliveryDashboard = lazy(() => import('./dashboard/DeliveryDashboard'));
const TakeawayDashboard = lazy(() => import('./dashboard/TakeawayDashboard'));
const KitchenDashboard = lazy(() => import('./dashboard/KitchenDashboard'));
const AdminDashboard = lazy(() => import('./dashboard/AdminDashboard'));

const DashboardFallback = () => (
  <div className="h-dvh w-full flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

export default function Dashboard() {
  const { role } = useRole();

  if (!role) {
    return <Navigate to="/" replace />;
  }

  const Dash = (() => {
    switch (role) {
      case 'cashier': return CashierDashboard;
      case 'field': return FieldDashboard;
      case 'delivery': return DeliveryDashboard;
      case 'takeaway': return TakeawayDashboard;
      case 'kitchen': return KitchenDashboard;
      case 'admin': return AdminDashboard;
      default: return null;
    }
  })();

  if (!Dash) return <Navigate to="/" replace />;

  return (
    <Suspense fallback={<DashboardFallback />}>
      <Dash />
    </Suspense>
  );
}
