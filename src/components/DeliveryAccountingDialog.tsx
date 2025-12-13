import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDeliveryDrivers } from '@/hooks/useDeliveryDrivers';
import { Calculator, Loader2, Phone, User } from 'lucide-react';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';

interface DeliveryAccountingDialogProps {
  orders: OrderWithItems[];
}

interface DriverAccounting {
  id: string;
  name: string;
  phone: string | null;
  totalOrders: number;
  totalAmount: number;
  deliveredOrders: number;
  deliveringOrders: number;
}

export function DeliveryAccountingDialog({ orders }: DeliveryAccountingDialogProps) {
  const [open, setOpen] = useState(false);
  const { drivers, loading } = useDeliveryDrivers();

  const driverAccounting = useMemo(() => {
    const accounting: DriverAccounting[] = [];

    drivers.forEach(driver => {
      // Get orders assigned to this driver (delivering or delivered)
      const driverOrders = orders.filter(
        order => order.delivery_person_id === driver.user_id && 
        (order.status === 'delivering' || order.status === 'delivered')
      );

      const deliveredOrders = driverOrders.filter(o => o.status === 'delivered');
      const deliveringOrders = driverOrders.filter(o => o.status === 'delivering');

      // Calculate total amount the driver owes (from delivered orders)
      const totalAmount = deliveredOrders.reduce((sum, order) => sum + Number(order.total_price), 0);

      accounting.push({
        id: driver.id,
        name: driver.full_name,
        phone: driver.phone,
        totalOrders: driverOrders.length,
        totalAmount,
        deliveredOrders: deliveredOrders.length,
        deliveringOrders: deliveringOrders.length,
      });
    });

    // Sort by total amount descending
    return accounting.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [drivers, orders]);

  const totalOwed = driverAccounting.reduce((sum, d) => sum + d.totalAmount, 0);

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
            <p>لا يوجد موظفي توصيل</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">إجمالي المستحقات للمطعم</span>
                <span className="text-xl font-bold text-primary">{totalOwed.toLocaleString()} د.ع</span>
              </div>
            </div>

            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-center">طلبات مسلّمة</TableHead>
                  <TableHead className="text-center">قيد التوصيل</TableHead>
                  <TableHead className="text-left">المستحقات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {driverAccounting.map(driver => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>
                      {driver.phone ? (
                        <a href={`tel:${driver.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                          <Phone className="w-3 h-3" />
                          {driver.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm">
                        {driver.deliveredOrders}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm">
                        {driver.deliveringOrders}
                      </span>
                    </TableCell>
                    <TableCell className="text-left font-bold text-primary">
                      {driver.totalAmount.toLocaleString()} د.ع
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
