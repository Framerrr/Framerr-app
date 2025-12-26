import { useState, useRef, useCallback, useEffect } from 'react';
import logger from '../utils/logger';

/**
 * useTouchDragDelay - iOS-style hold-to-drag gesture detection
 * 
 * NEW APPROACH: Synthetic touchstart dispatch
 * When hold threshold is reached, we dispatch a synthetic touchstart event
 * to the widget element so RGL can capture it and begin tracking the drag.
 * 
 * This allows seamless one-motion hold-to-drag:
 * 1. User touches and holds widget
 * 2. After HOLD_THRESHOLD_MS, synthetic touchstart fires → RGL ready to drag
 * 3. User continues moving → RGL tracks the drag properly
 * 
 * @returns Touch gesture state and handlers
 */

// Configurable thresholds
const HOLD_THRESHOLD_MS = 170;  // Time to hold before drag is enabled
const MOVE_THRESHOLD_PX = 5;    // Movement that cancels the hold (smaller = more forgiving)
const AUTO_RESET_MS = 250;      // Auto-lock after finger lifted

interface TouchState {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    screenX: number;
    screenY: number;
    pageX: number;
    pageY: number;
    touchIdentifier: number;
    widgetId: string;
    targetElement: HTMLElement;
    timerId: ReturnType<typeof setTimeout> | null;
}

interface UseTouchDragDelayReturn {
    /** Widget ID that has passed the hold threshold and is ready to drag */
    dragReadyWidgetId: string | null;
    /** Handler for touchstart on widget - call with widget ID */
    onWidgetTouchStart: (e: React.TouchEvent, widgetId: string) => void;
    /** Handler for touchmove - tracks position and cancels hold if moved too much */
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

    // Pending synthetic touch data - stored when hold threshold reached,
    // dispatched by useEffect after React re-renders with isDraggable=true
    const pendingSyntheticTouchRef = useRef<{
        element: HTMLElement;
        touchData: {
            identifier: number;
            clientX: number;
            clientY: number;
            screenX: number;
            screenY: number;
            pageX: number;
            pageY: number;
        };
    } | null>(null);

    // Global touchend listener for auto-reset
    useEffect(() => {
        if (!dragReadyWidgetId) return;

        const handleGlobalTouchEnd = () => {
            if (autoResetTimerRef.current) {
                clearTimeout(autoResetTimerRef.current);
            }
            autoResetTimerRef.current = setTimeout(() => {
                setDragReadyWidgetId(null);
                autoResetTimerRef.current = null;
            }, AUTO_RESET_MS);
        };

        window.addEventListener('touchend', handleGlobalTouchEnd);
        return () => window.removeEventListener('touchend', handleGlobalTouchEnd);
    }, [dragReadyWidgetId]);

    // SCROLL LOCK: Block browser scroll when widget is drag-ready
    // Uses native event listener with { passive: false } to allow preventDefault()
    // React's synthetic events are passive by default and cannot call preventDefault()
    useEffect(() => {
        if (!dragReadyWidgetId) return;

        const handleTouchMove = (e: TouchEvent) => {
            // Only prevent if event is cancelable (avoids console warnings)
            if (e.cancelable) {
                e.preventDefault();
            }
        };

        // CRITICAL: { passive: false } allows preventDefault() to work
        document.addEventListener('touchmove', handleTouchMove, { passive: false });

        return () => {
            document.removeEventListener('touchmove', handleTouchMove);
        };
    }, [dragReadyWidgetId]);

    // Dispatch synthetic touch AFTER React renders with isDraggable=true
    // This is the key to making one-motion hold-to-drag work:
    // 1. Hold threshold reached → setDragReadyWidgetId + store pending touch
    // 2. React re-renders with isDraggable=true
    // 3. This useEffect runs and dispatches synthetic touch to RGL
    // 4. RGL (now enabled) receives the touch and starts drag tracking
    useEffect(() => {
        if (dragReadyWidgetId && pendingSyntheticTouchRef.current) {
            const { element, touchData } = pendingSyntheticTouchRef.current;

            // Small delay to ensure DOM is fully updated
            requestAnimationFrame(() => {
                try {
                    const syntheticTouch = new Touch({
                        identifier: touchData.identifier,
                        target: element,
                        clientX: touchData.clientX,
                        clientY: touchData.clientY,
                        screenX: touchData.screenX,
                        screenY: touchData.screenY,
                        pageX: touchData.pageX,
                        pageY: touchData.pageY,
                        radiusX: 1,
                        radiusY: 1,
                        rotationAngle: 0,
                        force: 1,
                    });

                    const syntheticEvent = new TouchEvent('touchstart', {
                        bubbles: true,
                        cancelable: true,
                        view: window,
                        touches: [syntheticTouch],
                        targetTouches: [syntheticTouch],
                        changedTouches: [syntheticTouch],
                    });

                    element.dispatchEvent(syntheticEvent);
                } catch (error) {
                    logger.warn('Synthetic touch dispatch failed', { error });
                }
            });

            // Clear the pending touch
            pendingSyntheticTouchRef.current = null;
        }
    }, [dragReadyWidgetId]);

