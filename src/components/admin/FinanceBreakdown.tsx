import { useMemo } from 'react';
import { Order } from '@/types';
import { DollarSign, CreditCard, Banknote, TrendingUp, TrendingDown, Percent, PieChart } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface FinanceBreakdownProps {
  orders: Order[];
}

export function FinanceBreakdown({ orders }: FinanceBreakdownProps) {
  const finance = useMemo(() => {
    const completed = orders.filter(o => o.status === 'delivered');
    const cancelled = orders.filter(o => o.status === 'cancelled');
    
    const totalSales = completed.reduce((sum, o) => sum + o.totalPrice, 0);
    const totalDiscounts = 0; // Would come from order data
    const grossProfit = totalSales - totalDiscounts;
    const netProfit = grossProfit * 0.3; // Simplified: 30% margin
    
    // Simulate payment methods distribution
    const cashRevenue = totalSales * 0.65; // 65% cash
    const onlineRevenue = totalSales * 0.35; // 35% online
    
    const cancelledValue = cancelled.reduce((sum, o) => sum + o.totalPrice, 0);
    
    // Yesterday comparison (simulated)
    const yesterdayTotal = totalSales * (Math.random() * 0.4 + 0.8); // 80-120% of today
    const changePercent = totalSales > 0 ? ((totalSales - yesterdayTotal) / yesterdayTotal) * 100 : 0;

    return {
      totalSales,
      totalDiscounts,
      grossProfit,
      netProfit,
      cashRevenue,
      onlineRevenue,
      cancelledValue,
      changePercent: Math.round(changePercent),
      completedCount: completed.length,
      cancelledCount: cancelled.length,
    };
  }, [orders]);

  const paymentData = [
    { name: 'نقدي', value: finance.cashRevenue, color: 'hsl(var(--success))' },
    { name: 'إلكتروني', value: finance.onlineRevenue, color: 'hsl(var(--info))' },
  ];

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-success/20 to-success/5 border border-success/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-success" />
            <p className="text-success text-sm font-medium">إجمالي المبيعات</p>
          </div>
          <p className="text-2xl font-bold text-success">{finance.totalSales.toLocaleString()}</p>
          <p className="text-xs text-success/70">{finance.completedCount} طلب مكتمل</p>
        </div>
        
        <div className="bg-gradient-to-br from-warning/20 to-warning/5 border border-warning/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-5 h-5 text-warning" />
            <p className="text-warning text-sm font-medium">الخصومات</p>
          </div>
          <p className="text-2xl font-bold text-warning">{finance.totalDiscounts.toLocaleString()}</p>
        </div>
        
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <p className="text-primary text-sm font-medium">إجمالي الأرباح</p>
          </div>
          <p className="text-2xl font-bold text-primary">{finance.grossProfit.toLocaleString()}</p>
        </div>
        
        <div className="bg-gradient-to-br from-info/20 to-info/5 border border-info/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-info" />
            <p className="text-info text-sm font-medium">صافي الربح</p>
          </div>
          <p className="text-2xl font-bold text-info">{Math.round(finance.netProfit).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Methods */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            توزيع وسائل الدفع
          </h3>
          
          <div className="flex items-center gap-4">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={50}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `${value.toLocaleString()} د.ع`}
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between p-2 bg-success/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-success" />
                  <span>نقدي</span>
                </div>
                <span className="font-bold text-success">{finance.cashRevenue.toLocaleString()} د.ع</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-info/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-info" />
                  <span>إلكتروني</span>
                </div>
                <span className="font-bold text-info">{finance.onlineRevenue.toLocaleString()} د.ع</span>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            {finance.changePercent >= 0 ? 
              <TrendingUp className="w-5 h-5 text-success" /> : 
              <TrendingDown className="w-5 h-5 text-destructive" />
            }
            مقارنة مع أمس
          </h3>
          
          <div className="space-y-4">
            <div className={`p-4 rounded-xl ${finance.changePercent >= 0 ? 'bg-success/10 border border-success/30' : 'bg-destructive/10 border border-destructive/30'}`}>
              <p className="text-sm text-muted-foreground mb-1">التغير في المبيعات</p>
              <p className={`text-3xl font-bold ${finance.changePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                {finance.changePercent >= 0 ? '+' : ''}{finance.changePercent}%
              </p>
            </div>
            
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">خسائر الإلغاء</p>
                  <p className="text-xl font-bold text-destructive">{finance.cancelledValue.toLocaleString()} د.ع</p>
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-destructive">{finance.cancelledCount}</p>
                  <p className="text-xs text-muted-foreground">طلب ملغي</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
