import React, { useEffect, useRef } from 'react';
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import logger from '../utils/logger';

/**
 * GridstackWrapper - React wrapper for Gridstack.js
 * 
 * Replaces react-grid-layout with fully controlled grid system.
 * Supports mobile drag/drop, custom sort algorithms, and responsive breakpoints.
 * 
 * @param {Array} widgets - Array of widget objects with layouts
 * @param {string} currentBreakpoint - Current responsive breakpoint (lg/md/sm/xs/xxs)
 * @param {boolean} editMode - Whether editing is enabled
 * @param {Function} onLayoutChange - Callback when layout changes (drag/resize)
 * @param {Function} onBreakpointChange - Callback when breakpoint changes
 * @param {Function} renderWidget - Function to render widget content
 */
const GridstackWrapper = ({
    widgets = [],
    currentBreakpoint = 'lg',
    editMode = false,
    onLayoutChange,
    onBreakpointChange,
    renderWidget
}) => {
    const gridRef = useRef(null);
    const gridInstanceRef = useRef(null);
    const rootsRef = useRef(new Map());

    // Initialize grid on mount
    useEffect(() => {
        if (!gridRef.current) return;

        logger.info('Initializing Gridstack', { breakpoint: currentBreakpoint });

        try {
            gridInstanceRef.current = GridStack.init({
                // Grid configuration
                column: 12,
                cellHeight: 100,
                margin: 16,
                animate: true,
                float: false, // Vertical compaction (like compactType: 'vertical')
                disableOneColumnMode: false, // Enable mobile stacking

                // Responsive breakpoints
                columnOpts: {
                    breakpoints: [
                        { w: 1200, c: 12 }, // lg
                        { w: 1024, c: 12 }, // md
                        { w: 768, c: 6 },   // sm
                        { w: 600, c: 6 },   // xs
                        { w: 0, c: 6 }      // xxs
                    ]
                },

                // Allow dragging/resizing (will be controlled by editMode)
                staticGrid: !editMode,

                // Prevent collisions (widgets can't overlap)
                collision: true
            }, gridRef.current);

            // Listen to layout changes (drag/resize)
            gridInstanceRef.current.on('change', (event, items) => {
                if (!items || items.length === 0) return;

                logger.debug('Gridstack layout changed', {
                    itemCount: items.length,
                    breakpoint: currentBreakpoint
                });

                // Convert Gridstack format to our format
                const updatedLayout = items.map(item => ({
                    i: item.id,
                    x: item.x,
                    y: item.y,
                    w: item.w,
                    h: item.h
                }));

                if (onLayoutChange) {
                    onLayoutChange(updatedLayout, currentBreakpoint);
                }
            });

            // Listen to breakpoint changes
            gridInstanceRef.current.on('resizestop', () => {
                const newColumn = gridInstanceRef.current.getColumn();
                let newBreakpoint = currentBreakpoint;

                // Determine breakpoint based on column count
                if (newColumn === 12) {
                    const width = window.innerWidth;
                    newBreakpoint = width >= 1200 ? 'lg' : 'md';
                } else if (newColumn === 6) {
                    const width = window.innerWidth;
                    if (width >= 768) newBreakpoint = 'sm';
                    else if (width >= 600) newBreakpoint = 'xs';
                    else newBreakpoint = 'xxs';
                }

                if (newBreakpoint !== currentBreakpoint && onBreakpointChange) {
                    logger.info('Breakpoint changed', {
                        from: currentBreakpoint,
                        to: newBreakpoint
                    });
                    onBreakpointChange(newBreakpoint);
                }
            });

            logger.info('Gridstack initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize Gridstack', { error: error.message });
        }

        // Cleanup on unmount
        return () => {
            // Cleanup all React roots
            rootsRef.current.forEach(root => root.unmount());
            rootsRef.current.clear();

            if (gridInstanceRef.current) {
                logger.debug('Destroying Gridstack instance');
                gridInstanceRef.current.destroy(false);
                gridInstanceRef.current = null;
            }
        };
    }, []); // Only run on mount

    // Enable/disable editing based on editMode
    useEffect(() => {
        if (!gridInstanceRef.current) return;

        if (editMode) {
            gridInstanceRef.current.enable();
            logger.debug('Gridstack editing enabled');
        } else {
            gridInstanceRef.current.disable();
            logger.debug('Gridstack editing disabled');
        }
    }, [editMode]);

    // Update widgets when they change
    useEffect(() => {
        if (!gridInstanceRef.current || !widgets) return;

        logger.debug('Updating Gridstack widgets', {
            count: widgets.length,
            breakpoint: currentBreakpoint
        });

        // Remove all existing widgets
        gridInstanceRef.current.removeAll(false);

        // Add widgets with layout for current breakpoint
        widgets.forEach(widget => {
            const layout = widget.layouts?.[currentBreakpoint];

            if (!layout) {
                logger.warn('Widget missing layout for breakpoint', {
                    widgetId: widget.id,
                    breakpoint: currentBreakpoint
                });
                return;
            }

            try {
                // Add widget to Gridstack - let it create the structure
                const gridItem = gridInstanceRef.current.addWidget({
                    id: widget.id,
                    x: layout.x,
                    y: layout.y,
                    w: layout.w,
                    h: layout.h
                    // Don't pass content - Gridstack will create grid-stack-item-content div
                });

                // Find the content container Gridstack created
                if (gridItem) {
                    const contentDiv = gridItem.querySelector('.grid-stack-item-content');
                    if (contentDiv) {
                        contentDiv.setAttribute('data-widget-id', widget.id);
                    }
                }
            } catch (error) {
                logger.error('Failed to add widget to grid', {
                    widgetId: widget.id,
                    error: error.message
                });
            }
        });

    }, [widgets, currentBreakpoint]);


    // Render React widget content into grid items using createRoot
    useEffect(() => {
        if (!gridInstanceRef.current || !widgets || !renderWidget) return;

        // Small delay to ensure Gridstack has created the DOM elements
        const timer = setTimeout(() => {
            // Use dynamic import for React DOM
            import('react-dom/client').then(({ createRoot }) => {
                widgets.forEach(widget => {
                    const gridItem = gridRef.current?.querySelector(`[data-widget-id="${widget.id}"]`);

                    if (gridItem) {
                        // Get or create root for this grid item
                        let root = rootsRef.current.get(widget.id);

                        if (!root) {
                            root = createRoot(gridItem);
                            rootsRef.current.set(widget.id, root);
                        }

                        // Render the React widget component
                        try {
                            const widgetElement = renderWidget(widget);
                            root.render(widgetElement);
                            logger.debug('Widget rendered', { widgetId: widget.id });
                        } catch (error) {
                            logger.error('Failed to render widget', {
                                widgetId: widget.id,
                                error: error.message
                            });
                        }
                    } else {
                        logger.warn('Grid item not found for widget', { widgetId: widget.id });
                    }
                });
            }).catch(error => {
                logger.error('Failed to import react-dom/client', { error: error.message });
            });
        }, 100); // Small delay to ensure Gridstack DOM is ready

        // Cleanup: unmount roots for widgets that no longer exist
        return () => {
            clearTimeout(timer);
            const currentWidgetIds = new Set(widgets.map(w => w.id));
            rootsRef.current.forEach((root, widgetId) => {
                if (!currentWidgetIds.has(widgetId)) {
                    root.unmount();
                    rootsRef.current.delete(widgetId);
                }
            });
        };
    }, [widgets, currentBreakpoint, renderWidget]);

    return (
        <div
            ref={gridRef}
            className="grid-stack"
            style={{ minHeight: '400px' }}
        />
    );
};

export default GridstackWrapper;
