import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface IncomingCall {
  id: string;
  caller_id: string;
  caller_name: string;
  callee_id: string;
  callee_name: string;
  status: string;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/** Watches for incoming calls for the current user. */
export function useIncomingCalls() {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`incoming-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_calls', filter: `callee_id=eq.${user.id}` },
        (payload) => {
          const call = payload.new as IncomingCall;
          if (call.status === 'ringing') setIncoming(call);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_calls', filter: `callee_id=eq.${user.id}` },
        (payload) => {
          const call = payload.new as IncomingCall;
          if (call.status !== 'ringing' && incoming?.id === call.id) setIncoming(null);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, incoming?.id]);

  const dismiss = () => setIncoming(null);
  return { incoming, dismiss };
}

interface CallSession {
  callId: string;
  isCaller: boolean;
}

/** Manages an active WebRTC call session. */
export function useCallSession(session: CallSession | null, onEnd: () => void) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    const start = async () => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      // Get mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // Remote audio
      pc.ontrack = (e) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = e.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') setConnected(true);
        if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) onEnd();
      };
      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          // Append candidate to call
          const { data } = await supabase
            .from('chat_calls')
            .select('ice_candidates')
            .eq('id', session.callId)
            .maybeSingle();
          const arr = (data?.ice_candidates as any[]) || [];
          arr.push({ from: session.isCaller ? 'caller' : 'callee', candidate: e.candidate.toJSON() });
          await supabase.from('chat_calls').update({ ice_candidates: arr }).eq('id', session.callId);
        }
      };

      // Subscribe to remote signaling
      const ch = supabase
        .channel(`call-${session.callId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'chat_calls', filter: `id=eq.${session.callId}` },
          async (payload) => {
            const row: any = payload.new;
            if (row.status === 'ended' || row.status === 'rejected' || row.status === 'cancelled') {
              onEnd();
              return;
            }
            if (session.isCaller && row.webrtc_answer && !pc.currentRemoteDescription) {
              await pc.setRemoteDescription(new RTCSessionDescription(row.webrtc_answer));
            }
            // Apply ICE candidates from the other side
            const cands = (row.ice_candidates as any[]) || [];
            for (const c of cands) {
              const fromOther = session.isCaller ? c.from === 'callee' : c.from === 'caller';
              if (fromOther) {
                try {
                  await pc.addIceCandidate(c.candidate);
                } catch {}
              }
            }
          },
        )
        .subscribe();

      if (session.isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await supabase
          .from('chat_calls')
          .update({ webrtc_offer: offer as any })
          .eq('id', session.callId);
      } else {
        // Callee: load offer, create answer
        const { data } = await supabase
          .from('chat_calls')
          .select('webrtc_offer')
          .eq('id', session.callId)
          .maybeSingle();
        if (data?.webrtc_offer) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.webrtc_offer as any));
          const ans = await pc.createAnswer();
          await pc.setLocalDescription(ans);
          await supabase
            .from('chat_calls')
            .update({ webrtc_answer: ans as any, status: 'accepted', answered_at: new Date().toISOString() })
            .eq('id', session.callId);
        }
      }

      if (cancelled) {
        pc.close();
        return;
      }

      return () => supabase.removeChannel(ch);
    };

    let cleanup: any;
    start().then((c) => {
      cleanup = c;
    });
    return () => {
      cancelled = true;
      cleanup?.();
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current = null;
      localStreamRef.current = null;
    };
  }, [session?.callId, session?.isCaller]);

  const toggleMute = useCallback(() => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? [];
    tracks.forEach((t) => (t.enabled = !t.enabled));
    setMuted((m) => !m);
  }, []);

  const endCall = useCallback(async () => {
    if (!session) return;
    await supabase
      .from('chat_calls')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', session.callId);
    onEnd();
  }, [session, onEnd]);

  return { remoteAudioRef, muted, connected, toggleMute, endCall };
}

/** Initiates a call to another user. Returns the call id. */
export async function initiateCall(
  callerId: string,
  callerName: string,
  calleeId: string,
  calleeName: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('chat_calls')
    .insert({
      caller_id: callerId,
      caller_name: callerName,
      callee_id: calleeId,
      callee_name: calleeName,
      status: 'ringing',
    })
    .select('id')
    .single();
  if (error || !data) throw error;
  // Trigger push (best-effort)
  supabase.functions
    .invoke('send-chat-notification', {
      body: { type: 'call', call_id: data.id, callee_id: calleeId, caller_name: callerName },
    })
    .catch(() => {});
  return data.id;
}

export async function acceptCall(callId: string) {
  // status will be set by useCallSession when answer is created
  return callId;
}

export async function rejectCall(callId: string) {
  await supabase
    .from('chat_calls')
    .update({ status: 'rejected', ended_at: new Date().toISOString() })
    .eq('id', callId);
}