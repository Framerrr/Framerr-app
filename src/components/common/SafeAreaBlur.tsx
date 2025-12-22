import React, { useState, useEffect } from 'react';
import { useLayout } from '../../context/LayoutContext';

/**
 * SafeAreaBlur - Overlay for the top safe area (notch/camera region)
 * 
 * Shows a glassmorphism blur effect only when content scrolls behind it.
 * Uses window scroll + document capture to catch all scroll events.
 */
const SafeAreaBlur: React.FC = () => {
    const { isMobile } = useLayout();
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        if (!isMobile) return;

        // Handle window scroll
        const handleWindowScroll = () => {
            const scrolled = window.scrollY > 10;
            console.log('[SafeAreaBlur] window scroll:', window.scrollY);
            setIsScrolled(scrolled);
        };

        // Handle any container scroll (capture phase)
        const handleContainerScroll = (e: Event) => {
            const target = e.target as HTMLElement;
            if (target && target.scrollTop !== undefined) {
                const scrolled = target.scrollTop > 10;
                console.log('[SafeAreaBlur] container scroll:', target.id || target.className, 'scrollTop:', target.scrollTop);
                setIsScrolled(scrolled);
            }
        };

        // Listen to window scroll
        window.addEventListener('scroll', handleWindowScroll, { passive: true });

        // Also listen to document scroll with capture to catch all scroll events
        document.addEventListener('scroll', handleContainerScroll, { capture: true, passive: true });

        // Initial check
        handleWindowScroll();

        return () => {
            window.removeEventListener('scroll', handleWindowScroll);
            document.removeEventListener('scroll', handleContainerScroll, { capture: true });
        };
    }, [isMobile]);

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
