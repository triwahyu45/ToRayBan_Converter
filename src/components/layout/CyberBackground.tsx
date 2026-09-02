'use client';

import React, { memo } from 'react';

const CyberBackground: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[#050608]"
      aria-hidden="true"
    >
      {/* Ambient Neon Glow Orbs */}
      <div className="absolute -top-40 -left-40 w-[550px] h-[550px] bg-cyan-500/10 rounded-full blur-[140px]" />
      <div className="absolute -bottom-40 -right-40 w-[650px] h-[650px] bg-violet-600/10 rounded-full blur-[160px]" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-emerald-500/[0.04] rounded-full blur-[120px]" />

      {/* Cyberpunk Grid Pattern with Radial Vignette */}
      <svg
        className="absolute inset-0 w-full h-full opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="cyber-grid"
            width="36"
            height="36"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1" fill="#00F0FF" fillOpacity="0.35" />
            <path
              d="M 36 0 L 0 0 0 36"
              fill="none"
              stroke="rgba(0, 240, 255, 0.04)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cyber-grid)" />
      </svg>

      {/* Subtle Horizontal Scanlines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.3)_51%)] bg-[length:100%_4px] opacity-15" />
    </div>
  );
};

export default memo(CyberBackground);
