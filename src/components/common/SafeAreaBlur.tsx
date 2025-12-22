import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLayout } from '../../context/LayoutContext';

/**
 * SafeAreaBlur - Overlay for the top safe area (notch/camera region)
 * 
 * Shows a glassmorphism blur effect only when content scrolls behind it.
 * Inspired by Seerr/Jellyseerr implementation.
 * Only visible on mobile PWA/Safari where safe area insets exist.
 */
const SafeAreaBlur: React.FC = () => {
    const { isMobile } = useLayout();
    const [isScrolled, setIsScrolled] = useState(false);
    const lastScrolledRef = useRef(false);

    const handleScroll = useCallback((e: Event) => {
        const target = e.target as HTMLElement;

        // Get scroll position from the target element
        const scrollTop = target?.scrollTop ?? 0;
        const shouldBeScrolled = scrollTop > 10;

        // Only update if state actually changed
        if (shouldBeScrolled !== lastScrolledRef.current) {
            lastScrolledRef.current = shouldBeScrolled;
            setIsScrolled(shouldBeScrolled);
        }
    }, []);

    useEffect(() => {
        // Only listen on mobile
        if (!isMobile) return;

        // Listen to scroll events at document level with capture phase
        // This catches all scroll events from any scrollable container
        document.addEventListener('scroll', handleScroll, { capture: true, passive: true });

        // Cleanup
        return () => {
            document.removeEventListener('scroll', handleScroll, { capture: true });
        };
    }, [isMobile, handleScroll]);

    // Only render on mobile
    if (!isMobile) return null;

    return (
        <div
            className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
            style={{
                height: 'env(safe-area-inset-top, 0px)',
                backgroundColor: isScrolled ? 'var(--glass-bg, rgba(10, 14, 26, 0.7))' : 'transparent',
                backdropFilter: isScrolled ? 'blur(var(--blur-strong, 20px))' : 'none',
                WebkitBackdropFilter: isScrolled ? 'blur(var(--blur-strong, 20px))' : 'none',
                transition: 'background-color 0.15s ease, backdrop-filter 0.15s ease',
                borderBottom: isScrolled ? '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))' : 'none',
            }}
        />
    );
};

export default SafeAreaBlur;
