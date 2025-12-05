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
    const editModeRef = useRef(editMode); // Track current edit mode for event handlers
    const onLayoutChangeRef = useRef(onLayoutChange); // Track current callback for event handlers

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

                // Start disabled, will enable in editMode effect
                // Don't set staticGrid here - use enable()/disable() instead

                // Resize handles
                resizable: {
                    handles: 'e, se, s, sw, w'
                },

                // Prevent collisions
                collision: true
            }, gridRef.current);

            // Listen to drag stop (user finished dragging)
            gridInstanceRef.current.on('dragstop', (event, el) => {
                console.log('🔍 DRAGSTOP fired', { editModeRef: editModeRef.current, hasCallback: !!onLayoutChangeRef.current });
                // Only fire if in edit mode (check ref for current value)
                if (!editModeRef.current || !onLayoutChangeRef.current) return;

                const items = gridInstanceRef.current.engine.nodes;
                if (!items || items.length === 0) return;

                logger.debug('Gridstack drag stopped', {
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

                onLayoutChangeRef.current(updatedLayout); // Call current callback via ref
            });

            // Listen to resize stop (user finished resizing)
            gridInstanceRef.current.on('resizestop', (event, el) => {
                console.log('🔍 RESIZESTOP fired', { editModeRef: editModeRef.current, hasCallback: !!onLayoutChangeRef.current });
                // Only fire if in edit mode (check ref for current value)
                if (!editModeRef.current || !onLayoutChangeRef.current) return;

                const items = gridInstanceRef.current.engine.nodes;
                if (!items || items.length === 0) return;

                logger.debug('Gridstack resize stopped', {
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

                onLayoutChangeRef.current(updatedLayout); // Call current callback via ref
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


    // Update callback ref whenever it changes
    useEffect(() => {
        onLayoutChangeRef.current = onLayoutChange;
    }, [onLayoutChange]);

    // Enable/disable editing based on editMode
    useEffect(() => {
        if (!gridInstanceRef.current) return;

        // Update ref so event handlers can check current edit mode
        editModeRef.current = editMode;
        console.log('🔍 Edit mode changed', { editMode, editModeRef: editModeRef.current });

        if (editMode) {
            gridInstanceRef.current.enableMove(true);
            gridInstanceRef.current.enableResize(true);
            logger.debug('Gridstack editing enabled');

            // Add edit-mode class to all content divs
            const contentDivs = gridRef.current?.querySelectorAll('.grid-stack-item-content');
            contentDivs?.forEach(div => div.classList.add('edit-mode'));
        } else {
            gridInstanceRef.current.enableMove(false);
            gridInstanceRef.current.enableResize(false);
            logger.debug('Gridstack editing disabled');

            // Remove edit-mode class from all content divs
            const contentDivs = gridRef.current?.querySelectorAll('.grid-stack-item-content');
            contentDivs?.forEach(div => div.classList.remove('edit-mode'));
        }
    }, [editMode]);

    // Update widgets when they change (but avoid full recreation if possible)
    useEffect(() => {
        if (!gridInstanceRef.current || !widgets) return;

        const grid = gridInstanceRef.current;
        const currentItems = grid.engine.nodes.map(n => n.id);
        const newItems = widgets.map(w => w.id);

        // Check if widget list actually changed
        const widgetsAdded = newItems.filter(id => !currentItems.includes(id));
        const widgetsRemoved = currentItems.filter(id => !newItems.includes(id));
        const widgetsChanged = widgetsAdded.length > 0 || widgetsRemoved.length > 0;

        if (!widgetsChanged && currentItems.length > 0) {
            // Just update positions, don't recreate
            logger.debug('Updating positions only', { count: widgets.length });

            widgets.forEach(widget => {
                const layout = widget.layouts?.[currentBreakpoint];
                if (layout) {
                    grid.update(widget.id, { x: layout.x, y: layout.y, w: layout.w, h: layout.h });
                }
            });
            return;
        }

        logger.debug('Recreating grid widgets', {
            count: widgets.length,
            breakpoint: currentBreakpoint,
            added: widgetsAdded.length,
            removed: widgetsRemoved.length
        });

        // Clear all existing React roots before removing widgets
        rootsRef.current.forEach((root, widgetId) => {
            try {
                root.unmount();
            } catch (e) {
                logger.warn('Failed to unmount root', { widgetId });
            }
        });
        rootsRef.current.clear();

        // Remove all existing widgets from grid
        grid.removeAll(false);

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
                // Add widget to Gridstack - it returns the grid-stack-item element
                const gridItemEl = gridInstanceRef.current.addWidget({
                    id: widget.id,
                    x: layout.x,
                    y: layout.y,
                    w: layout.w,
                    h: layout.h
                });

                // Mark the grid item for easy lookup
                if (gridItemEl) {
                    gridItemEl.setAttribute('data-widget-id', widget.id);
                    logger.debug('Added grid item', { widgetId: widget.id });
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
                    // Find the grid-stack-item wrapper
                    const gridItemEl = gridRef.current?.querySelector(`.grid-stack-item[data-widget-id="${widget.id}"]`);

                    if (gridItemEl) {
                        // Find the content div inside
                        const contentDiv = gridItemEl.querySelector('.grid-stack-item-content');

                        if (contentDiv) {
                            // Get or create root for this content div
                            let root = rootsRef.current.get(widget.id);

                            if (!root) {
                                root = createRoot(contentDiv);
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
                            logger.warn('Content div not found in grid item', { widgetId: widget.id });
                        }
                    } else {
                        logger.warn('Grid item not found for widget', { widgetId: widget.id });
                    }
                });
            }).catch(error => {
                logger.error('Failed to import react-dom/client', { error: error.message });
            });
        }, 100); // Small delay to ensure Gridstack DOM is ready

        // Cleanup timer on unmount
        return () => {
            clearTimeout(timer);
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
