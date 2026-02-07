import { useRole } from '@/contexts/RoleContext';
import { Navigate } from 'react-router-dom';
import CashierDashboard from './dashboard/CashierDashboard';
import FieldDashboard from './dashboard/FieldDashboard';
import DeliveryDashboard from './dashboard/DeliveryDashboard';
import TakeawayDashboard from './dashboard/TakeawayDashboard';
import KitchenDashboard from './dashboard/KitchenDashboard';
import AdminDashboard from './dashboard/AdminDashboard';

export default function Dashboard() {
  const { role } = useRole();

  if (!role) {
    return <Navigate to="/" replace />;
  }

  switch (role) {
    case 'cashier':
      return <CashierDashboard />;
    case 'field':
      return <FieldDashboard />;
    case 'delivery':
      return <DeliveryDashboard />;
    case 'takeaway':
      return <TakeawayDashboard />;
    case 'kitchen':
      return <KitchenDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <Navigate to="/" replace />;
  }
}
