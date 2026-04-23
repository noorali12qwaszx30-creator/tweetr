import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, ROLE_LABELS } from '@/types';
import { 
  Calculator, 
  MapPin, 
  Truck, 
  ShoppingBag, 
  Shield,
  ArrowRight,
  User,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  Phone,
  Sparkles,
  UtensilsCrossed,
  ChefHat,
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

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  cashier: 'إدارة الطلبات والمبيعات',
  field: 'متابعة التوصيل والميدان',
  delivery: 'توصيل الطلبات للزبائن',
  takeaway: 'طلبات السفري',
  kitchen: 'عرض الطلبات قيد التجهيز',
  admin: 'إدارة النظام الكاملة',
};

// First row: 2 items, Second row: kitchen + admin, Third row: 2 items
const ROLES_TOP: UserRole[] = ['cashier', 'field'];
const ROLES_CENTER: UserRole[] = ['kitchen', 'admin'];
const ROLES_BOTTOM: UserRole[] = ['delivery', 'takeaway'];

// RoleButton component
interface RoleButtonProps {
  role: UserRole;
  index: number;
  mounted: boolean;
  onSelect: (role: UserRole) => void;
  isCenter?: boolean;
}

const RoleButton = ({ role, index, mounted, onSelect, isCenter }: RoleButtonProps) => (
  <button
    onClick={() => onSelect(role)}
    className={`
      group relative bg-card border border-border/40 rounded-3xl p-4 sm:p-6 
      transition-all duration-500 active:scale-95 hover:scale-[1.03] hover:border-primary/30
      shadow-card hover:shadow-elevated
      focus:outline-none focus:ring-4 focus:ring-primary/20
      ${isCenter ? 'w-full max-w-xs' : ''}
      ${mounted ? 'opacity-100' : 'opacity-0'}
    `}
    style={{ 
      animation: mounted 
        ? `slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 + index * 0.1}s forwards` 
        : 'none',
      opacity: 0,
    }}
  >
    {/* Soft tint on hover */}
    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent transition-all duration-500" />
    
    {/* Selected indicator dot */}
    <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-primary/0 group-hover:bg-primary group-hover:animate-pulse transition-all duration-300" />

    <div className="relative flex flex-col items-center gap-2 sm:gap-4">
      {/* Icon container */}
      <div className={`${isCenter ? 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24' : 'w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20'} rounded-2xl sm:rounded-3xl bg-secondary flex items-center justify-center text-primary group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-primary-glow group-hover:text-primary-foreground transition-all duration-500 group-hover:scale-110 group-hover:shadow-button`}>
        <div className={isCenter ? 'scale-100 sm:scale-125' : 'scale-75 sm:scale-100'}>{ROLE_ICONS[role]}</div>
      </div>

      {/* Role name */}
      <div className="text-center">
        <h3 className={`font-bold ${isCenter ? 'text-base sm:text-lg md:text-xl' : 'text-sm sm:text-base md:text-lg'} text-foreground group-hover:text-primary transition-colors duration-300`}>
          {ROLE_LABELS[role]}
        </h3>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block">
          {ROLE_DESCRIPTIONS[role]}
        </p>
      </div>
    </div>

    {/* Bottom accent line */}
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full group-hover:w-3/4 transition-all duration-500" />
  </button>
);

