'use client';

import { useState, useEffect, useRef } from 'react';
import Image, { ImageProps } from 'next/image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
    fallback?: string;
    blurEffect?: boolean;
    aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
}

export function OptimizedImage({
    src,
    alt,
    className,
    fallback = '/placeholder.svg',
    blurEffect = true,
    aspectRatio = 'auto',
    ...props
}: OptimizedImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef<HTMLDivElement>(null);

    // Intersection Observer for lazy loading
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '50px', threshold: 0.1 }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const aspectClasses = {
        square: 'aspect-square',
        video: 'aspect-video',
        portrait: 'aspect-[3/4]',
        auto: '',
    };

    return (
        <div
            ref={imgRef}
            className={cn(
                'relative overflow-hidden bg-slate-100',
                aspectClasses[aspectRatio],
                className
            )}
        >
            {isInView && (
                <>
                    <Image
                        src={error ? fallback : src}
                        alt={alt}
                        className={cn(
                            'object-cover transition-all duration-500',
                            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105',
                            blurEffect && !isLoaded && 'blur-sm'
                        )}
                        onLoad={() => setIsLoaded(true)}
                        onError={() => setError(true)}
                        {...props}
                    />

                    {/* Loading placeholder */}
                    {!isLoaded && (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
                    )}
                </>
            )}

            {/* Placeholder before image loads */}
            {!isInView && (
                <div className="absolute inset-0 bg-slate-100" />
            )}
        </div>
    );
}

// Simple img tag version for external URLs
interface LazyImageProps {
    src: string;
    alt: string;
    className?: string;
    fallback?: string;
    aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
}

export function LazyImage({
    src,
    alt,
    className,
    fallback = '/placeholder.svg',
    aspectRatio = 'auto',
}: LazyImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '100px', threshold: 0.1 }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const aspectClasses = {
        square: 'aspect-square',
        video: 'aspect-video',
        portrait: 'aspect-[3/4]',
        auto: '',
    };

    return (
        <div
            ref={imgRef}
            className={cn(
                'relative overflow-hidden bg-slate-100',
                aspectClasses[aspectRatio],
                className
            )}
        >
            {isInView ? (
                <>
                    <img
                        src={error ? fallback : src}
                        alt={alt}
                        className={cn(
                            'w-full h-full object-cover transition-all duration-500',
                            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                        )}
                        onLoad={() => setIsLoaded(true)}
                        onError={() => setError(true)}
                        loading="lazy"
                    />

                    {!isLoaded && (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
                    )}
                </>
            ) : (
                <div className="absolute inset-0 bg-slate-100" />
            )}
        </div>
    );
}

// Blur hash placeholder (for when you have blur data)
interface BlurImageProps extends Omit<ImageProps, 'placeholder' | 'blurDataURL'> {
    blurHash?: string;
}

export function BlurImage({ blurHash, ...props }: BlurImageProps) {
    return (
        <Image
            placeholder={blurHash ? 'blur' : 'empty'}
            blurDataURL={blurHash}
            {...props}
        />
    );
}
