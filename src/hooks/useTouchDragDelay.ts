import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * useTouchDragDelay - iOS-style hold-to-drag gesture detection
 * 
 * Tracks touch events to determine if user is scrolling vs. trying to drag.
 * After HOLD_THRESHOLD_MS without significant movement, enables dragging.
 * 
 * Two-phase approach:
 * 1. User holds widget → widget "unlocks" with visual feedback
 * 2. User releases, then touches again → RGL captures full drag
 * 3. After AUTO_RESET_MS of inactivity, widget auto-locks
 * 
 * @returns Touch gesture state and handlers
 */

// Configurable thresholds - can be adjusted based on user feedback
const HOLD_THRESHOLD_MS = 150;  // Time to hold before drag is enabled (reduced from 250)
const MOVE_THRESHOLD_PX = 10;   // Movement that cancels the hold (user is scrolling)
const AUTO_RESET_MS = 500;      // Auto-lock shortly after finger lifted (reduced from 3000)

interface TouchState {
    startX: number;
    startY: number;
    widgetId: string;
    timerId: ReturnType<typeof setTimeout> | null;
}

interface UseTouchDragDelayReturn {
    /** Widget ID that has passed the hold threshold and is ready to drag */
    dragReadyWidgetId: string | null;
    /** Handler for touchstart on widget - call with widget ID */
    onWidgetTouchStart: (e: React.TouchEvent, widgetId: string) => void;
    /** Handler for touchmove - cancels hold if moved too much */
    onWidgetTouchMove: (e: React.TouchEvent) => void;
    /** Handler for touchend - cleanup */
    onWidgetTouchEnd: () => void;
    /** Manual reset - call after drag completes */
    resetDragReady: () => void;
}

export const useTouchDragDelay = (): UseTouchDragDelayReturn => {
    // Widget that has passed hold threshold and is ready to be dragged
    const [dragReadyWidgetId, setDragReadyWidgetId] = useState<string | null>(null);

    // Track touch state for threshold detection
    const touchStateRef = useRef<TouchState | null>(null);

    // Auto-reset timer ref
    const autoResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-reset widget after timeout if not dragged
    useEffect(() => {
        if (dragReadyWidgetId) {
            // Clear any existing auto-reset timer
            if (autoResetTimerRef.current) {
                clearTimeout(autoResetTimerRef.current);
            }

            // Start new auto-reset timer
            autoResetTimerRef.current = setTimeout(() => {
                setDragReadyWidgetId(null);
                autoResetTimerRef.current = null;
            }, AUTO_RESET_MS);

            // Cleanup on unmount or when dragReadyWidgetId changes
            return () => {
                if (autoResetTimerRef.current) {
                    clearTimeout(autoResetTimerRef.current);
                }
            };
        }
    }, [dragReadyWidgetId]);

    /**
     * Handle touch start - begin tracking for hold gesture
     * Starts a timer that will enable dragging if hold threshold is reached
     */
    const onWidgetTouchStart = useCallback((e: React.TouchEvent, widgetId: string) => {
        // Only track single-finger touches
        if (e.touches.length !== 1) return;

        // If this widget is already drag-ready, let the touch through to RGL
        if (dragReadyWidgetId === widgetId) return;

        const touch = e.touches[0];

        // Clear any existing timer
        if (touchStateRef.current?.timerId) {
            clearTimeout(touchStateRef.current.timerId);
        }

        // Start hold timer - if it fires, user wants to drag
        const timerId = setTimeout(() => {
            setDragReadyWidgetId(widgetId);
            // Timer fired, clear the ref but keep widgetId in state
            if (touchStateRef.current) {
                touchStateRef.current.timerId = null;
            }
        }, HOLD_THRESHOLD_MS);

        // Store touch start state
        touchStateRef.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            widgetId,
            timerId
        };
    }, [dragReadyWidgetId]);

    /**
     * Handle touch move - cancel hold if user moved too much (they're scrolling)
     */
    const onWidgetTouchMove = useCallback((e: React.TouchEvent) => {
        if (!touchStateRef.current) return;

        // If already drag-ready, don't cancel (let react-grid-layout handle the drag)
        if (dragReadyWidgetId) return;

        const touch = e.touches[0];
        const { startX, startY, timerId } = touchStateRef.current;

        // Calculate how far the finger has moved
        const deltaX = Math.abs(touch.clientX - startX);
        const deltaY = Math.abs(touch.clientY - startY);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // If moved beyond threshold, cancel the hold timer (user is scrolling)
        if (distance > MOVE_THRESHOLD_PX && timerId) {
            clearTimeout(timerId);
            touchStateRef.current.timerId = null;
        }
    }, [dragReadyWidgetId]);

    /**
     * Handle touch end - cleanup state
     */
    const onWidgetTouchEnd = useCallback(() => {
        // Clear timer if still running
        if (touchStateRef.current?.timerId) {
            clearTimeout(touchStateRef.current.timerId);
        }

        // Reset touch tracking (but keep dragReadyWidgetId until explicit reset)
        touchStateRef.current = null;
    }, []);

    /**
     * Reset drag ready state - call after drag completes or is cancelled
     */
    const resetDragReady = useCallback(() => {
        setDragReadyWidgetId(null);
        if (touchStateRef.current?.timerId) {
            clearTimeout(touchStateRef.current.timerId);
        }
        touchStateRef.current = null;
    }, []);

    return {
        dragReadyWidgetId,
        onWidgetTouchStart,
        onWidgetTouchMove,
        onWidgetTouchEnd,
        resetDragReady
    };
};

export default useTouchDragDelay;
