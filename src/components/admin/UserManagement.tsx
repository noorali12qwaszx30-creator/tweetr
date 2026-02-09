import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { UserPlus, Trash2, Edit, User, Shield, Loader2, Key, Eye, EyeOff, UserCheck, UserX, Copy, ShieldAlert } from 'lucide-react';
import { ROLE_LABELS, UserRole } from '@/types';
import { Switch } from '@/components/ui/switch';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  is_active: boolean;
}

interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
}

interface UserWithRole extends Profile {
  role?: UserRole;
}

const ROLES: UserRole[] = ['cashier', 'field', 'delivery', 'takeaway', 'kitchen', 'admin'];

export function UserManagement() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string } | null>(null);

  // Form state for new user
  const [newUser, setNewUser] = useState({
    password: '',
    username: '',
    full_name: '',
    phone: '',
    role: 'cashier' as UserRole,
  });

  // Form state for editing
  const [editForm, setEditForm] = useState({
    username: '',
    full_name: '',
    phone: '',
    role: 'cashier' as UserRole,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
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

  const handleToggleActive = async (user: UserWithRole) => {
    try {
      const newStatus = !user.is_active;
      
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('user_id', user.user_id);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(u => 
        u.user_id === user.user_id ? { ...u, is_active: newStatus } : u
      ));

      toast.success(newStatus ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب');
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      toast.error('حدث خطأ في تحديث حالة المستخدم');
    }
  };

  // Check username availability
  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (username.length < 5) {
      setUsernameError('اسم المستخدم يجب أن يكون 5 أحرف على الأقل');
      return false;
    }

    setCheckingUsername(true);
    try {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();

      if (existingUser) {
        setUsernameError('اسم المستخدم مستخدم مسبقاً، اختر اسماً آخر');
        return false;
      }
      
      setUsernameError('');
      return true;
    } catch {
      return true;
    } finally {
      setCheckingUsername(false);
    }
  }, []);

  const handleUsernameChange = (value: string) => {
    setNewUser({ ...newUser, username: value });
    setUsernameError('');
    
    if (value.length > 0 && value.length < 5) {
      setUsernameError('اسم المستخدم يجب أن يكون 5 أحرف على الأقل');
    } else if (value.length >= 5) {
      checkUsernameAvailability(value);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.password || !newUser.username) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (newUser.username.length < 5) {
      toast.error('اسم المستخدم يجب أن يكون 5 أحرف على الأقل');
      return;
    }

    if (newUser.password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    // Final check for username availability
    const isAvailable = await checkUsernameAvailability(newUser.username);
    if (!isAvailable) {
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('يجب تسجيل الدخول أولاً');
        return;
      }

      const response = await supabase.functions.invoke('create-user', {
        body: {
          username: newUser.username,
          password: newUser.password,
          full_name: newUser.full_name,
          phone: newUser.phone,
          role: newUser.role,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create user');
      }

      if (response.data?.error) {
        if (response.data.error.includes('already')) {
          toast.error('اسم المستخدم مسجل مسبقاً');
        } else {
          toast.error(response.data.error);
        }
        return;
      }

      // Show credentials dialog
      setCreatedCredentials({
        username: newUser.username,
        password: newUser.password,
      });

      toast.success('تم إنشاء المستخدم بنجاح');
      setIsAddDialogOpen(false);
      setNewUser({
        password: '',
        username: '',
        full_name: '',
        phone: '',
        role: 'cashier',
      });
      setUsernameError('');
      await new Promise(resolve => setTimeout(resolve, 1000));
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في إنشاء المستخدم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: editForm.username,
          full_name: editForm.full_name || null,
          phone: editForm.phone || null,
        })
        .eq('user_id', selectedUser.user_id);

      if (profileError) throw profileError;

      // Update or insert role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', selectedUser.user_id)
        .maybeSingle();

      if (existingRole) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: editForm.role })
          .eq('user_id', selectedUser.user_id);

        if (roleError) throw roleError;
      } else {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: selectedUser.user_id, role: editForm.role });

        if (roleError) throw roleError;
      }

      // Change password if provided
      if (newPassword) {
        const passwordChanged = await handleChangePassword(selectedUser.user_id);
        if (!passwordChanged) {
          setSubmitting(false);
          return;
        }
        toast.success('تم تحديث المستخدم وكلمة المرور بنجاح');
      } else {
        toast.success('تم تحديث المستخدم بنجاح');
      }

      setIsEditDialogOpen(false);
      setSelectedUser(null);
      setNewPassword('');
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error('حدث خطأ في تحديث المستخدم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    setSubmitting(true);
    try {
      // Call edge function to completely delete user
      const response = await supabase.functions.invoke('delete-user', {
        body: { user_id: deleteUserId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete user');
      }

      if (response.data?.error) {
        if (response.data.error.includes('own account')) {
          toast.error('لا يمكنك حذف حسابك الشخصي');
        } else {
          toast.error(response.data.error);
        }
        return;
      }

      toast.success('تم حذف المستخدم بالكامل');
      setDeleteUserId(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'حدث خطأ في حذف المستخدم');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setEditForm({
      username: user.username,
      full_name: user.full_name || '',
      phone: user.phone || '',
      role: user.role || 'cashier',
    });
    setNewPassword('');
    setShowNewPassword(false);
    setIsEditDialogOpen(true);
  };

  const handleChangePassword = async (userId: string) => {
    if (!newPassword) {
      return true; // No password change requested
    }

    if (newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return false;
    }

    try {
      const response = await supabase.functions.invoke('update-password', {
        body: {
          user_id: userId,
          new_password: newPassword,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to update password');
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'حدث خطأ في تغيير كلمة المرور');
      return false;
    }
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
      <div className="flex items-center justify-between">
        <h3 className="font-bold">إدارة المستخدمين</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="w-4 h-4 ml-2" />
              إضافة مستخدم
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة مستخدم جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">اسم المستخدم * (5 أحرف على الأقل)</Label>
                <div className="relative">
                  <Input
                    id="username"
                    placeholder="اسم المستخدم"
                    value={newUser.username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    className={usernameError ? 'border-destructive' : ''}
                  />
                  {checkingUsername && (
                    <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {usernameError && (
                  <p className="text-xs text-destructive">{usernameError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">6 أحرف على الأقل</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">الاسم الكامل</Label>
                <Input
                  id="full_name"
                  placeholder="الاسم الكامل"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف (11 رقم)</Label>
                <Input
                  id="phone"
                  placeholder="07XXXXXXXXX"
                  value={newUser.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setNewUser({ ...newUser, phone: value });
                  }}
                  inputMode="numeric"
                  pattern="[0-9]{11}"
                  maxLength={11}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">الدور</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({ ...newUser, role: value as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddUser} className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                إنشاء المستخدم
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users List */}
      {users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>لا يوجد مستخدمين</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className={`bg-card border rounded-xl p-4 shadow-soft transition-opacity ${
                user.is_active ? 'border-border' : 'border-destructive/30 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    user.is_active ? 'bg-primary/10' : 'bg-destructive/10'
                  }`}>
                    {user.is_active ? (
                      <UserCheck className="w-5 h-5 text-primary" />
                    ) : (
                      <UserX className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{user.username}</p>
                      {!user.is_active && (
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                          معطّل
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="w-3 h-3" />
                      <span>{user.role ? ROLE_LABELS[user.role] : 'بدون دور'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Toggle Active Status */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={user.is_active}
                      onCheckedChange={() => handleToggleActive(user)}
                      className="data-[state=checked]:bg-green-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                      title="تعديل"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    {user.role !== 'admin' ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteUserId(user.user_id)}
                        title="حذف"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        title="لا يمكن حذف المدير التنفيذي"
                        className="opacity-50 cursor-not-allowed"
                      >
                        <ShieldAlert className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {user.full_name && (
                <p className="text-sm text-muted-foreground mt-2 mr-13">
                  {user.full_name}
                </p>
              )}
              {user.phone && (
                <p className="text-sm text-muted-foreground mr-13">{user.phone}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل المستخدم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_username">اسم المستخدم</Label>
              <Input
                id="edit_username"
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_full_name">الاسم الكامل</Label>
              <Input
                id="edit_full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_phone">رقم الهاتف (11 رقم)</Label>
              <Input
                id="edit_phone"
                value={editForm.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setEditForm({ ...editForm, phone: value });
                }}
                inputMode="numeric"
                pattern="[0-9]{11}"
                maxLength={11}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_role">الدور</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm({ ...editForm, role: value as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Password Section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Key className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">كلمة المرور</Label>
              </div>
              
              <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2 mb-3">
                🔒 كلمات المرور مشفرة بشكل آمن ولا يمكن عرضها. يمكنك تعيين كلمة مرور جديدة أدناه.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="edit_new_password">تعيين كلمة مرور جديدة</Label>
                <div className="relative">
                  <Input
                    id="edit_new_password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="اتركه فارغاً للإبقاء على كلمة المرور الحالية"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword && newPassword.length < 6 && (
                  <p className="text-xs text-destructive">يجب أن تكون 6 أحرف على الأقل</p>
                )}
              </div>
            </div>

            <Button onClick={handleEditUser} className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              حفظ التغييرات
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا المستخدم نهائياً ولن تتمكن من استعادته.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Created Credentials Dialog */}
      <Dialog open={!!createdCredentials} onOpenChange={(open) => !open && setCreatedCredentials(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-green-500" />
              تم إنشاء الحساب بنجاح
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              احفظ بيانات الدخول التالية، لن تتمكن من رؤية كلمة المرور مرة أخرى:
            </p>
            
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">اسم المستخدم</p>
                  <p className="font-mono font-semibold">{createdCredentials?.username}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(createdCredentials?.username || '');
                    toast.success('تم نسخ اسم المستخدم');
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">كلمة المرور</p>
                  <p className="font-mono font-semibold">{createdCredentials?.password}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(createdCredentials?.password || '');
                    toast.success('تم نسخ كلمة المرور');
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Button 
              onClick={() => setCreatedCredentials(null)} 
              className="w-full"
            >
              تم الحفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
