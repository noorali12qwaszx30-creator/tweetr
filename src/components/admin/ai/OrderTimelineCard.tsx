import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, AlertTriangle, CheckCircle2, XCircle, Truck, ChefHat, Receipt } from 'lucide-react';

interface TimelineEvent {
  time: string;
  event: string;
  status: 'success' | 'warning' | 'error' | 'neutral';
  duration?: number;
}

interface OrderTimelineCardProps {
  orderNumber: number;
  events: TimelineEvent[];
  rootCause?: string;
  isProblematic: boolean;
}

const OrderTimelineCard: React.FC<OrderTimelineCardProps> = ({
  orderNumber,
  events,
  rootCause,
  isProblematic
}) => {
  const getStatusIcon = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'success': return 'border-green-500/30 bg-green-500/5';
      case 'warning': return 'border-yellow-500/30 bg-yellow-500/5';
      case 'error': return 'border-red-500/30 bg-red-500/5';
      default: return 'border-muted bg-muted/5';
    }
  };

  return (
    <Card className={`border-2 ${isProblematic ? 'border-red-500/30' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            <span>طلب #{orderNumber}</span>
          </div>
          {isProblematic && (
            <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full">
              يحتاج مراجعة
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Timeline */}
        <div className="relative">
          {events.map((event, i) => (
            <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
              <div className="flex flex-col items-center">
                <div className={`p-1.5 rounded-full border-2 ${getStatusColor(event.status)}`}>
                  {getStatusIcon(event.status)}
                </div>
                {i < events.length - 1 && (
                  <div className="w-0.5 h-6 bg-muted my-1" />
                )}
              </div>
              <div className="flex-1 pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{event.event}</span>
                  <span className="text-[10px] text-muted-foreground">{event.time}</span>
                </div>
                {event.duration && event.duration > 0 && (
                  <span className={`text-[10px] ${event.status === 'warning' || event.status === 'error' ? 'text-red-500' : 'text-muted-foreground'}`}>
                    ({event.duration} دقيقة)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Root Cause */}
        {rootCause && (
          <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs font-medium text-red-500">السبب الجذري</span>
            </div>
            <p className="text-xs text-muted-foreground">{rootCause}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderTimelineCard;
