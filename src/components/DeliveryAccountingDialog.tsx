import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useDeliveryDrivers } from '@/hooks/useDeliveryDrivers';
import { Calculator, Loader2, Phone, User, CheckCircle, XCircle, Truck, RotateCcw, DollarSign, Package } from 'lucide-react';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { toEnglishNumbers, formatNumberWithCommas } from '@/lib/formatNumber';

interface DeliveryAccountingDialogProps {
  orders: OrderWithItems[];
  onOrdersUpdated?: () => void;
}

interface DriverAccounting {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  orderAmount: number;
  deliveryFees: number;
  totalAmount: number;
  deliveredOrders: OrderWithItems[];
  deliveringOrders: OrderWithItems[];
  cancelledOrders: OrderWithItems[];
}

export function DeliveryAccountingDialog({ orders, onOrdersUpdated }: DeliveryAccountingDialogProps) {
  const [open, setOpen] = useState(false);
  const [resettingDriver, setResettingDriver] = useState<string | null>(null);
  const { drivers, loading } = useDeliveryDrivers();
  // محاسبة الميدان تعتمد فقط على الطلبات الحية (غير المؤرشفة) — وهي تمثّل
  // "ما لم يُسوَّ بعد" منذ آخر تصفير. هذا يطابق "مستحقات اليوم" عند السائق.
  const allOrders = orders;

  const driverAccounting = useMemo(() => {
    const accounting: DriverAccounting[] = [];

    drivers.forEach(driver => {
      const deliveredOrders = allOrders.filter(
        order => order.delivery_person_id === driver.user_id && order.status === 'delivered'
      );
      const deliveringOrders = allOrders.filter(
        order => order.delivery_person_id === driver.user_id && order.status === 'delivering'
      );
      const cancelledOrders = allOrders.filter(
        order => order.delivery_person_id === driver.user_id && order.status === 'cancelled'
      );

      // أجور التوصيل (للسائق)
      const deliveryFees = deliveredOrders.reduce((sum, order) => sum + Number(order.delivery_fee || 0), 0);
      // قيمة الأصناف فقط = إجمالي السعر - أجور التوصيل (لأن total_price تشمل delivery_fee)
      const orderAmount = deliveredOrders.reduce((sum, order) => {
        const totalPrice = Number(order.total_price) || 0;
        const fee = Number(order.delivery_fee) || 0;
        return sum + (totalPrice - fee);
      }, 0);
      // المستحق للمطعم = قيمة الأصناف فقط (أجور التوصيل للسائق)
      const totalAmount = orderAmount;

      accounting.push({
        id: driver.id,
        userId: driver.user_id,
        name: driver.full_name,
        phone: driver.phone,
        orderAmount,
        deliveryFees,
        totalAmount,
        deliveredOrders,
        deliveringOrders,
        cancelledOrders,
      });
    });

    return accounting.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [drivers, allOrders]);

  const handleResetAccount = async (driverId: string, driverUserId: string) => {
    setResettingDriver(driverId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ delivery_person_id: null, delivery_person_name: null })
        .eq('delivery_person_id', driverUserId)
        .eq('status', 'delivered');

      if (error) throw error;

      toast.success('تم تصفير حساب الموظف بنجاح');
      onOrdersUpdated?.();
    } catch (error) {
      console.error('Error resetting driver account:', error);
      toast.error('حدث خطأ أثناء تصفير الحساب');
    } finally {
      setResettingDriver(null);
    }
  };

  const totalOrderAmount = driverAccounting.reduce((sum, d) => sum + d.orderAmount, 0);
  const totalDeliveryFees = driverAccounting.reduce((sum, d) => sum + d.deliveryFees, 0);
  // المستحق للمطعم = قيمة الأصناف فقط (أجور التوصيل للسائق)
  const totalOwed = totalOrderAmount;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <Calculator className="w-5 h-5" />
          محاسبة موظفي التوصيل
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            محاسبة موظفي التوصيل
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : driverAccounting.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد طلبات مسجلة لموظفي التوصيل</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="space-y-2 mb-4">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">إجمالي المستحقات للمطعم</span>
                  <span className="text-xl font-bold text-primary">{formatNumberWithCommas(totalOwed)} د.ع</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center justify-between bg-background/50 rounded p-2">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Package className="w-4 h-4" />
                      قيمة الأصناف
                    </span>
                    <span className="font-semibold">{formatNumberWithCommas(totalOrderAmount)} د.ع</span>
                  </div>
                  <div className="flex items-center justify-between bg-background/50 rounded p-2">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Truck className="w-4 h-4" />
                      أرباح السائقين
                    </span>
                    <span className="font-semibold text-success">{formatNumberWithCommas(totalDeliveryFees)} د.ع</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Drivers List */}
            <Accordion type="single" collapsible className="space-y-2">
              {driverAccounting.map(driver => (
                <AccordionItem key={driver.id} value={driver.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center justify-between w-full pl-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{driver.name}</p>
                          {driver.phone && (
                            <p className="text-sm text-muted-foreground">{toEnglishNumbers(driver.phone)}</p>
                          )}
                        </div>
                      </div>
                      <span className="font-bold text-primary">{formatNumberWithCommas(driver.totalAmount)} د.ع</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-4 pt-2">
                      {/* Money breakdown */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-primary/10 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Package className="w-4 h-4 text-primary" />
                            <span className="text-primary">المستحق للمطعم</span>
                          </div>
                          <p className="font-bold text-lg text-primary">{formatNumberWithCommas(driver.orderAmount)} د.ع</p>
                        </div>
                        <div className="bg-success/10 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Truck className="w-4 h-4 text-success" />
                            <span className="text-success">أرباح السائق</span>
                          </div>
                          <p className="font-bold text-lg text-success">{formatNumberWithCommas(driver.deliveryFees)} د.ع</p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                          <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                          <p className="text-lg font-bold text-green-700">{toEnglishNumbers(driver.deliveredOrders.length)}</p>
                          <p className="text-xs text-green-600">مكتملة</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                          <Truck className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                          <p className="text-lg font-bold text-blue-700">{toEnglishNumbers(driver.deliveringOrders.length)}</p>
                          <p className="text-xs text-blue-600">قيد التوصيل</p>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                          <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                          <p className="text-lg font-bold text-red-700">{toEnglishNumbers(driver.cancelledOrders.length)}</p>
                          <p className="text-xs text-red-600">ملغية</p>
                        </div>
                      </div>

                      {/* Contact & Actions */}
                      <div className="flex gap-2">
                        {driver.phone && (
                          <a href={`tel:${driver.phone}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full gap-2">
                              <Phone className="w-4 h-4" />
                              اتصال
                            </Button>
                          </a>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="flex-1 gap-2"
                              disabled={driver.totalAmount === 0 || resettingDriver === driver.id}
                            >
                              {resettingDriver === driver.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RotateCcw className="w-4 h-4" />
                              )}
                              تصفير الحساب
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>تصفير حساب {driver.name}؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                سيتم إزالة جميع الطلبات المكتملة ({toEnglishNumbers(driver.deliveredOrders.length)} طلب) من حساب هذا الموظف.
                                <br />
                                المستحق للمطعم (قيمة الأصناف): {formatNumberWithCommas(driver.orderAmount)} د.ع
                                <br />
                                أرباح السائق (أجور التوصيل): {formatNumberWithCommas(driver.deliveryFees)} د.ع
                                <br />
                                <strong>سيُحذف من الحساب: {formatNumberWithCommas(driver.totalAmount)} د.ع</strong>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleResetAccount(driver.id, driver.userId)}>
                                تأكيد التصفير
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}