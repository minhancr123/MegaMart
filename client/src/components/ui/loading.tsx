'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingWrapperProps {
    loading: boolean;
    children: ReactNode;
    skeleton?: ReactNode;
    minLoadTime?: number;
    showSpinner?: boolean;
}

// Wrapper that shows loading state with minimum display time
export function LoadingWrapper({
    loading,
    children,
    skeleton,
    minLoadTime = 300,
    showSpinner = false,
}: LoadingWrapperProps) {
    const [showLoading, setShowLoading] = useState(loading);

    useEffect(() => {
        if (loading) {
            setShowLoading(true);
        } else {
            // Ensure minimum display time
            const timer = setTimeout(() => {
                setShowLoading(false);
            }, minLoadTime);
            return () => clearTimeout(timer);
        }
    }, [loading, minLoadTime]);

    if (showLoading) {
        if (skeleton) {
            return <>{skeleton}</>;
        }

        if (showSpinner) {
            return (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            );
        }

        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {children}
        </motion.div>
    );
}

// Full page loading overlay
export function PageLoadingOverlay({ show }: { show: boolean }) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center"
                >
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-indigo-100 rounded-full" />
                            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-indigo-600 rounded-full animate-spin" />
                        </div>
                        <span className="text-slate-600 text-sm font-medium">Đang tải...</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Button with loading state
interface LoadingButtonProps {
    loading?: boolean;
    children: ReactNode;
    loadingText?: string;
    className?: string;
    disabled?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

export function LoadingButton({
    loading = false,
    children,
    loadingText = 'Đang xử lý...',
    className = '',
    disabled = false,
    onClick,
    type = 'button',
    variant = 'primary',
}: LoadingButtonProps) {
    const baseClasses = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
        primary: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
        outline: 'border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300',
        ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={loading || disabled}
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        >
            {loading ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{loadingText}</span>
                </>
            ) : (
                children
            )}
        </button>
    );
}

// Skeleton wrapper for async content
interface AsyncContentProps<T> {
    data: T | null;
    loading: boolean;
    error?: string | null;
    skeleton: ReactNode;
    children: (data: T) => ReactNode;
    emptyMessage?: string;
}

export function AsyncContent<T>({
    data,
    loading,
    error,
    skeleton,
    children,
    emptyMessage = 'Không có dữ liệu',
}: AsyncContentProps<T>) {
    if (loading) {
        return <>{skeleton}</>;
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="text-red-500 mb-2">⚠️</div>
                <p className="text-red-600">{error}</p>
            </div>
        );
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500">{emptyMessage}</p>
            </div>
        );
    }

    return <>{children(data)}</>;
}

// Intersection observer hook for lazy loading
export function useLazyLoad(options?: IntersectionObserverInit) {
    const [isInView, setIsInView] = useState(false);
    const [ref, setRef] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (!ref) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '50px', threshold: 0.1, ...options }
        );

        observer.observe(ref);
        return () => observer.disconnect();
    }, [ref, options]);

    return { ref: setRef, isInView };
}

// Debounce hook for search inputs
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}
