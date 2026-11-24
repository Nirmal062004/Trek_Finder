'use client';

import React, { useCallback, useState } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

const TOAST_LIMIT = 5;

const typeIcons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={20} className="text-#2bff88" />,
    error: <AlertCircle size={20} className="text-#ff4444" />,
    info: <Info size={20} className="text-#3b82f6" />,
    warning: <AlertCircle size={20} className="text-#f59e0b" />,
};

const typeColors: Record<ToastType, string> = {
    success: 'bg-[#2bff88]/10 border-[#2bff88]/30 text-#2bff88',
    error: 'bg-[#ff4444]/10 border-[#ff4444]/30 text-#ff4444',
    info: 'bg-[#3b82f6]/10 border-[#3b82f6]/30 text-#3b82f6',
    warning: 'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-#f59e0b',
};

export function ToastContainer() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
        const id = Math.random().toString(36).substring(7);
        setToasts((prev) => {
            const next = [...prev, { id, type, message, duration }];
            return next.slice(-TOAST_LIMIT);
        });
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <>
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-in slide-in-from-right duration-200 ${typeColors[t.type]}`}
                >
                    <div className="shrink-0">{typeIcons[t.type]}</div>
                    <div className="text-sm font-medium">{t.message}</div>
                    <button
                        onClick={() => removeToast(t.id)}
                        className="ml-2 p-1 hover:bg-white/10 rounded transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
        </>
    );
}

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const show = useCallback((type: ToastType, message: string, duration = 4000) => {
        const id = Math.random().toString(36).substring(7);
        setToasts((prev) => [...prev.slice(-TOAST_LIMIT + 1), { id, type, message, duration }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    }, []);

    return {
        success: (msg: string, duration?: number) => show('success', msg, duration),
        error: (msg: string, duration?: number) => show('error', msg, duration),
        info: (msg: string, duration?: number) => show('info', msg, duration),
        warning: (msg: string, duration?: number) => show('warning', msg, duration),
    };
}
