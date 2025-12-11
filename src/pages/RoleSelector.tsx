import { useNavigate } from 'react-router-dom';
import { useRole } from '@/contexts/RoleContext';
import { UserRole, ROLE_LABELS } from '@/types';
import { 
  Calculator, 
  MapPin, 
  Truck, 
  ShoppingBag, 
  ChefHat, 
  Shield,
  Utensils
} from 'lucide-react';

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  cashier: <Calculator className="w-8 h-8" />,
  field: <MapPin className="w-8 h-8" />,
  delivery: <Truck className="w-8 h-8" />,
  takeaway: <ShoppingBag className="w-8 h-8" />,
  kitchen: <ChefHat className="w-8 h-8" />,
  admin: <Shield className="w-8 h-8" />,
};

const ROLES: UserRole[] = ['cashier', 'field', 'delivery', 'takeaway', 'kitchen', 'admin'];

export default function RoleSelector() {
  const navigate = useNavigate();
  const { setRole } = useRole();

  const handleSelectRole = (role: UserRole) => {
    setRole(role);
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Utensils className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">نظام إدارة المطعم</h1>
          <p className="text-muted-foreground">اختر دورك للدخول إلى النظام</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {ROLES.map((role) => (
            <button
              key={role}
              onClick={() => handleSelectRole(role)}
              className="bg-card hover:bg-accent border border-border rounded-2xl p-6 transition-all duration-200 hover:scale-105 hover:shadow-lg group"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {ROLE_ICONS[role]}
                </div>
                <span className="font-semibold text-lg">{ROLE_LABELS[role]}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
