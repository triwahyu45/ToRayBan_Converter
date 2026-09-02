'use client';

import React from 'react';

export interface BadgeProps {
  variant?: 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose' | 'slate' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  dotPulse?: boolean;
  mono?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'cyan',
  size = 'md',
  dot = false,
  dotPulse = false,
  mono = false,
  className = '',
  children,
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-md border select-none';

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const variantStyles = {
    cyan: 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(0,240,255,0.15)]',
    violet: 'bg-violet-950/40 text-violet-400 border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.15)]',
    emerald: 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(0,255,157,0.15)]',
    amber: 'bg-amber-950/40 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(251,191,36,0.15)]',
    rose: 'bg-rose-950/40 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(255,0,122,0.15)]',
    slate: 'bg-slate-900/60 text-slate-300 border-slate-700/60',
    outline: 'bg-transparent text-slate-400 border-white/10',
  };

  const dotColors = {
    cyan: 'bg-cyan-400',
    violet: 'bg-violet-400',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    slate: 'bg-slate-400',
    outline: 'bg-white/40',
  };

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${
        mono ? 'font-mono' : 'font-sans'
      } ${className}`}
    >
      {dot && (
        <span className="relative flex h-2 w-2 shrink-0">
          {dotPulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColors[variant]}`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${dotColors[variant]}`}
          />
        </span>
      )}
      {children}
    </span>
  );
};

export default Badge;
