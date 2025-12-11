import { useState, useEffect, useCallback } from 'react';

const LETTERS = ['ج', 'و', 'م', 'ا', 'ن', 'ج', 'ي'];

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState(0); // 0: initial, 1: flying, 2: dancing, 3: assembling, 4: impact, 5: complete
  const [showFlash, setShowFlash] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  useEffect(() => {
    // Start animation sequence
    const timers: NodeJS.Timeout[] = [];
    
    // Phase 1: Start flying in
    timers.push(setTimeout(() => setPhase(1), 100));
    
    // Phase 2: Dancing
    timers.push(setTimeout(() => setPhase(2), 1000));
    
    // Phase 3: Assembling
    timers.push(setTimeout(() => setPhase(3), 2200));
    
    // Phase 4: Impact
    timers.push(setTimeout(() => {
      setPhase(4);
      setShowFlash(true);
      setShowParticles(true);
      setTimeout(() => setShowFlash(false), 300);
    }, 3000));
    
    // Phase 5: Complete and callback
    timers.push(setTimeout(() => {
      setPhase(5);
      setTimeout(onComplete, 1000);
    }, 3800));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const getLetterTransform = (index: number) => {
    const angles = [-45, 45, -30, 0, 30, -60, 60];
    const distances = [400, 350, 380, 300, 360, 340, 320];
    
    switch (phase) {
      case 0:
        return {
          transform: `translate(${Math.cos(angles[index] * Math.PI / 180) * distances[index]}px, ${Math.sin(angles[index] * Math.PI / 180) * distances[index]}px) rotate(${angles[index] * 3}deg) scale(0.3)`,
          opacity: 0,
        };
      case 1:
        return {
          transform: `translate(${Math.cos(angles[index] * Math.PI / 180) * 150}px, ${Math.sin(angles[index] * Math.PI / 180) * 100}px) rotate(${angles[index] * 2}deg) scale(1)`,
          opacity: 1,
        };
      case 2:
        const wobbleX = Math.sin(Date.now() / 200 + index) * 20;
        const wobbleY = Math.cos(Date.now() / 200 + index) * 15;
        return {
          transform: `translate(${wobbleX}px, ${wobbleY}px) rotate(${360 + index * 20}deg) scale(1.1)`,
          opacity: 1,
        };
      case 3:
      case 4:
      case 5:
        return {
          transform: 'translate(0, 0) rotate(0deg) scale(1)',
          opacity: 1,
        };
      default:
        return { transform: 'none', opacity: 0 };
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden transition-colors duration-500 ${
        phase >= 4 ? 'bg-background' : 'bg-gradient-to-br from-background via-background to-primary/20'
      }`}
      style={{
        animation: phase === 4 ? 'shake 0.3s ease-in-out' : 'none',
      }}
    >
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-700 ${
            phase >= 4 
              ? 'w-[800px] h-[800px] bg-primary/20 blur-3xl' 
              : 'w-32 h-32 bg-primary/10 blur-2xl'
          }`}
        />
      </div>

      {/* Flash effect */}
      {showFlash && (
        <div 
          className="absolute inset-0 bg-white z-20 pointer-events-none"
          style={{
            animation: 'flash 0.3s ease-out forwards',
          }}
        />
      )}

      {/* Particles burst */}
      {showParticles && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 bg-primary rounded-full"
              style={{
                animation: `particleBurst 0.8s ease-out forwards`,
                animationDelay: `${i * 30}ms`,
                '--angle': `${(360 / 16) * i}deg`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* Main logo */}
      <div className="relative z-10 flex flex-col items-center" dir="rtl">
        {/* Letters container */}
        <div className="flex text-7xl md:text-9xl font-black relative">
          {LETTERS.map((letter, index) => (
            <span
              key={index}
              className="inline-block text-transparent bg-clip-text bg-gradient-to-b from-primary via-red-500 to-red-700"
              style={{
                ...getLetterTransform(index),
                transition: phase === 1 
                  ? `all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 100}ms`
                  : phase === 2
                  ? 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                  : 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                textShadow: phase >= 4 
                  ? '0 0 40px hsl(var(--primary) / 0.6), 0 0 80px hsl(var(--primary) / 0.3)' 
                  : 'none',
                filter: phase === 4 ? 'brightness(1.3)' : 'none',
              }}
            >
              {letter}
            </span>
          ))}
        </div>

        {/* Sparkle lines on impact */}
        {phase >= 4 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-16 bg-gradient-to-t from-transparent via-primary to-transparent origin-center"
                style={{
                  transform: `rotate(${i * 45}deg)`,
                  animation: 'sparkleExpand 0.5s ease-out forwards',
                  animationDelay: `${i * 40}ms`,
                }}
              />
            ))}
          </div>
        )}

        {/* Subtitle */}
        <p 
          className={`mt-8 text-xl md:text-2xl font-medium text-muted-foreground transition-all duration-700 ${
            phase >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          نظام إدارة المطعم
        </p>
      </div>

      {/* Inline styles for animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        
        @keyframes flash {
          0% { opacity: 0.8; }
          100% { opacity: 0; }
        }
        
        @keyframes particleBurst {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(
              calc(cos(var(--angle)) * 200px),
              calc(sin(var(--angle)) * 200px)
            ) scale(0);
            opacity: 0;
          }
        }
        
        @keyframes sparkleExpand {
          0% {
            transform: rotate(var(--rotation, 0deg)) scaleY(0);
            opacity: 1;
          }
          50% {
            transform: rotate(var(--rotation, 0deg)) scaleY(1.5);
            opacity: 1;
          }
          100% {
            transform: rotate(var(--rotation, 0deg)) scaleY(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
