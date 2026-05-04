import { useEffect, useRef } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { rejectCall, IncomingCall } from '@/hooks/useWebRTC';

interface Props {
  call: IncomingCall;
  onAccept: () => void;
  onReject: () => void;
}

/** Fullscreen incoming call screen with ringtone. */
export function IncomingCallScreen({ call, onAccept, onReject }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Use a short repeating tone via WebAudio (no asset needed)
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    let stopped = false;
    const playRing = () => {
      if (stopped) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 480;
      gain.gain.value = 0.15;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        const osc2 = ctx.createOscillator();
        osc2.frequency.value = 620;
        osc2.connect(gain).connect(ctx.destination);
        osc2.start();
        setTimeout(() => osc2.stop(), 400);
      }, 400);
    };
    playRing();
    const iv = setInterval(playRing, 2000);
    if (navigator.vibrate) navigator.vibrate([400, 200, 400]);
    const vib = setInterval(() => navigator.vibrate?.([400, 200, 400]), 2000);
    return () => {
      stopped = true;
      clearInterval(iv);
      clearInterval(vib);
      ctx.close().catch(() => {});
    };
  }, []);

  const handleReject = async () => {
    await rejectCall(call.id);
    onReject();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-b from-primary/95 to-primary text-primary-foreground flex flex-col items-center justify-between p-8">
      <div className="mt-16 flex flex-col items-center gap-4">
        <p className="text-sm opacity-80">مكالمة واردة</p>
        <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center text-5xl font-bold">
          {call.caller_name.charAt(0)}
        </div>
        <h2 className="text-2xl font-bold">{call.caller_name}</h2>
        <p className="text-sm opacity-80 animate-pulse">يتصل بك...</p>
      </div>
      <div className="flex gap-12 mb-8">
        <Button
          onClick={handleReject}
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700"
          aria-label="رفض"
        >
          <PhoneOff className="w-8 h-8" />
        </Button>
        <Button
          onClick={onAccept}
          className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 animate-pulse"
          aria-label="قبول"
        >
          <Phone className="w-8 h-8" />
        </Button>
      </div>
    </div>
  );
}