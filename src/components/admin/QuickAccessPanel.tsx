import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '@/contexts/RoleContext';
import { UserRole, ROLE_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calculator,
  Users,
  Truck,
  UtensilsCrossed,
  ShieldCheck,
  ExternalLink,
  Loader2,
  User,
  UserCheck,
  UserX,
} from 'lucide-react';

interface UserWithRole {
  id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  role?: UserRole;
}

interface RoleCardProps {
  role: UserRole;
  label: string;
  icon: React.ReactNode;
  description: string;
  userCount: number;
  onAccess: () => void;
}

function RoleCard({ role, label, icon, description, userCount, onAccess }: RoleCardProps) {
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
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
              {label}
            </h3>
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
              {userCount} مستخدم
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </button>
  );
}

const roleIcons: Record<UserRole, React.ReactNode> = {
  cashier: <Calculator className="w-6 h-6" />,
  field: <Users className="w-6 h-6" />,
  delivery: <Truck className="w-6 h-6" />,
  takeaway: <UtensilsCrossed className="w-6 h-6" />,
  admin: <ShieldCheck className="w-6 h-6" />,
};

const roleDescriptions: Record<UserRole, string> = {
  cashier: 'إدارة الطلبات وإنشاء الفواتير',
  field: 'متابعة الطلبات وتعيين موظفي التوصيل',
  delivery: 'استلام وتوصيل الطلبات',
  takeaway: 'طلبات السفري والاستلام',
  admin: 'لوحة المدير التنفيذي',
};

export function QuickAccessPanel() {
  const navigate = useNavigate();
  const { setRole } = useRole();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const accessibleRoles: UserRole[] = ['cashier', 'field', 'delivery', 'takeaway'];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        return {
          ...profile,
          is_active: profile.is_active ?? true,
          role: userRole?.role as UserRole | undefined,
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('حدث خطأ في جلب المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const getUsersByRole = (role: UserRole) => {
    return users.filter(u => u.role === role);
  };

  const handleRoleClick = (role: UserRole) => {
    const roleUsers = getUsersByRole(role);
    if (roleUsers.length === 0) {
      toast.error(`لا يوجد مستخدمين في قسم ${ROLE_LABELS[role]}`);
      return;
    }
    setSelectedRole(role);
    setIsDialogOpen(true);
  };

  const handleUserSelect = (user: UserWithRole) => {
    if (!user.is_active) {
      toast.error('هذا الحساب معطّل');
      return;
    }

    // Store admin quick access info
    localStorage.setItem('adminQuickAccess', 'true');
    localStorage.setItem('adminReturnRole', 'admin');
    localStorage.setItem('quickAccessUser', JSON.stringify({
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    }));

    setRole(user.role!);
    setIsDialogOpen(false);
    navigate('/dashboard');
    toast.success(`تم الدخول كـ ${user.full_name || user.username} (${ROLE_LABELS[user.role!]})`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-primary">الدخول السريع</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          اختر القسم ثم اختر حساب المستخدم للدخول المباشر بصلاحيات مطلقة.
        </p>
      </div>

      <div className="space-y-3">
        {accessibleRoles.map((role) => (
          <RoleCard
            key={role}
            role={role}
            label={ROLE_LABELS[role]}
            icon={roleIcons[role]}
            description={roleDescriptions[role]}
            userCount={getUsersByRole(role).length}
            onAccess={() => handleRoleClick(role)}
          />
        ))}
      </div>

      {/* User Selection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRole && roleIcons[selectedRole]}
              اختر حساب {selectedRole ? ROLE_LABELS[selectedRole] : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {selectedRole && getUsersByRole(selectedRole).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا يوجد مستخدمين في هذا القسم</p>
              </div>
            ) : (
              selectedRole && getUsersByRole(selectedRole).map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  disabled={!user.is_active}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-right ${
                    user.is_active
                      ? 'bg-card border-border hover:border-primary/50 hover:shadow-soft cursor-pointer'
                      : 'bg-muted/50 border-destructive/30 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    user.is_active ? 'bg-primary/10' : 'bg-destructive/10'
                  }`}>
                    {user.is_active ? (
                      <UserCheck className="w-5 h-5 text-primary" />
                    ) : (
                      <UserX className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{user.full_name || user.username}</p>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  </div>
                  {!user.is_active && (
                    <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full">
                      معطّل
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
