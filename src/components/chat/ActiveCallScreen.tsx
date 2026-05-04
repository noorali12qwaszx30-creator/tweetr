import { useEffect, useState } from 'react';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCallSession } from '@/hooks/useWebRTC';

interface Props {
  callId: string;
  isCaller: boolean;
  peerName: string;
  onEnd: () => void;
}

/** Fullscreen active call UI with mute/end. */
export function ActiveCallScreen({ callId, isCaller, peerName, onEnd }: Props) {
  const { remoteAudioRef, muted, connected, statusText, toggleMute, endCall } = useCallSession(
    { callId, isCaller },
    onEnd,
  );
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!connected) return;
    const iv = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [connected]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-b from-zinc-900 to-zinc-800 text-white flex flex-col items-center justify-between p-8">
      <div className="mt-16 flex flex-col items-center gap-4">
        <div className="w-32 h-32 rounded-full bg-primary flex items-center justify-center text-5xl font-bold">
          {peerName.charAt(0)}
        </div>
        <h2 className="text-2xl font-bold">{peerName}</h2>
        <p className="text-sm opacity-80">
          {connected ? fmt(seconds) : statusText}
        </p>
      </div>
      <audio ref={remoteAudioRef} autoPlay />
      <div className="flex gap-8 mb-8">
        <Button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full ${muted ? 'bg-zinc-600' : 'bg-zinc-700'} hover:bg-zinc-600`}
          aria-label={muted ? 'إلغاء الكتم' : 'كتم'}
        >
          {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>
        <Button
          onClick={endCall}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700"
          aria-label="إنهاء"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}