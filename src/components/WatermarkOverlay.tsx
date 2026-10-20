import React, { useState, useEffect } from 'react';

interface WatermarkOverlayProps {
  watermarkText: string;
}

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({ watermarkText }) => {
  // Drift between subtle positions across the video viewport every 10 seconds
  const positions = [
    { top: '12%', left: '8%', transform: 'rotate(-4deg)' },
    { top: '18%', right: '10%', transform: 'rotate(3deg)' },
    { bottom: '22%', left: '15%', transform: 'rotate(2deg)' },
    { bottom: '15%', right: '12%', transform: 'rotate(-3deg)' },
    { top: '48%', left: '30%', transform: 'rotate(-2deg)' }
  ];

  const [posIndex, setPosIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPosIndex((prev) => (prev + 1) % positions.length);
    }, 9000);
    return () => clearInterval(timer);
  }, [positions.length]);

  const currentPos = positions[posIndex];

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none">
      <div
        className="absolute transition-all duration-1000 ease-in-out font-mono-numbers text-[11px] sm:text-xs tracking-wider text-white/25 select-none"
        style={{
          ...currentPos,
          textShadow: '0 1px 2px rgba(0,0,0,0.8)'
        }}
      >
        <span>{watermarkText}</span>
      </div>
    </div>
  );
};
