'use client';

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    loading?: boolean;
}

export function Button({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    className = '',
    children,
    disabled,
    ...props
}: ButtonProps) {
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:hover:transform-none active:scale-95';

    const variants: Record<ButtonVariant, string> = {
        primary: 'bg-gradient-to-r from-#27e87c to-#1abf62 text-[#06100d] hover:from-#4ade80 hover:to-#27e87c hover:shadow-[0_0_30px_rgba(39,232,124,0.4)] focus:ring-#27e87c/50',
        secondary: 'bg-[#132a22] text-white border border-[#27e87c]/30 hover:bg-[#27e87c]/10 hover:text-#27e87c hover:shadow-[0_0_20px_rgba(39,232,124,0.2)] focus:ring-#27e87c/50',
        danger: 'bg-[#ff4d4d]/10 text-#ff4d4d border border-[#ff4d4d]/30 hover:bg-[#ff4d4d]/20 hover:text-#ff6b6b hover:shadow-[0_0_20px_rgba(255,77,77,0.2)] focus:ring-#ff4d4d/50',
        ghost: 'bg-transparent text-white hover:bg-[#27e87c]/10 hover:shadow-none focus:ring-#27e87c/50',
        outline: 'bg-transparent text-white border border-white/20 hover:bg-white/10 hover:border-white/30 focus:ring-white/50',
    };

    const sizes: Record<'sm' | 'md' | 'lg', string> = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {children}
        </button>
    );
}
