import { useState, useRef, useCallback, useEffect } from 'react';
import logger from '../utils/logger';

/**
 * useTouchDragDelay - iOS-style hold-to-drag gesture detection
 * 
 * ARCHITECTURE:
 * - Provides a containerRef that should be attached to the grid container
 * - Uses NATIVE event listener with capture phase on the container
 * - Extracts widget ID from event target's closest parent with data-widget-id attribute
 * - Blocks touches during hold detection, allows through after threshold
 * 
 * This approach is more stable than per-widget listeners because:
 * - Single listener, no re-registration issues
 * - Works with dynamic widget lists
 * - Ref attachment is stable (attached once to container)
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
    /** Ref to attach to the grid container for touch blocking */
    containerRef: React.RefObject<HTMLDivElement | null>;
    /** Whether touch blocking is active (for conditional attachment) */
    setTouchBlockingActive: (active: boolean) => void;
    /** Handler for touchmove (React synthetic) - for compatibility */
    onWidgetTouchMove: (e: React.TouchEvent) => void;
    /** Handler for touchend (React synthetic) - cleanup */
    onWidgetTouchEnd: () => void;
    /** Manual reset - call after drag completes or when exiting edit mode */
    resetDragReady: () => void;
}

export const useTouchDragDelay = (): UseTouchDragDelayReturn => {
    // Widget that has passed hold threshold and is ready to be dragged
    const [dragReadyWidgetId, setDragReadyWidgetId] = useState<string | null>(null);

    // Whether touch blocking is currently active (edit mode + mobile)
    const [touchBlockingActive, setTouchBlockingActive] = useState(false);

    // Container element ref
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Track touch state for threshold detection
    const touchStateRef = useRef<TouchState | null>(null);

    // Auto-reset timer ref
    const autoResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Ref to track current dragReadyWidgetId for use in native event handlers
    const dragReadyWidgetIdRef = useRef<string | null>(null);
    useEffect(() => {
        dragReadyWidgetIdRef.current = dragReadyWidgetId;
    }, [dragReadyWidgetId]);

    // Pending synthetic touch data
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

    // Flag to allow synthetic events through
    const allowNextTouchRef = useRef(false);

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

            // Set flag to allow the next touch through our blocker
            allowNextTouchRef.current = true;

            // Small delay to ensure DOM is fully updated and flag is set
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

                    // Reset the flag after a short delay
                    setTimeout(() => {
                        allowNextTouchRef.current = false;
                    }, 50);
                } catch (error) {
                    logger.warn('Synthetic touch dispatch failed', { error });
                    allowNextTouchRef.current = false;
                }
            });

            pendingSyntheticTouchRef.current = null;
        }
    }, [dragReadyWidgetId]);

    /**
     * Find the widget ID from touch coordinates.
     * With pointer-events:none on widgets, e.target won't be the widget.
     * We use the touch coordinates to find which widget is visually under the touch.
     */
    const getWidgetIdFromCoordinates = useCallback((clientX: number, clientY: number): { widgetId: string; widgetElement: HTMLElement } | null => {
        // Find all widgets with data-widget-id
        const widgetElements = document.querySelectorAll('[data-widget-id]');

        for (const element of widgetElements) {
            const rect = (element as HTMLElement).getBoundingClientRect();
            // Check if touch coordinates are within this widget's bounds
            if (clientX >= rect.left && clientX <= rect.right &&
                clientY >= rect.top && clientY <= rect.bottom) {
                const widgetId = element.getAttribute('data-widget-id');
                if (widgetId) {
                    return { widgetId, widgetElement: element as HTMLElement };
                }
            }
        }

        return null;
    }, []);

    /**
     * Native touchstart handler - attached to container with capture phase
     */
    const handleContainerTouchStart = useCallback((e: TouchEvent) => {
        // Allow synthetic events through
        if (allowNextTouchRef.current) {
            return;
        }

        // Only track single-finger touches
        if (e.touches.length !== 1) return;

        const touch = e.touches[0];

        // Find which widget (if any) was touched using coordinates
        // (e.target won't work because widgets have pointer-events:none)
        const widgetInfo = getWidgetIdFromCoordinates(touch.clientX, touch.clientY);
        if (!widgetInfo) return; // Touch wasn't on a widget

        const { widgetId, widgetElement } = widgetInfo;

        // If this widget is already drag-ready, let the touch through to RGL
        if (dragReadyWidgetIdRef.current === widgetId) {
            return;
        }

        // CRITICAL: Block this touch from reaching react-draggable
        // Note: We don't call preventDefault() here to allow scrolling
        // Scroll blocking happens in the separate touchmove listener when dragReadyWidgetId is set
        e.stopImmediatePropagation();

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
            targetElement: widgetElement,
            timerId: null
        };

        // Start hold detection timer
        const timerId = setTimeout(() => {
            if (touchStateRef.current && touchStateRef.current.widgetId === widgetId) {
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
    }, [getWidgetIdFromCoordinates]);

    /**
     * Native touchmove handler - attached to container with capture phase
     */
    const handleContainerTouchMove = useCallback((e: TouchEvent) => {
        if (!touchStateRef.current) return;

        // If already drag-ready, let RGL handle movement
        if (dragReadyWidgetIdRef.current) return;

        const touch = e.touches[0];

        // Update current position
        touchStateRef.current.currentX = touch.clientX;
        touchStateRef.current.currentY = touch.clientY;
        touchStateRef.current.screenX = touch.screenX;
        touchStateRef.current.screenY = touch.screenY;
        touchStateRef.current.pageX = touch.pageX;
        touchStateRef.current.pageY = touch.pageY;

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
    }, []);

    /**
     * Native touchend handler - CRITICAL for tap detection
     * With pointer-events:none on widgets, touchend also goes to container
     * We must cancel the hold timer here or taps will unlock widgets
     */
    const handleContainerTouchEnd = useCallback(() => {
        // Cancel the hold timer if finger lifted before threshold
        if (touchStateRef.current?.timerId) {
            clearTimeout(touchStateRef.current.timerId);
            touchStateRef.current.timerId = null;
        }
        touchStateRef.current = null;
    }, []);

    // Attach/detach native listeners when touchBlockingActive changes
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        if (touchBlockingActive) {
            container.addEventListener('touchstart', handleContainerTouchStart, { capture: true, passive: false });
            container.addEventListener('touchmove', handleContainerTouchMove, { capture: true, passive: false });
            container.addEventListener('touchend', handleContainerTouchEnd, { capture: true });
            container.addEventListener('touchcancel', handleContainerTouchEnd, { capture: true });
        }

        return () => {
            container.removeEventListener('touchstart', handleContainerTouchStart, { capture: true } as EventListenerOptions);
            container.removeEventListener('touchmove', handleContainerTouchMove, { capture: true } as EventListenerOptions);
            container.removeEventListener('touchend', handleContainerTouchEnd, { capture: true } as EventListenerOptions);
            container.removeEventListener('touchcancel', handleContainerTouchEnd, { capture: true } as EventListenerOptions);
        };
    }, [touchBlockingActive, handleContainerTouchStart, handleContainerTouchMove, handleContainerTouchEnd]);

    /**
     * Handle touch move - React synthetic event version (for compatibility)
     */
    const onWidgetTouchMove = useCallback((e: React.TouchEvent) => {
        // This is now mostly handled by native listener
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
     * Reset drag ready state
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
        allowNextTouchRef.current = false;
    }, []);

    return {
        dragReadyWidgetId,
        containerRef,
        setTouchBlockingActive,
        onWidgetTouchMove,
        onWidgetTouchEnd,
        resetDragReady
    };
};

export default useTouchDragDelay;
