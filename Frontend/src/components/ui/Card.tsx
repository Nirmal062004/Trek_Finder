'use client';

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ padding = 'md', className = '', children, ...props }: CardProps) {
    const paddingStyles: Record<'none' | 'sm' | 'md' | 'lg', string> = {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    };

    return (
        <div
            className={`bg-[#1a2c20]/50 border border-white/10 rounded-2xl ${paddingStyles[padding]} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
