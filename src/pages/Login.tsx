import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, ROLE_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { User, Lock, ChefHat, Truck, ShoppingBag, Users, Settings, UtensilsCrossed, Zap } from 'lucide-react';

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  cashier: <ShoppingBag className="w-6 h-6" />,
  field: <Users className="w-6 h-6" />,
  delivery: <Truck className="w-6 h-6" />,
  takeaway: <UtensilsCrossed className="w-6 h-6" />,
  kitchen: <ChefHat className="w-6 h-6" />,
  admin: <Settings className="w-6 h-6" />,
};

const ROLE_COLORS: Record<UserRole, string> = {
  cashier: 'border-primary bg-primary/10 hover:bg-primary/20',
  field: 'border-secondary bg-secondary/10 hover:bg-secondary/20',
  delivery: 'border-info bg-info/10 hover:bg-info/20',
  takeaway: 'border-warning bg-warning/10 hover:bg-warning/20',
  kitchen: 'border-destructive bg-destructive/10 hover:bg-destructive/20',
  admin: 'border-accent bg-accent/10 hover:bg-accent/20',
};

const ROLE_TEXT_COLORS: Record<UserRole, string> = {
  cashier: 'text-primary',
  field: 'text-secondary',
  delivery: 'text-info',
  takeaway: 'text-warning',
  kitchen: 'text-destructive',
  admin: 'text-accent',
};

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showQuickLogin, setShowQuickLogin] = useState(true);
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

  // Quick login for developers
  const handleQuickLogin = (role: UserRole) => {
    const success = login(`${ROLE_LABELS[role]}`, '1234', role);
    if (success) {
      toast.success(`دخول سريع: ${ROLE_LABELS[role]}`);
      navigate('/dashboard');
    }
  };

  const roles: UserRole[] = ['cashier', 'field', 'delivery', 'takeaway', 'kitchen', 'admin'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo & Welcome */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-glow mb-3">
            <UtensilsCrossed className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">أهلاً وسهلاً بكم</h1>
          <p className="text-lg font-semibold gradient-primary bg-clip-text text-transparent" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            في جومانجي
          </p>
        </div>

        {/* Quick Login Section for Developers */}
        {showQuickLogin && (
          <div className="bg-card rounded-2xl shadow-elevated p-4 mb-4 border-2 border-dashed border-warning/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-warning" />
                <span className="font-bold text-warning">دخول سريع للمطور</span>
              </div>
              <button 
                onClick={() => setShowQuickLogin(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                إخفاء
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => handleQuickLogin(role)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${ROLE_COLORS[role]}`}
                >
                  <span className={ROLE_TEXT_COLORS[role]}>
                    {ROLE_ICONS[role]}
                  </span>
                  <span className={`text-sm font-medium ${ROLE_TEXT_COLORS[role]}`}>
                    {ROLE_LABELS[role]}
                  </span>
                </button>
              ))}
            </div>
            
            <p className="text-xs text-center text-muted-foreground mt-3">
              ⚠️ للتطوير فقط - أزل هذا القسم قبل الإنتاج
            </p>
          </div>
        )}

        {/* Regular Login Form */}
        <form onSubmit={handleLogin} className="bg-card rounded-2xl shadow-elevated p-6 space-y-5">
          {!showQuickLogin && (
            <button 
              type="button"
              onClick={() => setShowQuickLogin(true)}
              className="w-full text-sm text-warning hover:text-warning/80 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              إظهار الدخول السريع
            </button>
          )}

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
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">اختر الدور</label>
            <div className="grid grid-cols-3 gap-2">
              {roles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`
                    flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition-all duration-200
                    ${selectedRole === role 
                      ? 'border-primary bg-primary/10 shadow-soft' 
                      : 'border-border bg-background hover:border-muted-foreground'
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
