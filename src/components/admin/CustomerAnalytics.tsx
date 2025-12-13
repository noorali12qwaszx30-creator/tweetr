import { useMemo, useState } from 'react';
import { Order } from '@/types';
import { Users, UserPlus, UserCheck, DollarSign, TrendingUp, Phone, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

interface CustomerAnalyticsProps {
  orders: Order[];
}

interface CustomerData {
  name: string;
  phone: string;
  address: string;
  orders: number;
  totalSpent: number;
}

export function CustomerAnalytics({ orders }: CustomerAnalyticsProps) {
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  const analytics = useMemo(() => {
    // Filter only delivery orders (entered by cashier)
    const deliveryOrders = orders.filter(order => order.type === 'delivery');
    
    const customerOrders: Record<string, CustomerData> = {};

    deliveryOrders.forEach(order => {
      const phone = order.customer.phone;
      if (!customerOrders[phone]) {
        customerOrders[phone] = { 
          orders: 0, 
          totalSpent: 0, 
          name: order.customer.name,
          phone: order.customer.phone,
          address: order.customer.address || 'غير محدد'
        };
      }
      customerOrders[phone].orders++;
      if (order.status === 'delivered') {
        customerOrders[phone].totalSpent += order.totalPrice;
      }
      // Update address if newer order has it
      if (order.customer.address) {
        customerOrders[phone].address = order.customer.address;
      }
    });

    const customers = Object.values(customerOrders);
    const totalCustomers = customers.length;
    const newCustomers = customers.filter(c => c.orders === 1).length;
    const returningCustomers = totalCustomers - newCustomers;
    const avgOrderValue = customers.length > 0 
      ? customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.reduce((sum, c) => sum + c.orders, 0)
      : 0;

    const topCustomers = customers
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      avgOrderValue,
      topCustomers,
    };
  }, [orders]);

  const toggleCustomer = (phone: string) => {
    setExpandedCustomer(prev => prev === phone ? null : phone);
  };

  return (
    <div className="space-y-4">
      {/* Customer Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-primary" />
            <p className="text-muted-foreground text-sm">عملاء الدلفري</p>
          </div>
          <p className="text-2xl font-bold">{analytics.totalCustomers}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-5 h-5 text-success" />
            <p className="text-muted-foreground text-sm">عملاء جدد</p>
          </div>
          <p className="text-2xl font-bold text-success">{analytics.newCustomers}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="w-5 h-5 text-info" />
            <p className="text-muted-foreground text-sm">عملاء عائدون</p>
          </div>
          <p className="text-2xl font-bold text-info">{analytics.returningCustomers}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-warning" />
            <p className="text-muted-foreground text-sm">متوسط الطلب</p>
          </div>
          <p className="text-2xl font-bold text-warning">{Math.round(analytics.avgOrderValue).toLocaleString()}</p>
        </div>
      </div>

      {/* Top Customers */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          أعلى عملاء الدلفري صرفاً
        </h3>
        {analytics.topCustomers.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">لا توجد بيانات</p>
        ) : (
          <div className="space-y-2">
            {analytics.topCustomers.map((customer, idx) => (
              <div key={customer.phone} className="overflow-hidden rounded-lg border border-border">
                <button
                  onClick={() => toggleCustomer(customer.phone)}
                  className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-primary/10 text-primary rounded-full text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-medium">{customer.name}</span>
                    {expandedCustomer === customer.phone ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-success">{customer.totalSpent.toLocaleString()} د.ع</p>
                    <p className="text-xs text-muted-foreground">{customer.orders} طلب</p>
                  </div>
                </button>
                
                {expandedCustomer === customer.phone && (
                  <div className="p-3 bg-muted/10 border-t border-border space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">رقم الهاتف:</span>
                      <a 
                        href={`tel:${customer.phone}`} 
                        className="font-medium text-primary hover:underline"
                        dir="ltr"
                      >
                        {customer.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">العنوان:</span>
                      <span className="font-medium">{customer.address}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
