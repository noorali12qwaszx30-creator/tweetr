import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, ThumbsUp, AlertTriangle, Lightbulb } from 'lucide-react';

interface ShiftSummaryProps {
  shiftName: string;
  strengths: string[];
  problems: string[];
  recommendation: string;
  stats: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    avgDeliveryTime: number;
  };
}

const ShiftSummaryCard: React.FC<ShiftSummaryProps> = ({
  shiftName,
  strengths,
  problems,
  recommendation,
  stats
}) => {
  return (
    <Card className="border-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="w-5 h-5 text-primary" />
          ملخص الشفت: {shiftName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-lg font-bold">{stats.totalOrders}</div>
            <div className="text-[10px] text-muted-foreground">طلب</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-2">
            <div className="text-lg font-bold text-green-500">{stats.completedOrders}</div>
            <div className="text-[10px] text-muted-foreground">مكتمل</div>
          </div>
          <div className="bg-red-500/10 rounded-lg p-2">
            <div className="text-lg font-bold text-red-500">{stats.cancelledOrders}</div>
            <div className="text-[10px] text-muted-foreground">ملغي</div>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-2">
            <div className="text-lg font-bold text-blue-500">{stats.avgDeliveryTime}</div>
            <div className="text-[10px] text-muted-foreground">دقيقة/توصيل</div>
          </div>
        </div>

        {/* Strengths */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ThumbsUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">نقاط القوة</span>
          </div>
          <ul className="space-y-1">
            {strengths.map((item, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Problems */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium">مشاكل تحتاج انتباه</span>
          </div>
          <ul className="space-y-1">
            {problems.map((item, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-red-500">✗</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommendation */}
        <div className="bg-primary/10 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">توصية للشفت القادم</span>
          </div>
          <p className="text-xs text-muted-foreground">{recommendation}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShiftSummaryCard;
