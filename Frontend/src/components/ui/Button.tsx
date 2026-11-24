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
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    const variants: Record<ButtonVariant, string> = {
        primary: 'bg-gradient-to-r from-#2bff88 to-#1aa355 text-[#0d1810] hover:from-#4ade80 hover:to-#158042 focus:ring-#2bff88',
        secondary: 'bg-[#1a2c20] text-white border border-[#2bff88]/30 hover:bg-[#2bff88]/10 hover:text-#2bff88 focus:ring-#2bff88',
        danger: 'bg-[#ff4444]/10 text-#ff4444 border border-[#ff4444]/30 hover:bg-[#ff4444]/20 hover:text-#ff6b6b focus:ring-#ff4444',
        ghost: 'bg-transparent text-white hover:bg-[#2bff88]/10 focus:ring-#2bff88',
        outline: 'bg-transparent text-white border border-white/20 hover:bg-white/10 focus:ring-white',
    };

    const sizes: Record<'sm' | 'md' | 'lg', string> = {
        sm: 'px-3 py-1.5 text-sm',
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
