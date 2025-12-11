// Notification sound hook using Web Audio API
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

export const playNotificationSound = (type: 'newOrder' | 'orderReady' | 'orderCancelled' | 'orderAssigned' | 'alert' = 'newOrder') => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Different sound patterns for different notification types
    switch (type) {
      case 'newOrder':
        // Upbeat double beep for new orders
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.4);
        break;
        
      case 'orderReady':
        // Success chime
        oscillator.frequency.setValueAtTime(523, ctx.currentTime);
        oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
        oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
        break;
        
      case 'orderCancelled':
        // Low tone for cancellation
        oscillator.frequency.setValueAtTime(300, ctx.currentTime);
        oscillator.frequency.setValueAtTime(200, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.4);
        break;
        
      case 'orderAssigned':
        // Quick notification beep
        oscillator.frequency.setValueAtTime(600, ctx.currentTime);
        oscillator.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.25);
        break;
        
      case 'alert':
        // Urgent triple beep
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.25);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.45);
        break;
    }
  } catch (error) {
    console.log('Audio notification not available');
  }
};

export const useNotificationSound = () => {
  return { playNotificationSound };
};
