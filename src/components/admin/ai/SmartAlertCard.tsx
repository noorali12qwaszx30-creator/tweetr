import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, AlertCircle, Info, ChevronLeft } from 'lucide-react';

export interface SmartAlert {
  id: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  cause?: string;
  suggestion?: string;
  timestamp: Date;
}

interface SmartAlertCardProps {
  alert: SmartAlert;
  onClick?: () => void;
}

const SmartAlertCard: React.FC<SmartAlertCardProps> = ({ alert, onClick }) => {
  const getLevelStyles = (level: SmartAlert['level']) => {
    switch (level) {
      case 'critical':
        return {
          bg: 'bg-red-500/10 border-red-500/30 hover:border-red-500/50',
          icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
          badge: 'bg-red-500 text-white',
          label: 'حرج'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50',
          icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
          badge: 'bg-yellow-500 text-black',
          label: 'تحذير'
        };
      case 'info':
        return {
          bg: 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50',
          icon: <Info className="w-5 h-5 text-blue-500" />,
          badge: 'bg-blue-500 text-white',
          label: 'معلومة'
        };
    }
  };

  const styles = getLevelStyles(alert.level);

  return (
    <Card 
      className={`border-2 cursor-pointer transition-all ${styles.bg}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{styles.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${styles.badge}`}>
                {styles.label}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {alert.timestamp.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h4 className="font-medium text-sm mb-1">{alert.title}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2">{alert.description}</p>
            
            {alert.suggestion && (
              <div className="mt-2 text-xs text-primary flex items-center gap-1">
                <span>💡 {alert.suggestion}</span>
              </div>
            )}
          </div>
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartAlertCard;
