import { useState } from 'react';
import { KitchenAlarmToggle } from './KitchenAlarmToggle';
import { UserManagement } from './UserManagement';
import { DeliveryAreasManager } from './DeliveryAreasManager';
import { CancellationReasonsManager } from '@/components/CancellationReasonsManager';
import { IssueReasonsManager } from '@/components/IssueReasonsManager';
import { LogoutConfirmButton } from '@/components/LogoutConfirmButton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Trash2, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface AdminSettingsTabProps {
  ordersCount: number;
  onDeleteAllOrders: () => Promise<void>;
  isDeletingOrders: boolean;
}

export function AdminSettingsTab({ ordersCount, onDeleteAllOrders, isDeletingOrders }: AdminSettingsTabProps) {
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

          <Button variant="outline" size="lg" className="w-full justify-start h-auto py-4">
            <Settings className="w-5 h-5 ml-3" />
            <div className="text-right">
              <p className="font-semibold">إعدادات النظام</p>
              <p className="text-sm text-muted-foreground">تخصيص إعدادات التطبيق</p>
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

          <LogoutConfirmButton />
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
