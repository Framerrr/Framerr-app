import React, { useState, useEffect, useRef } from 'react';
import { useLayout } from '../../context/LayoutContext';

/**
 * SafeAreaBlur - Overlay for the top safe area (notch/camera region)
 * 
 * Shows a glassmorphism blur effect only when content scrolls behind it.
 * Targets the #main-scroll container directly.
 */
const SafeAreaBlur: React.FC = () => {
    const { isMobile } = useLayout();
    const [isScrolled, setIsScrolled] = useState(false);
    const scrollHandlerRef = useRef<(() => void) | null>(null);
    const containerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isMobile) return;

        const setupScrollListener = (container: HTMLElement) => {
            containerRef.current = container;
            console.log('[SafeAreaBlur] Attached to:', container.id, 'scrollTop:', container.scrollTop);

            const handleScroll = () => {
                const scrolled = container.scrollTop > 10;
                console.log('[SafeAreaBlur] scroll:', container.scrollTop, 'isScrolled:', scrolled);
                setIsScrolled(scrolled);
            };

            scrollHandlerRef.current = handleScroll;
            container.addEventListener('scroll', handleScroll, { passive: true });

            // Initial check
            handleScroll();
        };

        // Try to find the container immediately
        const container = document.getElementById('main-scroll');
        console.log('[SafeAreaBlur] Looking for main-scroll:', !!container);

        if (container) {
            setupScrollListener(container);
        } else {
            // Use MutationObserver to wait for the element
            const observer = new MutationObserver((mutations, obs) => {
                const foundContainer = document.getElementById('main-scroll');
                if (foundContainer) {
                    setupScrollListener(foundContainer);
                    obs.disconnect();
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            return () => observer.disconnect();
        }

        // Cleanup
        return () => {
            if (containerRef.current && scrollHandlerRef.current) {
                containerRef.current.removeEventListener('scroll', scrollHandlerRef.current);
            }
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
