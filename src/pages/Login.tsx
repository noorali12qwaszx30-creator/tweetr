import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, ROLE_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { User, Lock, ChefHat, Truck, ShoppingBag, Users, Settings, UtensilsCrossed } from 'lucide-react';

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  cashier: <ShoppingBag className="w-6 h-6" />,
  field: <Users className="w-6 h-6" />,
  delivery: <Truck className="w-6 h-6" />,
  takeaway: <UtensilsCrossed className="w-6 h-6" />,
  kitchen: <ChefHat className="w-6 h-6" />,
  admin: <Settings className="w-6 h-6" />,
};

const ROLE_COLORS: Record<UserRole, string> = {
  cashier: 'hover:border-primary hover:bg-primary/10',
  field: 'hover:border-secondary hover:bg-secondary/10',
  delivery: 'hover:border-info hover:bg-info/10',
  takeaway: 'hover:border-warning hover:bg-warning/10',
  kitchen: 'hover:border-destructive hover:bg-destructive/10',
  admin: 'hover:border-accent hover:bg-accent/10',
};

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRole) {
      toast.error('يرجى اختيار الدور');
      return;
    }

    if (!username || !password) {
      toast.error('يرجى إدخال اسم المستخدم وكلمة السر');
      return;
    }

    const success = login(username, password, selectedRole);
    
    if (success) {
      toast.success(`مرحباً ${username}!`);
      navigate('/dashboard');
    } else {
      toast.error('خطأ في اسم المستخدم أو كلمة السر');
    }
  };

  const roles: UserRole[] = ['cashier', 'field', 'delivery', 'takeaway', 'kitchen', 'admin'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo & Welcome */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary shadow-glow mb-4">
            <UtensilsCrossed className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">أهلاً وسهلاً بكم</h1>
          <p className="text-xl font-semibold gradient-primary bg-clip-text text-transparent" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            في جومانجي
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-card rounded-2xl shadow-elevated p-6 space-y-6">
          {/* Username */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">اسم المستخدم</label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                className="pr-10"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">كلمة السر</label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة السر"
                className="pr-10"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">اختر الدور</label>
            <div className="grid grid-cols-3 gap-3">
              {roles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`
                    flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200
                    ${selectedRole === role 
                      ? 'border-primary bg-primary/10 shadow-soft' 
                      : `border-border bg-background ${ROLE_COLORS[role]}`
                    }
                  `}
                >
                  <span className={selectedRole === role ? 'text-primary' : 'text-muted-foreground'}>
                    {ROLE_ICONS[role]}
                  </span>
                  <span className={`text-xs mt-1 font-medium ${selectedRole === role ? 'text-primary' : 'text-foreground'}`}>
                    {ROLE_LABELS[role]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <Button type="submit" size="lg" className="w-full">
            تسجيل الدخول
          </Button>

          {/* Demo Info */}
          <p className="text-xs text-center text-muted-foreground">
            للتجربة: استخدم أي اسم مستخدم مع كلمة السر "1234"
          </p>
        </form>
      </div>
    </div>
  );
}
