import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) => {
  const variants = {
    primary: "bg-gradient-to-b from-amber-400 to-amber-600 text-slate-900 border border-amber-600 hover:brightness-110 active:scale-95",
    secondary: "bg-slate-700 text-white border border-slate-600 hover:bg-slate-600",
    outline: "bg-transparent text-amber-500 border border-amber-500 hover:bg-amber-500/10",
    ghost: "bg-transparent text-slate-300 hover:text-white hover:bg-white/5",
    danger: "bg-red-600 text-white hover:bg-red-500"
  };

  const sizes = {
    sm: "px-3 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base font-bold",
  };

  return (
    <button
      className={cn(
        "rounded-full font-medium transition-all duration-150 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
