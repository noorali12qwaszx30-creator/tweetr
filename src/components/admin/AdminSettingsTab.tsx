import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KitchenAlarmToggle } from './KitchenAlarmToggle';
import { UserManagement } from './UserManagement';
import { DeliveryAreasManager } from './DeliveryAreasManager';
import { CancellationReasonsManager } from '@/components/CancellationReasonsManager';
import { IssueReasonsManager } from '@/components/IssueReasonsManager';
import { LogoutConfirmButton } from '@/components/LogoutConfirmButton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Trash2, Loader2, ImageIcon, ImageOff, RotateCcw, LogOut } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface AdminSettingsTabProps {
  ordersCount: number;
  onDeleteAllOrders: () => Promise<void>;
  isDeletingOrders: boolean;
}

export function AdminSettingsTab({ ordersCount, onDeleteAllOrders, isDeletingOrders }: AdminSettingsTabProps) {
  const [migratingImages, setMigratingImages] = useState(false);
  const [clearingImages, setClearingImages] = useState(false);
  const [resettingDay, setResettingDay] = useState(false);
  const [forcingLogoutAll, setForcingLogoutAll] = useState(false);

  const handleForceLogoutAll = async () => {
    setForcingLogoutAll(true);
    try {
      const { data: profiles, error: listErr } = await supabase
        .from('profiles')
        .select('user_id');
      if (listErr) throw listErr;
      const { data: { user: me } } = await supabase.auth.getUser();
      let success = 0;
      let failed = 0;
      for (const p of (profiles ?? [])) {
        if (me && p.user_id === me.id) continue; // don't logout self
        const { error } = await supabase.functions.invoke('admin-force-logout', {
          body: { user_id: p.user_id },
        });
        if (error) failed++; else success++;
      }
      if (failed > 0) toast.warning(`تم طرد ${success} مستخدم، فشل ${failed}`);
      else toast.success(`تم تسجيل خروج ${success} مستخدم من جميع أجهزتهم ✓`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الطرد');
    } finally {
      setForcingLogoutAll(false);
    }
  };

  const handleDailyReset = async () => {
    setResettingDay(true);
    try {
      const { data, error } = await supabase.rpc('admin_trigger_daily_reset' as any);
      if (error) throw error;
      const result = data as { archived_orders?: number } | null;
      toast.success(`تم بدء يوم عمل جديد ✓ (${result?.archived_orders ?? 0} طلب مؤرشف)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تنفيذ إعادة التعيين';
      toast.error(msg);
    } finally {
      setResettingDay(false);
    }
  };

  const handleMigrateImages = async () => {
    setMigratingImages(true);
    try {
      const { data, error } = await supabase.functions.invoke('migrate-menu-images');
      if (error) throw error;
      const summary = data as { total: number; migrated: number; failed: number };
      if (summary.failed > 0) {
        toast.warning(`تم نقل ${summary.migrated} صورة، فشل ${summary.failed}`);
      } else if (summary.total === 0) {
        toast.info('لا توجد صور تحتاج إلى نقل');
      } else {
        toast.success(`تم نقل ${summary.migrated} صورة بنجاح إلى التخزين السحابي`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل نقل الصور';
      toast.error(msg);
    } finally {
      setMigratingImages(false);
    }
  };

  const handleClearImages = async () => {
    setClearingImages(true);
    try {
      const { data, error } = await supabase.functions.invoke('clear-menu-images');
      if (error) throw error;
      const summary = data as { deletedFiles: number; totalFound: number };
      toast.success(`تم حذف ${summary.deletedFiles} صورة وإفراغ عمود الصور بالكامل`);
      // Clear local cache so UI reloads without images
      try {
        localStorage.removeItem('cached_menu_items_v2');
        localStorage.removeItem('cached_menu_items');
      } catch {}
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل حذف الصور';
      toast.error(msg);
    } finally {
      setClearingImages(false);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="text-xs px-1">عام</TabsTrigger>
          <TabsTrigger value="users" className="text-xs px-1">المستخدمين</TabsTrigger>
          <TabsTrigger value="areas" className="text-xs px-1">المناطق</TabsTrigger>
          <TabsTrigger value="reasons" className="text-xs px-1">الإلغاء</TabsTrigger>
          <TabsTrigger value="issues" className="text-xs px-1">التبليغ</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-4">
          <KitchenAlarmToggle />

          <div className="bg-info/5 border-2 border-info/30 rounded-xl p-3">
            <div className="flex items-start gap-2 mb-2">
              <RotateCcw className="w-5 h-5 text-info shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-sm">إعادة التعيين اليومية التلقائية</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  يقوم النظام تلقائياً كل يوم الساعة <span className="font-bold text-info">11:00 صباحاً</span> بحفظ ملخّص اليوم في الإحصائيات وأرشفة الطلبات وإعادة العدّاد إلى 1. الإحصائيات الأسبوعية والشهرية محفوظة بالكامل.
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full" disabled={resettingDay}>
                  {resettingDay ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <RotateCcw className="w-4 h-4 ml-2" />}
                  تنفيذ إعادة التعيين الآن (يدوياً)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>بدء يوم عمل جديد؟</AlertDialogTitle>
                  <AlertDialogDescription>
                    سيتم حفظ ملخّص الطلبات الحالية في الإحصائيات اليومية، أرشفة جميع الطلبات (تبقى محفوظة)، وإعادة عدّاد رقم الطلب إلى 1. الإحصائيات الأسبوعية والشهرية لن تتأثر.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row-reverse gap-2">
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDailyReset} disabled={resettingDay}>
                    {resettingDay ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <RotateCcw className="w-4 h-4 ml-2" />}
                    نعم، ابدأ يوم جديد
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <Button variant="outline" size="lg" className="w-full justify-start h-auto py-4">
            <Settings className="w-5 h-5 ml-3" />
            <div className="text-right">
              <p className="font-semibold">إعدادات النظام</p>
              <p className="text-sm text-muted-foreground">تخصيص إعدادات التطبيق</p>
            </div>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full justify-start h-auto py-4"
            onClick={handleMigrateImages}
            disabled={migratingImages}
          >
            {migratingImages ? (
              <Loader2 className="w-5 h-5 ml-3 animate-spin" />
            ) : (
              <ImageIcon className="w-5 h-5 ml-3" />
            )}
            <div className="text-right">
              <p className="font-semibold">نقل صور القائمة إلى التخزين السحابي</p>
              <p className="text-sm text-muted-foreground">
                {migratingImages ? 'جاري النقل...' : 'لإصلاح بطء تحميل القائمة (تشغيل مرة واحدة)'}
              </p>
            </div>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="lg" className="w-full justify-start h-auto py-4 border-2 border-destructive bg-destructive/10 hover:bg-destructive/20 text-destructive hover:text-destructive">
                <Trash2 className="w-6 h-6 ml-3" />
                <div className="text-right">
                  <p className="font-bold text-lg">حذف جميع الطلبات</p>
                </div>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-destructive" />
                  حذف جميع الطلبات
                </AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم حذف جميع الطلبات ({ordersCount} طلب) نهائياً من قاعدة البيانات. هذا الإجراء لا يمكن التراجع عنه!
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={onDeleteAllOrders} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeletingOrders}>
                  {isDeletingOrders ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Trash2 className="w-4 h-4 ml-2" />}
                  حذف الكل
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="lg" className="w-full justify-start h-auto py-4 border-2 border-destructive bg-destructive/10 hover:bg-destructive/20 text-destructive hover:text-destructive" disabled={clearingImages}>
                {clearingImages ? <Loader2 className="w-6 h-6 ml-3 animate-spin" /> : <ImageOff className="w-6 h-6 ml-3" />}
                <div className="text-right">
                  <p className="font-bold text-lg">حذف جميع صور القائمة</p>
                  <p className="text-sm opacity-80">إفراغ عمود الصور وحذف ملفات التخزين</p>
                </div>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <ImageOff className="w-5 h-5 text-destructive" />
                  حذف جميع الصور
                </AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم حذف جميع صور أصناف القائمة من التخزين السحابي وإفراغ عمود الصور في قاعدة البيانات. هذا الإجراء لا يمكن التراجع عنه!
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearImages} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={clearingImages}>
                  {clearingImages ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <ImageOff className="w-4 h-4 ml-2" />}
                  حذف الصور
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <LogoutConfirmButton />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="lg" className="w-full justify-start h-auto py-4 border-2 border-warning bg-warning/10 hover:bg-warning/20" disabled={forcingLogoutAll}>
                {forcingLogoutAll ? <Loader2 className="w-6 h-6 ml-3 animate-spin" /> : <LogOut className="w-6 h-6 ml-3" />}
                <div className="text-right">
                  <p className="font-bold text-lg">تسجيل خروج جميع المستخدمين</p>
                  <p className="text-sm opacity-80">طرد فوري من جميع الأجهزة (ما عداك)</p>
                </div>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <LogOut className="w-5 h-5 text-warning" />
                  طرد جميع المستخدمين؟
                </AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم تسجيل خروج كل المستخدمين من جميع الأجهزة فوراً، وسيُطلب منهم إعادة تسجيل الدخول. حسابك أنت لن يتأثر.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleForceLogoutAll} disabled={forcingLogoutAll}>
                  {forcingLogoutAll ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <LogOut className="w-4 h-4 ml-2" />}
                  نعم، طرد الكل
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <UserManagement />
        </TabsContent>

        <TabsContent value="areas" className="mt-4">
          <DeliveryAreasManager />
        </TabsContent>

        <TabsContent value="reasons" className="mt-4">
          <CancellationReasonsManager />
        </TabsContent>

        <TabsContent value="issues" className="mt-4">
          <IssueReasonsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
