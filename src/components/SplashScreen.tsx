import { useState, useEffect } from 'react';

const LETTERS = ['ج', 'و', 'م', 'ا', 'ن', 'ج', 'ي'];

// Initial positions for each letter (coming from different directions)
const INITIAL_POSITIONS = [
  { x: -300, y: -200, rotate: -180 },  // ج - top left
  { x: 300, y: -150, rotate: 270 },    // و - top right
  { x: -250, y: 200, rotate: 90 },     // م - bottom left
  { x: 0, y: -300, rotate: 360 },      // ا - top center
  { x: 250, y: 150, rotate: -270 },    // ن - bottom right
  { x: -200, y: 100, rotate: 180 },    // ج - left
  { x: 300, y: 0, rotate: -360 },      // ي - right
];

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'flying' | 'dancing' | 'assembling' | 'impact' | 'complete'>('flying');
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; angle: number }>>([]);
  const [screenShake, setScreenShake] = useState(false);

  useEffect(() => {
    // Phase 1: Flying in (0-800ms)
    const flyTimer = setTimeout(() => setPhase('dancing'), 800);
    
    // Phase 2: Dancing (800-2000ms)
    const danceTimer = setTimeout(() => setPhase('assembling'), 2000);
    
    // Phase 3: Assembling (2000-2800ms)
    const assembleTimer = setTimeout(() => setPhase('impact'), 2800);
    
    // Phase 4: Impact effect (2800-3200ms)
    const impactTimer = setTimeout(() => {
      setScreenShake(true);
      // Generate particles
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: 0,
        y: 0,
        angle: (360 / 20) * i,
      }));
      setParticles(newParticles);
      
      setTimeout(() => setScreenShake(false), 200);
    }, 2800);
    
    // Phase 5: Complete
    const completeTimer = setTimeout(() => {
      setPhase('complete');
      setTimeout(onComplete, 800);
    }, 3500);

    return () => {
      clearTimeout(flyTimer);
      clearTimeout(danceTimer);
      clearTimeout(assembleTimer);
      clearTimeout(impactTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const getLetterStyle = (index: number) => {
    const initial = INITIAL_POSITIONS[index];
    
    switch (phase) {
      case 'flying':
        return {
          transform: `translate(${initial.x}px, ${initial.y}px) rotate(${initial.rotate}deg) scale(0.5)`,
          opacity: 1,
        };
      case 'dancing':
        const danceX = Math.sin(index * 45) * 50;
        const danceY = Math.cos(index * 45) * 30;
        return {
          transform: `translate(${danceX}px, ${danceY}px) rotate(${360 + index * 30}deg) scale(1.2)`,
          opacity: 1,
        };
      case 'assembling':
      case 'impact':
      case 'complete':
        return {
          transform: 'translate(0, 0) rotate(0deg) scale(1)',
          opacity: 1,
        };
      default:
        return {};
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 bg-gradient-to-br from-background via-background to-primary/20 flex items-center justify-center overflow-hidden ${
        screenShake ? 'animate-shake' : ''
      }`}
    >
      {/* Background glow */}
      <div 
        className={`absolute w-96 h-96 rounded-full transition-all duration-300 ${
          phase === 'impact' || phase === 'complete'
            ? 'bg-primary/30 blur-3xl scale-150'
            : 'bg-primary/5 blur-3xl scale-100'
        }`}
      />

      {/* Flash effect on impact */}
      {phase === 'impact' && (
        <div className="absolute inset-0 bg-primary/20 animate-flash pointer-events-none" />
      )}

      {/* Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 bg-primary rounded-full animate-particle"
          style={{
            '--particle-angle': `${particle.angle}deg`,
          } as React.CSSProperties}
        />
      ))}

      {/* Logo container */}
      <div className="relative flex items-center justify-center" dir="rtl">
        {/* Letters */}
        <div className="flex text-6xl md:text-8xl font-black">
          {LETTERS.map((letter, index) => (
            <span
              key={index}
              className={`inline-block text-transparent bg-clip-text bg-gradient-to-b from-primary via-red-500 to-primary transition-all ${
                phase === 'flying' ? 'duration-700' : 
                phase === 'dancing' ? 'duration-1000' : 
                'duration-500'
              } ${
                phase === 'impact' ? 'animate-letter-impact' : ''
              }`}
              style={{
                ...getLetterStyle(index),
                transitionDelay: phase === 'flying' ? `${index * 80}ms` : '0ms',
                textShadow: phase === 'impact' || phase === 'complete' 
                  ? '0 0 30px hsl(var(--primary) / 0.8), 0 0 60px hsl(var(--primary) / 0.4)'
                  : 'none',
              }}
            >
              {letter}
            </span>
          ))}
        </div>

        {/* Sparkles on impact */}
        {(phase === 'impact' || phase === 'complete') && (
          <>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-8 bg-gradient-to-t from-transparent via-primary to-transparent animate-sparkle"
                style={{
                  transform: `rotate(${i * 45}deg)`,
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Subtitle appears after impact */}
      <div 
        className={`absolute bottom-1/3 text-xl md:text-2xl font-medium text-muted-foreground transition-all duration-700 ${
          phase === 'complete' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        نظام إدارة المطعم
      </div>
    </div>
  );
}
