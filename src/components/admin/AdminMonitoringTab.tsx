import { OrderWithItems } from '@/hooks/useSupabaseOrders';
import { ExecutivePulseDashboard } from './ExecutivePulseDashboard';
import { BehaviorAnalysis } from './BehaviorAnalysis';
import { OrderTimeline } from './OrderTimeline';
import { PredictiveAnalysis } from './PredictiveAnalysis';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, AlertTriangle, Clock, TrendingUp } from 'lucide-react';

interface AdminMonitoringTabProps {
  orders: OrderWithItems[];
}

export function AdminMonitoringTab({ orders }: AdminMonitoringTabProps) {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="pulse">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pulse" className="text-xs px-1 gap-1">
            <Activity className="w-3 h-3" />
            النبض
          </TabsTrigger>
          <TabsTrigger value="behavior" className="text-xs px-1 gap-1">
            <AlertTriangle className="w-3 h-3" />
            الأنماط
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs px-1 gap-1">
            <Clock className="w-3 h-3" />
            الخط الزمني
          </TabsTrigger>
          <TabsTrigger value="predictive" className="text-xs px-1 gap-1">
            <TrendingUp className="w-3 h-3" />
            التنبؤي
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pulse" className="mt-4">
          <ExecutivePulseDashboard orders={orders} />
        </TabsContent>

        <TabsContent value="behavior" className="mt-4">
          <BehaviorAnalysis orders={orders} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <OrderTimeline orders={orders} />
        </TabsContent>

        <TabsContent value="predictive" className="mt-4">
          <PredictiveAnalysis orders={orders} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
