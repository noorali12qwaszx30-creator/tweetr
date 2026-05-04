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
  // Free TURN (OpenRelay by metered.ca) — required to traverse strict NATs (4G/LTE)
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
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
  const [statusText, setStatusText] = useState<string>('جارٍ الاتصال...');

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const role: 'caller' | 'callee' = session.isCaller ? 'caller' : 'callee';
    const otherRole: 'caller' | 'callee' = session.isCaller ? 'callee' : 'caller';
    const appliedCandidates = new Set<string>();
    let heartbeatIv: any;
    let watchdogIv: any;
    let lastPeerPing = Date.now();

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
        if (pc.connectionState === 'connected') {
          setConnected(true);
          setStatusText('متصل');
        }
        if (pc.connectionState === 'disconnected') setStatusText('إعادة المحاولة...');
        if (['failed', 'closed'].includes(pc.connectionState)) {
          setStatusText('انقطع الاتصال');
          onEnd();
        }
      };
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'checking') setStatusText('جارٍ الاتصال...');
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setConnected(true);
          setStatusText('متصل');
        }
        if (pc.iceConnectionState === 'failed') {
          setStatusText('فشل الاتصال');
          onEnd();
        }
      };
      pc.onicecandidate = async (e) => {
        if (!e.candidate) return;
        // Insert candidate as its own row to avoid update races
        await (supabase as any).from('chat_ice_candidates').insert({
          call_id: session.callId,
          from_role: role,
          candidate: e.candidate.toJSON(),
        });
      };

      // Subscribe to remote signaling (call status / answer)
      const callCh = supabase
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
            // Heartbeat from peer
            const peerPing = session.isCaller ? row.callee_last_ping_at : row.caller_last_ping_at;
            if (peerPing) lastPeerPing = new Date(peerPing).getTime();
            if (session.isCaller && row.webrtc_answer && !pc.currentRemoteDescription) {
              await pc.setRemoteDescription(new RTCSessionDescription(row.webrtc_answer));
            }
          },
        )
        .subscribe();

      // Subscribe to ICE candidates inserted by the peer
      const iceCh = supabase
        .channel(`ice-${session.callId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_ice_candidates', filter: `call_id=eq.${session.callId}` },
          async (payload) => {
            const row: any = payload.new;
            if (row.from_role !== otherRole) return;
            if (appliedCandidates.has(row.id)) return;
            appliedCandidates.add(row.id);
            try {
              await pc.addIceCandidate(row.candidate);
            } catch {}
          },
        )
        .subscribe();

      // Backfill any candidates already present
      const { data: existingCands } = await (supabase as any)
        .from('chat_ice_candidates')
        .select('id, from_role, candidate')
        .eq('call_id', session.callId);
      for (const c of existingCands ?? []) {
        if (c.from_role !== otherRole || appliedCandidates.has(c.id)) continue;
        appliedCandidates.add(c.id);
        try { await pc.addIceCandidate(c.candidate); } catch {}
      }

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

      // Heartbeat: write our ping every 3s
      const pingCol = session.isCaller ? 'caller_last_ping_at' : 'callee_last_ping_at';
      const sendPing = async () => {
        await (supabase as any)
          .from('chat_calls')
          .update({ [pingCol]: new Date().toISOString() })
          .eq('id', session.callId);
      };
      sendPing();
      heartbeatIv = setInterval(sendPing, 3000);

      // Watchdog: if peer ping older than 12s after connected, end call
      lastPeerPing = Date.now();
      watchdogIv = setInterval(() => {
        if (Date.now() - lastPeerPing > 12000 && (pc.connectionState === 'connected' || pc.iceConnectionState === 'connected')) {
          setStatusText('انقطع الاتصال');
          onEnd();
        }
      }, 2000);

      if (cancelled) {
        pc.close();
        return;
      }

      return () => {
        supabase.removeChannel(callCh);
        supabase.removeChannel(iceCh);
      };
    };

    let cleanup: any;
    start().then((c) => {
      cleanup = c;
    });
    return () => {
      cancelled = true;
      cleanup?.();
      clearInterval(heartbeatIv);
      clearInterval(watchdogIv);
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

  return { remoteAudioRef, muted, connected, statusText, toggleMute, endCall };
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