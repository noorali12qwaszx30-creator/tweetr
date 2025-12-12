import { useNavigate } from 'react-router-dom';
import { useRole } from '@/contexts/RoleContext';
import { UserRole, ROLE_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Calculator,
  Users,
  Truck,
  UtensilsCrossed,
  ChefHat,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface RoleCardProps {
  role: UserRole;
  label: string;
  icon: React.ReactNode;
  description: string;
  onAccess: () => void;
}

function RoleCard({ role, label, icon, description, onAccess }: RoleCardProps) {
  return (
    <button
      onClick={onAccess}
      className="w-full bg-card border border-border rounded-xl p-4 shadow-soft hover:shadow-elevated hover:border-primary/50 transition-all group text-right"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
            {label}
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </button>
  );
}

export function QuickAccessPanel() {
  const navigate = useNavigate();
  const { setRole } = useRole();

  const roleConfigs: {
    role: UserRole;
    icon: React.ReactNode;
    description: string;
  }[] = [
    {
      role: 'cashier',
      icon: <Calculator className="w-6 h-6" />,
      description: 'إدارة الطلبات وإنشاء الفواتير',
    },
    {
      role: 'field',
      icon: <Users className="w-6 h-6" />,
      description: 'متابعة الطلبات وتعيين السائقين',
    },
    {
      role: 'delivery',
      icon: <Truck className="w-6 h-6" />,
      description: 'استلام وتوصيل الطلبات',
    },
    {
      role: 'takeaway',
      icon: <UtensilsCrossed className="w-6 h-6" />,
      description: 'طلبات السفري والاستلام',
    },
    {
      role: 'kitchen',
      icon: <ChefHat className="w-6 h-6" />,
      description: 'تحضير الطلبات في المطبخ',
    },
  ];

  const handleQuickAccess = (role: UserRole) => {
    // Store admin mode for quick access
    localStorage.setItem('adminQuickAccess', 'true');
    localStorage.setItem('adminReturnRole', 'admin');
    
    setRole(role);
    navigate('/dashboard');
    toast.success(`تم الدخول كـ ${ROLE_LABELS[role]} بصلاحيات مطلقة`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-primary">الدخول السريع</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          الدخول المباشر لأي قسم بصلاحيات المدير التنفيذي الكاملة. يمكنك العودة للوحة المدير في أي وقت.
        </p>
      </div>

      <div className="space-y-3">
        {roleConfigs.map(({ role, icon, description }) => (
          <RoleCard
            key={role}
            role={role}
            label={ROLE_LABELS[role]}
            icon={icon}
            description={description}
            onAccess={() => handleQuickAccess(role)}
          />
        ))}
      </div>
    </div>
  );
}
