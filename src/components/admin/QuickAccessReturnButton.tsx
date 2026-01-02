import { useNavigate } from 'react-router-dom';
import { useRole } from '@/contexts/RoleContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export function QuickAccessReturnButton() {
  const navigate = useNavigate();
  const { setRole } = useRole();
  const [isQuickAccess, setIsQuickAccess] = useState(false);
  const [quickAccessUser, setQuickAccessUser] = useState<{ username: string; full_name: string | null } | null>(null);

  useEffect(() => {
    const quickAccess = localStorage.getItem('adminQuickAccess');
    const userData = localStorage.getItem('quickAccessUser');
    
    if (quickAccess === 'true') {
      setIsQuickAccess(true);
      if (userData) {
        try {
          setQuickAccessUser(JSON.parse(userData));
        } catch (e) {
          console.error('Error parsing quick access user data');
        }
      }
    }
  }, []);

  const handleReturn = () => {
    // Clear quick access data
    localStorage.removeItem('adminQuickAccess');
    localStorage.removeItem('adminReturnRole');
    localStorage.removeItem('quickAccessUser');
    
    // Set admin role first
    setRole('admin');
    
    // Use replace to avoid adding to history, then force refresh
    toast.success('تم العودة للوحة المدير التنفيذي');
    
    // Navigate with replace to ensure clean navigation
    navigate('/dashboard', { replace: true });
  };

  if (!isQuickAccess) return null;

  return (
    <div className="fixed top-16 left-4 z-50 animate-fade-in">
      <Button
        onClick={handleReturn}
        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-elevated gap-2 rounded-full pl-4 pr-3 py-2 h-auto"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          <div className="text-right text-xs">
            <p className="font-bold">العودة للمدير</p>
            {quickAccessUser && (
              <p className="opacity-80 text-[10px]">
                {quickAccessUser.full_name || quickAccessUser.username}
              </p>
            )}
          </div>
        </div>
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
