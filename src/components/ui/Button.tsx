'use client';

import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'violet'
    | 'emerald'
    | 'danger'
    | 'ghost'
    | 'glass';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    // Base styles: positioning, transition, focus ring
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#050608] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none active:scale-[0.98]';

    // Size variants
    const sizeStyles = {
      xs: 'text-xs px-2.5 py-1 gap-1.5',
      sm: 'text-xs sm:text-sm px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-6 py-2.5 gap-2.5',
      xl: 'text-lg px-8 py-3.5 gap-3 font-semibold',
    };

    // Color/Visual variants
    const variantStyles = {
      primary:
        'bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-black font-semibold shadow-glow-cyan hover:shadow-glow-cyan-lg border border-cyan-300/60 focus:ring-cyan-400',
      secondary:
        'bg-white/5 hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/70 shadow-sm focus:ring-cyan-400',
      violet:
        'bg-gradient-to-r from-violet-600 to-purple-500 hover:from-violet-500 hover:to-purple-400 text-white shadow-glow-violet hover:shadow-glow-violet-lg border border-violet-400/50 focus:ring-violet-400',
      emerald:
        'bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-black font-semibold shadow-glow-emerald border border-emerald-300/60 focus:ring-emerald-400',
      danger:
        'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 border border-rose-500/40 hover:border-rose-500/80 shadow-glow-rose/20 focus:ring-rose-500',
      ghost:
        'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent focus:ring-slate-400',
      glass:
        'backdrop-blur-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/10 hover:border-white/20 shadow-glass-card focus:ring-cyan-400',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current mr-1.5" />
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
