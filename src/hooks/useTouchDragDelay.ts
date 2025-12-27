import { useState, useRef, useCallback, useEffect } from 'react';
import logger from '../utils/logger';

/**
 * useTouchDragDelay - iOS-style hold-to-drag gesture detection
 * 
 * ARCHITECTURE:
 * - Uses NATIVE event listeners with capture phase to intercept touches BEFORE react-draggable
 * - React-draggable adds its own native touchstart listener to DOM elements
 * - React's synthetic event stopPropagation() doesn't block native listeners
 * - We must use stopImmediatePropagation() on native events to block RGL
 * 
 * FLOW:
 * 1. User touches widget → our capture listener fires FIRST
 * 2. During hold detection phase, we block with stopImmediatePropagation()
 * 3. If user holds for HOLD_THRESHOLD_MS without moving, we set dragReadyWidgetId
 * 4. We dispatch synthetic touchstart to RGL (which now has isDraggable=true)
 * 5. RGL receives the synthetic touch and begins drag tracking
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
    /** Attach this ref to widget container to enable native touch blocking */
    registerWidgetRef: (widgetId: string, element: HTMLElement | null) => void;
    /** Handler for touchmove - tracks position and cancels hold if moved too much (React synthetic) */
    onWidgetTouchMove: (e: React.TouchEvent) => void;
    /** Handler for touchend - cleanup (React synthetic) */
    onWidgetTouchEnd: () => void;
    /** Manual reset - call after drag completes or when exiting edit mode */
    resetDragReady: () => void;
}