export default function RoleSelector() {
  const navigate = useNavigate();
  const { role: savedRole, setRole } = useRole();
  const { login, isAuthenticated, user, loading: authLoading } = useAuth();
  
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Auto-redirect if already authenticated with a valid role
  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.role && savedRole) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, isAuthenticated, user, savedRole, navigate]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setError(null);
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

    const { error: loginError } = await login(username, password, selectedRole!);

    if (loginError) {
      setError(loginError);
      setIsLoading(false);
      return;
    }

    setRole(selectedRole!);
    toast.success('تم تسجيل الدخول بنجاح');
    navigate('/dashboard', { replace: true });
  };

  // Login form after role selection
  if (selectedRole) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4 overflow-hidden" dir="rtl">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-float" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div 
            className="bg-card border border-border/40 rounded-[2rem] p-8 shadow-floating animate-scale-in"
          >
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 transition-all duration-300 hover:-translate-x-1"
            >
              <ArrowRight className="w-5 h-5" />
              <span className="font-medium">العودة لاختيار الدور</span>
            </button>

            <div className="text-center mb-8">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary to-primary-glow rounded-3xl flex items-center justify-center mb-4 shadow-button text-primary-foreground hover:scale-105 transition-transform duration-300">
                {ROLE_ICONS[selectedRole]}
              </div>
              <h2 className="text-2xl font-extrabold text-foreground">{ROLE_LABELS[selectedRole]}</h2>
              <p className="text-muted-foreground mt-2 text-sm">{ROLE_DESCRIPTIONS[selectedRole]}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">اسم المستخدم</label>
                <div className="relative group">
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم"
                    className="pr-12 h-14 text-base bg-muted/40 border-transparent rounded-2xl focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">الرمز السري</label>
                <div className="relative group">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل الرمز السري"
                    className="pr-12 pl-12 h-14 text-base bg-muted/40 border-transparent rounded-2xl focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-start gap-3 animate-scale-in">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-destructive font-medium">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full h-14 text-base font-bold bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary shadow-button hover:shadow-elevated transition-all duration-300 hover:scale-[1.02]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    جاري تسجيل الدخول...
                  </span>
                ) : (
                  'تسجيل الدخول'
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-border/50">
              <div className="bg-secondary/50 rounded-2xl p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">في حال واجهت مشكلة بتسجيل الدخول</p>
                <div className="flex items-center justify-center gap-2 text-primary font-semibold">
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

  // Welcome & Role selection screen
  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center p-4 overflow-hidden" dir="rtl">
      {/* Animated background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 right-20 w-72 h-72 bg-primary/15 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
        </div>
        {/* Decorative shapes */}
        <div className="absolute top-10 left-10 w-4 h-4 bg-primary/30 rounded-full animate-pulse" />
        <div className="absolute top-32 right-32 w-3 h-3 bg-accent/40 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-40 right-20 w-5 h-5 bg-primary/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-4xl relative z-10">
        {/* Hero Section */}
        <div 
          className={`text-center mb-12 ${mounted ? 'opacity-100' : 'opacity-0'}`}
          style={{ 
            animation: mounted ? 'slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
          }}
        >
          {/* Logo/Brand */}
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <div className="w-28 h-28 bg-gradient-to-br from-primary via-primary to-primary-glow rounded-[2rem] flex flex-col items-center justify-center shadow-floating hover:scale-105 transition-transform duration-500 gap-1">
                <ChefHat className="w-8 h-8 text-primary-foreground" />
                <UtensilsCrossed className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="absolute -top-2 -right-2 w-9 h-9 bg-accent rounded-full flex items-center justify-center shadow-button animate-float">
                <Sparkles className="w-4 h-4 text-accent-foreground" />
              </div>
            </div>
          </div>

          {/* Welcome Title */}
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-foreground mb-4 leading-tight px-2 tracking-tight">
            أهلاً بكم في{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary via-primary-glow to-primary">
              تويتر
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-lg mx-auto px-4">
            نظام إدارة المطعم المتكامل - اختر دورك للبدء
          </p>
        </div>

        {/* Role Selection Grid - Symmetric layout with admin centered */}
        <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 px-2">
          {/* Top row - 2 items */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 max-w-2xl mx-auto w-full">
            {ROLES_TOP.map((role, index) => (
              <RoleButton key={role} role={role} index={index} mounted={mounted} onSelect={handleSelectRole} />
            ))}
          </div>
          
          {/* Center row - Kitchen + Admin */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 max-w-2xl mx-auto w-full">
            {ROLES_CENTER.map((role, index) => (
              <RoleButton key={role} role={role} index={index + 2} mounted={mounted} onSelect={handleSelectRole} />
            ))}
          </div>
          
          {/* Bottom row - 2 items */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 max-w-2xl mx-auto w-full">
            {ROLES_BOTTOM.map((role, index) => (
              <RoleButton key={role} role={role} index={index + 3} mounted={mounted} onSelect={handleSelectRole} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div 
          className={`mt-12 text-center ${mounted ? 'opacity-100' : 'opacity-0'}`}
          style={{ 
            animation: mounted ? 'fade-in 0.8s ease-out 0.8s forwards' : 'none',
            opacity: 0,
          }}
        >
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} تويتر - جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  );
}
