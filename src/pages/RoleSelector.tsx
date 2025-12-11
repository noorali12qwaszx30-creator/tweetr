import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, ROLE_LABELS } from '@/types';
import { 
  Calculator, 
  MapPin, 
  Truck, 
  ShoppingBag, 
  ChefHat, 
  Shield,
  Utensils,
  ArrowRight,
  User,
  Lock,
  AlertCircle,
  Phone,
  Code,
  Zap
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  cashier: <Calculator className="w-8 h-8" />,
  field: <MapPin className="w-8 h-8" />,
  delivery: <Truck className="w-8 h-8" />,
  takeaway: <ShoppingBag className="w-8 h-8" />,
  kitchen: <ChefHat className="w-8 h-8" />,
  admin: <Shield className="w-8 h-8" />,
};

const ROLES: UserRole[] = ['cashier', 'field', 'delivery', 'takeaway', 'kitchen', 'admin'];

// وضع المبرمج - للتجربة فقط (احذف هذا قبل الإنتاج)
const DEV_MODE = true;

export default function RoleSelector() {
  const navigate = useNavigate();
  const { setRole } = useRole();
  const { login } = useAuth();
  
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDevMode, setShowDevMode] = useState(false);

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setError(null);
  };

  // دخول مباشر بدون تسجيل (للمبرمج فقط)
  const handleDevAccess = (role: UserRole) => {
    setRole(role);
    toast.success(`دخول مباشر: ${ROLE_LABELS[role]}`);
    navigate('/dashboard', { replace: true });
  };

  const handleBack = () => {
    setSelectedRole(null);
    setUsername('');
    setPassword('');
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم والرمز');
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error: loginError } = await login(username, password);

    if (loginError) {
      setError(loginError);
      setIsLoading(false);
      return;
    }

    // Login successful
    setRole(selectedRole!);
    toast.success('تم تسجيل الدخول بنجاح');
    navigate('/dashboard', { replace: true });
  };

  // Login form after role selection
  if (selectedRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة لاختيار الدور</span>
            </button>

            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                {ROLE_ICONS[selectedRole]}
              </div>
              <h2 className="text-xl font-bold text-foreground">{ROLE_LABELS[selectedRole]}</h2>
              <p className="text-muted-foreground text-sm mt-1">أدخل بيانات الدخول</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">اسم المستخدم</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم"
                    className="pr-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">الرمز السري</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل الرمز السري"
                    className="pr-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-destructive">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-border">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-sm text-muted-foreground mb-1">في حال واجهت مشكلة بتسجيل الدخول</p>
                <div className="flex items-center justify-center gap-2 text-primary font-medium">
                  <Phone className="w-4 h-4" />
                  <span>تواصل مع المدير التنفيذي: محمد كاظم</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Role selection screen
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

        {/* وضع المبرمج - للتجربة فقط */}
        {DEV_MODE && (
          <div className="mt-8">
            <button
              onClick={() => setShowDevMode(!showDevMode)}
              className="mx-auto flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Code className="w-3 h-3" />
              <span>وضع المبرمج</span>
            </button>

            {showDevMode && (
              <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 mb-3">
                  <Zap className="w-4 h-4" />
                  <span className="font-medium text-sm">دخول مباشر (للتجربة فقط)</span>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={`dev-${role}`}
                      onClick={() => handleDevAccess(role)}
                      className="bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-lg p-2 text-xs font-medium transition-colors"
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
