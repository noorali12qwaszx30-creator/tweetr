import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KitchenAlarmToggle } from './KitchenAlarmToggle';
import { UserManagement } from './UserManagement';
import { DeliveryAreasManager } from './DeliveryAreasManager';
import { CancellationReasonsManager } from '@/components/CancellationReasonsManager';
import { IssueReasonsManager } from '@/components/IssueReasonsManager';
import { LogoutConfirmButton } from '@/components/LogoutConfirmButton';
import { NotificationsManager } from './NotificationsManager';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Loader2, ImageIcon, ImageOff, RotateCcw, LogOut, ChevronDown, Wrench } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  const [systemToolsOpen, setSystemToolsOpen] = useState(false);

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
        if (me && p.user_id === me.id) continue;
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general" className="text-[10px] px-1">عام</TabsTrigger>
          <TabsTrigger value="notifications" className="text-[10px] px-1">إشعارات</TabsTrigger>
          <TabsTrigger value="users" className="text-[10px] px-1">المستخدمين</TabsTrigger>
          <TabsTrigger value="areas" className="text-[10px] px-1">المناطق</TabsTrigger>
          <TabsTrigger value="reasons" className="text-[10px] px-1">الإلغاء</TabsTrigger>
          <TabsTrigger value="issues" className="text-[10px] px-1">التبليغ</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-4">
          <KitchenAlarmToggle />

          <div className="bg-info/5 border-2 border-info/30 rounded-xl p-3">
            <div className="flex items-start gap-2 mb-2">
              <RotateCcw className="w-5 h-5 text-info shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-sm">إعادة التعيين اليومية التلقائية</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  يقوم النظام تلقائياً كل يوم الساعة <span className="font-bold text-info">11:00 صباحاً</span> بحفظ ملخّص اليوم وأرشفة الطلبات وإعادة العدّاد إلى 1.
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
                    سيتم حفظ الملخّص اليومي وأرشفة الطلبات وإعادة العدّاد. الإحصائيات الأسبوعية والشهرية محفوظة.
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

          <LogoutConfirmButton />

          {/* All advanced/system tools collapsed under a single field */}
          <Collapsible open={systemToolsOpen} onOpenChange={setSystemToolsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="lg" className="w-full justify-between h-auto py-4">
                <div className="flex items-center gap-3">
                  <Wrench className="w-5 h-5" />
                  <div className="text-right">
                    <p className="font-semibold">أدوات النظام المتقدمة</p>
                    <p className="text-xs text-muted-foreground">صور، حذف الطلبات، طرد المستخدمين</p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 transition-transform ${systemToolsOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-3 pt-3 border-t">
              <Button
                variant="outline"
                size="lg"
                className="w-full justify-start h-auto py-3"
                onClick={handleMigrateImages}
                disabled={migratingImages}
              >
                {migratingImages ? (
                  <Loader2 className="w-5 h-5 ml-3 animate-spin" />
                ) : (
                  <ImageIcon className="w-5 h-5 ml-3" />
                )}
                <div className="text-right">
                  <p className="font-semibold text-sm">نقل صور القائمة للتخزين السحابي</p>
                  <p className="text-xs text-muted-foreground">
                    {migratingImages ? 'جاري النقل...' : 'تشغيل مرة واحدة'}
                  </p>
                </div>
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="lg" className="w-full justify-start h-auto py-3 border-2 border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive">
                    <Trash2 className="w-5 h-5 ml-3" />
                    <div className="text-right">
                      <p className="font-bold text-sm">حذف جميع الطلبات</p>
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
                      سيتم حذف جميع الطلبات ({ordersCount} طلب) نهائياً. لا يمكن التراجع!
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
                  <Button variant="outline" size="lg" className="w-full justify-start h-auto py-3 border-2 border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive" disabled={clearingImages}>
                    {clearingImages ? <Loader2 className="w-5 h-5 ml-3 animate-spin" /> : <ImageOff className="w-5 h-5 ml-3" />}
                    <div className="text-right">
                      <p className="font-bold text-sm">حذف جميع صور القائمة</p>
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
                      سيتم حذف جميع صور الأصناف من التخزين وإفراغ عمود الصور. لا يمكن التراجع!
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

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="lg" className="w-full justify-start h-auto py-3 border-2 border-warning/50 bg-warning/10 hover:bg-warning/20" disabled={forcingLogoutAll}>
                    {forcingLogoutAll ? <Loader2 className="w-5 h-5 ml-3 animate-spin" /> : <LogOut className="w-5 h-5 ml-3" />}
                    <div className="text-right">
                      <p className="font-bold text-sm">طرد جميع المستخدمين</p>
                      <p className="text-xs opacity-80">من جميع الأجهزة (ما عداك)</p>
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
                      سيتم تسجيل خروج كل المستخدمين من جميع الأجهزة فوراً. حسابك لن يتأثر.
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
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <NotificationsManager />
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
