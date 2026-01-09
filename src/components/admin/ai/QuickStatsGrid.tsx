import React from 'react';
import { Card } from '@/components/ui/card';
import { 
  ShoppingBag, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Truck, 
  ChefHat,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface QuickStatsGridProps {
  stats: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    activeOrders: number;
    preparingOrders: number;
    deliveringOrders: number;
    avgDeliveryTime: number;
    completionRate: number;
  };
  previousStats?: {
    totalOrders: number;
    completionRate: number;
  };
}

const QuickStatsGrid: React.FC<QuickStatsGridProps> = ({ stats, previousStats }) => {
  if (!stats) {
    return null;
  }

  const getTrend = (current: number, previous: number) => {
    if (!previous) return null;
    const diff = ((current - previous) / previous) * 100;
    if (diff > 0) return { icon: TrendingUp, color: 'text-green-500', value: `+${diff.toFixed(0)}%` };
    if (diff < 0) return { icon: TrendingDown, color: 'text-red-500', value: `${diff.toFixed(0)}%` };
    return null;
  };

  const statItems = [
    {
      label: 'إجمالي الطلبات',
      value: stats.totalOrders ?? 0,
      icon: ShoppingBag,
      color: 'text-primary',
      bg: 'bg-primary/10'
    },
    {
      label: 'مكتمل',
      value: stats.completedOrders ?? 0,
      icon: CheckCircle2,
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    },
    {
      label: 'ملغي',
      value: stats.cancelledOrders ?? 0,
      icon: XCircle,
      color: 'text-red-500',
      bg: 'bg-red-500/10'
    },
    {
      label: 'نشط الآن',
      value: stats.activeOrders ?? 0,
      icon: Clock,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10'
    },
    {
      label: 'قيد التحضير',
      value: stats.preparingOrders ?? 0,
      icon: ChefHat,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10'
    },
    {
      label: 'قيد التوصيل',
      value: stats.deliveringOrders ?? 0,
      icon: Truck,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
      {statItems.map((item, i) => (
        <Card key={i} className={`p-3 text-center ${item.bg} border-0`}>
          <item.icon className={`w-5 h-5 mx-auto mb-1 ${item.color}`} />
          <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
          <div className="text-[10px] text-muted-foreground">{item.label}</div>
        </Card>
      ))}
    </div>
  );
};

export default QuickStatsGrid;