export const useTouchDragDelay = (): UseTouchDragDelayReturn => {
    // Widget that has passed hold threshold and is ready to be dragged
    const [dragReadyWidgetId, setDragReadyWidgetId] = useState<string | null>(null);

    // Track touch state for threshold detection
    const touchStateRef = useRef<TouchState | null>(null);

    // Auto-reset timer ref
    const autoResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Track registered widget elements and their native listeners for cleanup
    const widgetElementsRef = useRef<Map<string, {
        element: HTMLElement;
        touchStartHandler: (e: TouchEvent) => void;
        touchMoveHandler: (e: TouchEvent) => void;
    }>>(new Map());

    // Ref to track current dragReadyWidgetId for use in native event handlers
    // (native handlers can't read state directly as they're not re-created on state change)
    const dragReadyWidgetIdRef = useRef<string | null>(null);
    useEffect(() => {
        dragReadyWidgetIdRef.current = dragReadyWidgetId;
    }, [dragReadyWidgetId]);

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
    useEffect(() => {
        if (!dragReadyWidgetId) return;

        const handleTouchMove = (e: TouchEvent) => {
            if (e.cancelable) {
                e.preventDefault();
            }
        };

        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        return () => document.removeEventListener('touchmove', handleTouchMove);
    }, [dragReadyWidgetId]);

    // Dispatch synthetic touch AFTER React renders with isDraggable=true
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

                    // Mark this as our synthetic event so our capture handler lets it through
                    (syntheticEvent as any)._isSyntheticFromHoldGesture = true;

                    element.dispatchEvent(syntheticEvent);
                } catch (error) {
                    logger.warn('Synthetic touch dispatch failed', { error });
                }
            });

            pendingSyntheticTouchRef.current = null;
        }
    }, [dragReadyWidgetId]);

    /**
     * Create native touch handlers for a widget element.
     * These fire in CAPTURE phase, BEFORE react-draggable's listeners.
     */
    const createNativeTouchHandlers = useCallback((widgetId: string, element: HTMLElement) => {
        // Native touchstart handler - blocks RGL during hold detection
        const touchStartHandler = (e: TouchEvent) => {
            // Let our synthetic events through (they have a marker)
            if ((e as any)._isSyntheticFromHoldGesture) {
                return;
            }

            // Only track single-finger touches
            if (e.touches.length !== 1) return;

            // If this widget is already drag-ready, let the touch through to RGL
            if (dragReadyWidgetIdRef.current === widgetId) {
                return;
            }

            // CRITICAL: Block this touch from reaching react-draggable
            e.stopImmediatePropagation();

            // Prevent iOS from synthesizing mouse events
            e.preventDefault();

            const touch = e.touches[0];

            // Clear any existing timer
            if (touchStateRef.current?.timerId) {
                clearTimeout(touchStateRef.current.timerId);
            }

            // Store touch state
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
                targetElement: element,
                timerId: null
            };

            // Start hold detection timer
            const timerId = setTimeout(() => {
                if (touchStateRef.current && touchStateRef.current.widgetId === widgetId) {
                    // Store pending touch data for useEffect to dispatch
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

                    // Set drag-ready state - triggers React re-render
                    setDragReadyWidgetId(widgetId);
                    state.timerId = null;
                }
            }, HOLD_THRESHOLD_MS);

            touchStateRef.current.timerId = timerId;
        };

        // Native touchmove handler - tracks position and cancels hold if moved too much
        const touchMoveHandler = (e: TouchEvent) => {
            if (!touchStateRef.current) return;
            if (touchStateRef.current.widgetId !== widgetId) return;

            const touch = e.touches[0];

            // Update current position
            touchStateRef.current.currentX = touch.clientX;
            touchStateRef.current.currentY = touch.clientY;
            touchStateRef.current.screenX = touch.screenX;
            touchStateRef.current.screenY = touch.screenY;
            touchStateRef.current.pageX = touch.pageX;
            touchStateRef.current.pageY = touch.pageY;

            // If already drag-ready, let RGL handle movement
            if (dragReadyWidgetIdRef.current === widgetId) {
                return;
            }

            // Block RGL during hold detection
            e.stopImmediatePropagation();

            const { startX, startY, timerId } = touchStateRef.current;
            const deltaX = Math.abs(touch.clientX - startX);
            const deltaY = Math.abs(touch.clientY - startY);
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            // If moved beyond threshold, cancel the hold timer (user is scrolling)
            if (distance > MOVE_THRESHOLD_PX && timerId) {
                clearTimeout(timerId);
                touchStateRef.current.timerId = null;
                touchStateRef.current = null;
            }
        };

        return { touchStartHandler, touchMoveHandler };
    }, []);

    /**
     * Register a widget element for native touch blocking.
     * Call with the widget ID and the DOM element reference.
     * Call with null element to unregister.
     */
    const registerWidgetRef = useCallback((widgetId: string, element: HTMLElement | null) => {
        // Get existing registration
        const existing = widgetElementsRef.current.get(widgetId);

        // If same element, do nothing
        if (existing?.element === element) return;

        // Remove existing listeners if any
        if (existing) {
            existing.element.removeEventListener('touchstart', existing.touchStartHandler, { capture: true } as EventListenerOptions);
            existing.element.removeEventListener('touchmove', existing.touchMoveHandler, { capture: true } as EventListenerOptions);
            widgetElementsRef.current.delete(widgetId);
        }

        // Add new listeners if element provided
        if (element) {
            const { touchStartHandler, touchMoveHandler } = createNativeTouchHandlers(widgetId, element);

            // CRITICAL: Use capture phase to fire BEFORE react-draggable's listener
            // CRITICAL: Use { passive: false } to allow preventDefault()
            element.addEventListener('touchstart', touchStartHandler, { capture: true, passive: false });
            element.addEventListener('touchmove', touchMoveHandler, { capture: true, passive: false });

            widgetElementsRef.current.set(widgetId, { element, touchStartHandler, touchMoveHandler });
        }
    }, [createNativeTouchHandlers]);

    /**
     * Handle touch move - React synthetic event version (kept for compatibility)
     */
    const onWidgetTouchMove = useCallback((e: React.TouchEvent) => {
        // This is now mostly handled by native listener, but kept for compatibility
        if (!touchStateRef.current) return;
        if (dragReadyWidgetId) return;

        e.stopPropagation();
    }, [dragReadyWidgetId]);

    /**
     * Handle touch end - cleanup state
     */
    const onWidgetTouchEnd = useCallback(() => {
        if (touchStateRef.current?.timerId) {
            clearTimeout(touchStateRef.current.timerId);
        }
        touchStateRef.current = null;
    }, []);

    /**
     * Reset drag ready state - call after drag completes or when exiting edit mode
     */
    const resetDragReady = useCallback(() => {
        setDragReadyWidgetId(null);
        if (autoResetTimerRef.current) {
            clearTimeout(autoResetTimerRef.current);
            autoResetTimerRef.current = null;
        }
        if (touchStateRef.current?.timerId) {
            clearTimeout(touchStateRef.current.timerId);
        }
        touchStateRef.current = null;
        pendingSyntheticTouchRef.current = null;
    }, []);

    // Cleanup all native listeners on unmount
    useEffect(() => {
        return () => {
            widgetElementsRef.current.forEach((registration, widgetId) => {
                registration.element.removeEventListener('touchstart', registration.touchStartHandler, { capture: true } as EventListenerOptions);
                registration.element.removeEventListener('touchmove', registration.touchMoveHandler, { capture: true } as EventListenerOptions);
            });
            widgetElementsRef.current.clear();
        };
    }, []);

    return {
        dragReadyWidgetId,
        registerWidgetRef,
        onWidgetTouchMove,
        onWidgetTouchEnd,
        resetDragReady
    };
};

export default useTouchDragDelay;
