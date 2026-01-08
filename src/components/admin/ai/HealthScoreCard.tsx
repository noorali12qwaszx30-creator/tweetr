import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface HealthScoreCardProps {
  score: number;
  factors: {
    kitchenSpeed: number;
    deliveryEfficiency: number;
    cancellationRate: number;
    orderFlow: number;
  };
}

const HealthScoreCard: React.FC<HealthScoreCardProps> = ({ score, factors }) => {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-500';
    if (s >= 60) return 'text-yellow-500';
    if (s >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBg = (s: number) => {
    if (s >= 80) return 'bg-green-500/10 border-green-500/30';
    if (s >= 60) return 'bg-yellow-500/10 border-yellow-500/30';
    if (s >= 40) return 'bg-orange-500/10 border-orange-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return 'ممتاز';
    if (s >= 60) return 'جيد';
    if (s >= 40) return 'متوسط';
    return 'يحتاج تحسين';
  };

  const getFactorIcon = (value: number) => {
    if (value >= 70) return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (value >= 40) return <Minus className="w-3 h-3 text-yellow-500" />;
    return <TrendingDown className="w-3 h-3 text-red-500" />;
  };

  return (
    <Card className={`border-2 ${getScoreBg(score)}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className={`w-5 h-5 ${getScoreColor(score)}`} />
            <span className="font-semibold text-sm">صحة المطعم</span>
          </div>
          <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
            {score}%
          </span>
        </div>
        
        <div className="text-center mb-4">
          <span className={`text-sm font-medium ${getScoreColor(score)}`}>
            {getScoreLabel(score)}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">سرعة المطبخ</span>
            <div className="flex items-center gap-1">
              {getFactorIcon(factors.kitchenSpeed)}
              <span>{factors.kitchenSpeed}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">كفاءة التوصيل</span>
            <div className="flex items-center gap-1">
              {getFactorIcon(factors.deliveryEfficiency)}
              <span>{factors.deliveryEfficiency}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">نسبة عدم الإلغاء</span>
            <div className="flex items-center gap-1">
              {getFactorIcon(100 - factors.cancellationRate)}
              <span>{100 - factors.cancellationRate}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">سير الطلبات</span>
            <div className="flex items-center gap-1">
              {getFactorIcon(factors.orderFlow)}
              <span>{factors.orderFlow}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HealthScoreCard;
