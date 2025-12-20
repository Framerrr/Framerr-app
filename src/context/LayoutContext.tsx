import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LAYOUT } from '../constants/layout';
import type { LayoutMode, LayoutContextValue } from '../types/context/layout';

/**
 * Layout Context - Single source of truth for responsive layout mode
 * 
 * This context determines whether the app is in 'mobile' or 'desktop' mode
 * based on viewport width. All components that need to respond to this
 * (Sidebar, Dashboard grid, padding, etc.) should read from this context
 * instead of doing their own viewport checks.
 * 
 * This prevents the "breakpoint thrashing" issue where different systems
 * (Tailwind viewport, react-grid-layout container) disagree about layout mode.
 */

const defaultValue: LayoutContextValue = {
    mode: 'desktop',
    isMobile: false,
    isDesktop: true,
};

const LayoutContext = createContext<LayoutContextValue>(defaultValue);

/**
 * Get initial mode - SSR-safe
 */
const getInitialMode = (): LayoutMode => {
    if (typeof window === 'undefined') return 'desktop';
    return window.innerWidth < LAYOUT.MOBILE_THRESHOLD ? 'mobile' : 'desktop';
};

interface LayoutProviderProps {
    children: ReactNode;
}

/**
 * Layout Provider - Wrap your app with this to provide layout context
 */
export function LayoutProvider({ children }: LayoutProviderProps): React.JSX.Element {
    const [mode, setMode] = useState<LayoutMode>(getInitialMode);

    useEffect(() => {
        // Immediately set the correct mode on mount (handles SSR mismatch)
        const correctMode: LayoutMode = window.innerWidth < LAYOUT.MOBILE_THRESHOLD ? 'mobile' : 'desktop';
        if (correctMode !== mode) {
            setMode(correctMode);
        }

        let timeoutId: ReturnType<typeof setTimeout>;

        const handleResize = (): void => {
            // Debounce to prevent rapid re-renders during window dragging
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                const newMode: LayoutMode = window.innerWidth < LAYOUT.MOBILE_THRESHOLD ? 'mobile' : 'desktop';
                setMode(newMode);
            }, 100);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    const value: LayoutContextValue = {
        mode,
        isMobile: mode === 'mobile',
        isDesktop: mode === 'desktop',
    };

    return (
        <LayoutContext.Provider value={value}>
            {children}
        </LayoutContext.Provider>
    );
}

/**
 * Hook to access layout context
 */
export function useLayout(): LayoutContextValue {
    const context = useContext(LayoutContext);
    if (context === undefined) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
}

export default LayoutContext;
