import { useState, useMemo } from 'react';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';
import { KPICard } from './KPICard';
import { formatNumberWithCommas, toEnglishNumbers } from '@/lib/formatNumber';
import { 
  Clock, 
  AlertTriangle, 
  Package, 
  Timer,
  ChefHat,
  CheckCircle,
  Truck
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend
} from 'recharts';

interface ExecutivePulseDashboardProps {
  orders: OrderWithItems[];
  onOrderClick?: (order: OrderWithItems) => void;
}

export function ExecutivePulseDashboard({ orders, onOrderClick }: ExecutivePulseDashboardProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // Calculate active orders (not delivered, not cancelled, not archived)
  const activeOrders = useMemo(() => 
    orders.filter(o => !['delivered', 'cancelled'].includes(o.status)),
    [orders]
  );

  // Calculate delayed orders (more than 30 minutes without delivery)
  const delayedOrders = useMemo(() => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    return activeOrders.filter(o => new Date(o.created_at) < thirtyMinutesAgo);
  }, [activeOrders]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    const preparing = activeOrders.filter(o => o.status === 'preparing').length;
    const ready = activeOrders.filter(o => o.status === 'ready').length;
    const delivering = activeOrders.filter(o => o.status === 'delivering').length;
    const pending = activeOrders.filter(o => o.status === 'pending').length;
    
    return [
      { name: 'قيد الانتظار', value: pending, color: 'hsl(var(--muted-foreground))' },
      { name: 'قيد التجهيز', value: preparing, color: 'hsl(var(--warning))' },
      { name: 'جاهز', value: ready, color: 'hsl(var(--success))' },
      { name: 'قيد التوصيل', value: delivering, color: 'hsl(var(--primary))' },
    ].filter(s => s.value > 0);
  }, [activeOrders]);

  // Find longest waiting order
  const longestWaitingOrder = useMemo(() => {
    if (activeOrders.length === 0) return null;
    return activeOrders.reduce((oldest, current) => 
      new Date(current.created_at) < new Date(oldest.created_at) ? current : oldest
    );
  }, [activeOrders]);

  const getLongestWaitTime = () => {
    if (!longestWaitingOrder) return 0;
    const now = new Date();
    const created = new Date(longestWaitingOrder.created_at);
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
  };

  // Wait time per order for bar chart
  const waitTimeData = useMemo(() => {
    return activeOrders
      .map(order => {
        const now = new Date();
        const created = new Date(order.created_at);
        const waitMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
        return {
          orderNumber: `#${order.order_number}`,
          waitTime: waitMinutes,
          status: order.status,
          order
        };
      })
      .sort((a, b) => b.waitTime - a.waitTime)
      .slice(0, 10);
  }, [activeOrders]);

  // Get filtered orders based on selected status
  const filteredOrders = useMemo(() => {
    if (!selectedStatus) return null;
    
    if (selectedStatus === 'delayed') {
      return delayedOrders;
    }
    
    return activeOrders.filter(o => {
      if (selectedStatus === 'قيد الانتظار') return o.status === 'pending';
      if (selectedStatus === 'قيد التجهيز') return o.status === 'preparing';
      if (selectedStatus === 'جاهز') return o.status === 'ready';
      if (selectedStatus === 'قيد التوصيل') return o.status === 'delivering';
      return false;
    });
  }, [selectedStatus, activeOrders, delayedOrders]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'preparing': return <ChefHat className="w-4 h-4" />;
      case 'ready': return <CheckCircle className="w-4 h-4" />;
      case 'delivering': return <Truck className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'preparing': return 'قيد التجهيز';
      case 'ready': return 'جاهز';
      case 'delivering': return 'قيد التوصيل';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-muted-foreground';
      case 'preparing': return 'text-warning';
      case 'ready': return 'text-success';
      case 'delivering': return 'text-primary';
      default: return 'text-foreground';
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => setSelectedStatus(null)}
        >
          <KPICard 
            title="الطلبات الحالية" 
            value={activeOrders.length} 
            icon={<Package className="w-5 h-5" />}
          />
        </div>
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => setSelectedStatus('delayed')}
        >
          <KPICard 
            title="الطلبات المتأخرة" 
            value={delayedOrders.length} 
            icon={<AlertTriangle className="w-5 h-5" />}
            variant={delayedOrders.length > 0 ? 'destructive' : 'default'}
          />
        </div>
        <div 
          className="cursor-pointer transition-transform hover:scale-[1.02] col-span-2"
          onClick={() => longestWaitingOrder && onOrderClick?.(longestWaitingOrder)}
        >
          <KPICard 
            title="أطول وقت انتظار" 
            value={getLongestWaitTime()} 
            suffix="دقيقة"
            icon={<Timer className="w-5 h-5" />}
            variant={getLongestWaitTime() > 30 ? 'warning' : 'default'}
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie Chart - Status Distribution */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <h3 className="font-bold mb-3 text-sm">توزيع الحالات</h3>
          {statusDistribution.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">لا توجد طلبات نشطة</p>
          ) : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={(data) => setSelectedStatus(data.name)}
                    className="cursor-pointer"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        className="hover:opacity-80 transition-opacity"
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [toEnglishNumbers(value), 'طلب']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      direction: 'rtl'
                    }}
                  />
                  <Legend 
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bar Chart - Wait Times */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <h3 className="font-bold mb-3 text-sm">مدة الانتظار (دقيقة)</h3>
          {waitTimeData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">لا توجد طلبات نشطة</p>
          ) : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waitTimeData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis 
                    type="category" 
                    dataKey="orderNumber" 
                    width={40}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${toEnglishNumbers(value)} دقيقة`, 'مدة الانتظار']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      direction: 'rtl'
                    }}
                  />
                  <Bar 
                    dataKey="waitTime" 
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                    onClick={(data) => onOrderClick?.(data.order)}
                    className="cursor-pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Filtered Orders List */}
      {filteredOrders && filteredOrders.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">
              {selectedStatus === 'delayed' ? 'الطلبات المتأخرة' : selectedStatus}
              <span className="text-muted-foreground font-normal mr-2">
                ({toEnglishNumbers(filteredOrders.length)})
              </span>
            </h3>
            <button 
              onClick={() => setSelectedStatus(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              إغلاق
            </button>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-auto">
            {filteredOrders.map(order => (
              <div 
                key={order.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                onClick={() => onOrderClick?.(order)}
              >
                <div className="flex items-center gap-3">
                  <span className={getStatusColor(order.status)}>
                    {getStatusIcon(order.status)}
                  </span>
                  <div>
                    <p className="font-bold text-sm">#{toEnglishNumbers(order.order_number)}</p>
                    <p className="text-xs text-muted-foreground">{order.customer_name}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">{getStatusLabel(order.status)}</p>
                  <p className="text-xs font-medium">
                    {toEnglishNumbers(Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000))} دقيقة
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
