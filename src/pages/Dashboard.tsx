import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import CashierDashboard from './dashboard/CashierDashboard';
import FieldDashboard from './dashboard/FieldDashboard';
import DeliveryDashboard from './dashboard/DeliveryDashboard';
import TakeawayDashboard from './dashboard/TakeawayDashboard';
import KitchenDashboard from './dashboard/KitchenDashboard';
import AdminDashboard from './dashboard/AdminDashboard';

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace />;
  }

  // If user has no role assigned, show a message
  if (!user.role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto bg-warning/20 rounded-full flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold">لم يتم تعيين دور لك</h1>
          <p className="text-muted-foreground">
            يرجى التواصل مع المدير لتعيين دور لحسابك.
          </p>
          <button
            onClick={() => window.location.href = '/auth'}
            className="text-primary hover:underline"
          >
            العودة لتسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  switch (user.role) {
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
      return <Navigate to="/auth" replace />;
  }
}