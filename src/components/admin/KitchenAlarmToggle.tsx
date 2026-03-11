import { useState } from 'react';
import { Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function KitchenAlarmToggle() {
  const [alarmActive, setAlarmActive] = useState(false);

  const toggleAlarm = async () => {
    const newState = !alarmActive;
    setAlarmActive(newState);

    await supabase.channel('kitchen-alarm-control').send({
      type: 'broadcast',
      event: 'alarm-toggle',
      payload: { active: newState },
    });

    toast(newState ? '🔔 تم تفعيل إنذار المطبخ' : '🔕 تم إيقاف إنذار المطبخ');
  };

  return (
    <Button
      variant={alarmActive ? 'destructive' : 'outline'}
      size="lg"
      className={`w-full justify-start h-auto py-4 ${
        alarmActive
          ? 'animate-pulse border-2 border-destructive'
          : 'border-2 border-warning bg-warning/10 hover:bg-warning/20 text-warning hover:text-warning'
      }`}
      onClick={toggleAlarm}
    >
      <Siren className="w-6 h-6 ml-3" />
      <div className="text-right">
        <p className="font-bold text-lg">
          {alarmActive ? '🔴 إيقاف إنذار المطبخ' : '🔔 تفعيل إنذار المطبخ'}
        </p>
        <p className={`text-sm ${alarmActive ? 'text-destructive-foreground/80' : 'text-muted-foreground'}`}>
          {alarmActive ? 'الإنذار يعمل الآن في شاشة المطبخ' : 'إرسال إنذار فوري لشاشة المطبخ'}
        </p>
      </div>
    </Button>
  );
}
