'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

export function Input({ label, error, icon, className = '', ...props }: InputProps) {
    return (
        <div className="mb-4">
            {label && (
                <label className="block text-sm font-medium text-white/70 mb-1.5">{label}</label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                        {icon}
                    </div>
                )}
                <input
                    className={`w-full bg-[#1a2c20]/50 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-#2bff88 focus:border-transparent transition-all ${icon ? 'pl-10' : ''} ${className}`}
                    {...props}
                />
            </div>
            {error && <p className="mt-1 text-sm text-#ff4444">{error}</p>}
        </div>
    );
}
