import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { UserRole, ROLE_LABELS } from '@/types';
import { 
  Calculator, 
  MapPin, 
  Truck, 
  ShoppingBag, 
  ChefHat, 
  Shield,
  ArrowRight,
  User,
  Lock,
  AlertCircle,
  Phone,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import SplashScreen from '@/components/SplashScreen';

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
  kitchen: 'تحضير الطلبات',
  admin: 'إدارة النظام الكاملة',
};

const ROLES: UserRole[] = ['admin', 'cashier', 'kitchen', 'field', 'delivery', 'takeaway'];

export default function RoleSelector() {
  const navigate = useNavigate();
  const { setRole } = useRole();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(true); // Always show for testing

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    setShowSplash(false);
  };

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

    const { error: loginError } = await login(username, password);

    if (loginError) {
      setError(loginError);
      setIsLoading(false);
      return;
    }

    setRole(selectedRole!);
    toast.success('تم تسجيل الدخول بنجاح');
    navigate('/dashboard', { replace: true });
  };

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Login form after role selection
  if (selectedRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 overflow-hidden" dir="rtl">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="fixed top-4 left-4 z-50 w-12 h-12 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110 shadow-lg"
          aria-label="تبديل الوضع"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-float" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div 
            className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-elevated animate-scale-in"
          >
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 transition-all duration-300 hover:-translate-x-1"
            >
              <ArrowRight className="w-5 h-5" />
              <span className="font-medium">العودة لاختيار الدور</span>
            </button>

            <div className="text-center mb-8">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mb-4 shadow-glow text-primary-foreground rotate-3 hover:rotate-0 transition-transform duration-300">
                {ROLE_ICONS[selectedRole]}
              </div>
              <h2 className="text-2xl font-bold text-foreground">{ROLE_LABELS[selectedRole]}</h2>
              <p className="text-muted-foreground mt-2">{ROLE_DESCRIPTIONS[selectedRole]}</p>
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
                    className="pr-12 h-14 text-lg bg-background/50 border-border/50 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">الرمز السري</label>
                <div className="relative group">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل الرمز السري"
                    className="pr-12 h-14 text-lg bg-background/50 border-border/50 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3 animate-scale-in">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-destructive font-medium">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-primary/25 transition-all duration-300 hover:scale-[1.02]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري تسجيل الدخول...
                  </span>
                ) : (
                  'تسجيل الدخول'
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-border/50">
              <div className="bg-muted/30 backdrop-blur rounded-xl p-4 text-center">
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex flex-col items-center justify-center p-4 overflow-hidden" dir="rtl">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 left-4 z-50 w-14 h-14 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-500 hover:scale-110 hover:rotate-180 shadow-lg group"
        aria-label="تبديل الوضع"
      >
        {theme === 'dark' ? (
          <Sun className="w-6 h-6 transition-transform duration-500 group-hover:rotate-90" />
        ) : (
          <Moon className="w-6 h-6 transition-transform duration-500 group-hover:-rotate-12" />
        )}
      </button>

      {/* Animated background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 right-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
        </div>
        {/* Decorative shapes */}
        <div className="absolute top-10 left-10 w-4 h-4 bg-primary/30 rounded-full animate-pulse" />
        <div className="absolute top-32 right-32 w-3 h-3 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
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
              <div className="w-24 h-24 bg-gradient-to-br from-primary via-primary to-primary/80 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/30 rotate-3 hover:rotate-0 transition-transform duration-500">
                <span className="text-4xl font-black text-primary-foreground">ج</span>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-float">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {/* Welcome Title */}
          <h1 className="text-4xl md:text-6xl font-black text-foreground mb-4 leading-tight">
            أهلاً بكم في{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary via-red-500 to-primary">
              جومانجي
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto">
            نظام إدارة المطعم المتكامل - اختر دورك للبدء
          </p>
        </div>

        {/* Role Selection Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {ROLES.map((role, index) => (
            <button
              key={role}
              onClick={() => handleSelectRole(role)}
              className={`
                group relative bg-card/60 backdrop-blur-xl border-2 border-border/50 rounded-3xl p-6 
                transition-all duration-500 hover:scale-105 hover:border-primary/50
                hover:shadow-2xl hover:shadow-primary/20
                focus:outline-none focus:ring-4 focus:ring-primary/20
                ${mounted ? 'opacity-100' : 'opacity-0'}
              `}
              style={{ 
                animation: mounted 
                  ? `slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 + index * 0.1}s forwards` 
                  : 'none',
                opacity: 0,
              }}
            >
              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/10 group-hover:via-primary/5 group-hover:to-transparent transition-all duration-500" />
              
              {/* Selected indicator */}
              <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-primary/0 group-hover:bg-primary group-hover:animate-pulse transition-all duration-300" />

              <div className="relative flex flex-col items-center gap-4">
                {/* Icon container */}
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-muted-foreground group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg group-hover:shadow-primary/30">
                  {ROLE_ICONS[role]}
                </div>

                {/* Role name */}
                <div className="text-center">
                  <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors duration-300">
                    {ROLE_LABELS[role]}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {ROLE_DESCRIPTIONS[role]}
                  </p>
                </div>
              </div>

              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full group-hover:w-3/4 transition-all duration-500" />
            </button>
          ))}
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
            © {new Date().getFullYear()} جومانجي - جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  );
}
