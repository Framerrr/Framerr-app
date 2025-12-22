import React, { useState, useEffect, useRef } from 'react';
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
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Only listen on mobile
        if (!isMobile) return;

        // Handle any scroll event in the document (capture phase to catch all)
        const handleScroll = (e: Event) => {
            const target = e.target as HTMLElement;

            // Check if the scroll target has scrollTop > threshold
            const scrollTop = target?.scrollTop ?? 0;
            const isNowScrolled = scrollTop > 5;

            // Only update state if changed
            if (isNowScrolled !== isScrolled) {
                setIsScrolled(isNowScrolled);
            }

            // Also check window scroll
            if (window.scrollY > 5 && !isScrolled) {
                setIsScrolled(true);
            } else if (window.scrollY <= 5 && scrollTop <= 5 && isScrolled) {
                setIsScrolled(false);
            }
        };

        // Listen to scroll events at document level with capture phase
        document.addEventListener('scroll', handleScroll, { capture: true, passive: true });

        // Cleanup
        return () => {
            document.removeEventListener('scroll', handleScroll, { capture: true });
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [isMobile, isScrolled]);

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
                transition: 'background-color 0.2s ease, backdrop-filter 0.2s ease',
                borderBottom: isScrolled ? '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))' : 'none',
            }}
        />
    );
};

export default SafeAreaBlur;