    /**
     * Dispatch a synthetic touchstart event to trigger RGL's drag handling
     */
    const dispatchSyntheticTouchStart = useCallback((element: HTMLElement, touchData: {
        identifier: number;
        clientX: number;
        clientY: number;
        screenX: number;
        screenY: number;
        pageX: number;
        pageY: number;
    }) => {
        try {
            // Create a new Touch object with the current position
            const syntheticTouch = new Touch({
                identifier: touchData.identifier,
                target: element,
                clientX: touchData.clientX,
                clientY: touchData.clientY,
                screenX: touchData.screenX,
                screenY: touchData.screenY,
                pageX: touchData.pageX,
                pageY: touchData.pageY,
                radiusX: 1,
                radiusY: 1,
                rotationAngle: 0,
                force: 1,
            });

            // Create the synthetic TouchEvent
            const syntheticEvent = new TouchEvent('touchstart', {
                bubbles: true,
                cancelable: true,
                view: window,
                touches: [syntheticTouch],
                targetTouches: [syntheticTouch],
                changedTouches: [syntheticTouch],
            });

            // Dispatch it on the element - RGL should pick this up
            element.dispatchEvent(syntheticEvent);
        } catch (error) {
            // Fallback for browsers that don't support Touch constructor
            logger.warn('Synthetic touch dispatch failed', { error });
        }
    }, []);

    /**
     * Handle touch start - begin tracking for hold gesture
     * IMPORTANT: stopPropagation blocks RGL from receiving this touch.
     * Only the synthetic touchstart (after hold) should reach RGL.
     */
    const onWidgetTouchStart = useCallback((e: React.TouchEvent, widgetId: string) => {
        // Only track single-finger touches
        if (e.touches.length !== 1) return;

        // If this widget is already drag-ready, let the touch through to RGL
        if (dragReadyWidgetId === widgetId) return;

        // Stop this touch from reaching RGL during hold detection
        // Note: scroll blocking is handled by native event listener (see useEffect above)
        e.stopPropagation();

        // CRITICAL: Prevent iOS from synthesizing mouse events (mousedown, click) after touch
        // Without this, iOS fires mousedown which RGL captures, enabling tap-to-drag bypass
        // Safe in edit mode since we want hold-to-drag, not scroll behavior on widgets
        e.preventDefault();

        const touch = e.touches[0];
        const targetElement = e.currentTarget as HTMLElement;

        // Clear any existing timer
        if (touchStateRef.current?.timerId) {
            clearTimeout(touchStateRef.current.timerId);
        }

        // Store touch state with all needed properties for synthetic event
        touchStateRef.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY,
            screenX: touch.screenX,
            screenY: touch.screenY,
            pageX: touch.pageX,
            pageY: touch.pageY,
            touchIdentifier: touch.identifier,
            widgetId,
            targetElement,
            timerId: null
        };

        const timerId = setTimeout(() => {
            if (touchStateRef.current && touchStateRef.current.widgetId === widgetId) {
                // Store pending touch data for useEffect to dispatch after React re-renders
                const state = touchStateRef.current;
                pendingSyntheticTouchRef.current = {
                    element: state.targetElement,
                    touchData: {
                        identifier: state.touchIdentifier,
                        clientX: state.currentX,
                        clientY: state.currentY,
                        screenX: state.screenX,
                        screenY: state.screenY,
                        pageX: state.pageX,
                        pageY: state.pageY,
                    }
                };

                // Set drag-ready state - this triggers React re-render with isDraggable=true
                // Then the useEffect will fire and dispatch the synthetic touch
                setDragReadyWidgetId(widgetId);

                state.timerId = null;
            }
        }, HOLD_THRESHOLD_MS);

        touchStateRef.current.timerId = timerId;
    }, [dragReadyWidgetId, dispatchSyntheticTouchStart]);

    /**
     * Handle touch move - update current position and cancel hold if moved too much
     * Also blocks RGL from seeing touches during hold period
     */
    const onWidgetTouchMove = useCallback((e: React.TouchEvent) => {
        if (!touchStateRef.current) return;

        const touch = e.touches[0];

        // Update current position (for synthetic event if threshold is reached)
        touchStateRef.current.currentX = touch.clientX;
        touchStateRef.current.currentY = touch.clientY;
        touchStateRef.current.screenX = touch.screenX;
        touchStateRef.current.screenY = touch.screenY;
        touchStateRef.current.pageX = touch.pageX;
        touchStateRef.current.pageY = touch.pageY;

        // If already drag-ready, let RGL handle the movement
        if (dragReadyWidgetId) return;

        // Block RGL from seeing this touch during hold period
        // Note: scroll blocking is handled by native event listener (see useEffect above)
        e.stopPropagation();

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
        if (touchStateRef.current?.timerId) {
            clearTimeout(touchStateRef.current.timerId);
        }
        touchStateRef.current = null;

        // Auto-reset is handled by global listener
    }, []);

    /**
     * Reset drag ready state - call after drag completes
     */
    const resetDragReady = useCallback(() => {
        setDragReadyWidgetId(null);
        if (autoResetTimerRef.current) {
            clearTimeout(autoResetTimerRef.current);
        }
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
