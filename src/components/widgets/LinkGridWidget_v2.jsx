import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ExternalLink, Loader, CheckCircle2, XCircle, Plus, Edit2, Trash2, GripVertical, Check, X } from 'lucide-react';
import * as Icons from 'lucide-react';
import axios from 'axios';
import logger from '../../utils/logger';
import IconPicker from '../IconPicker';
import { useNotifications } from '../../context/NotificationContext';

/**
 * LinkGrid Widget v2 - Dynamic Grid System
 * iOS Control Center-style grid layout with inline editing
 * 
 * Features:
 * - Circle links (1x1 cells) and Rectangle links (2x1 cells)
 * - Dynamic grid sizing (80-120px cells)
 * - Left-align in edit mode, center-justify in view mode
 * - Inline add/edit forms
 * - Drag-to-reorder (sequence-based)
 */

const LinkGridWidget_v2 = ({ config, editMode, widgetId, setGlobalDragEnabled }) => {
    const { links = [] } = config || {};
    const { error: showError } = useNotifications();

    // Refs for dimension measurement
    const containerRef = useRef(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    // Widget state
    const [linkStates, setLinkStates] = useState({}); // HTTP action states
    const [editModeActive, setEditModeActive] = useState(false); // Link widget edit mode
    const [showAddForm, setShowAddForm] = useState(false); // Show add link form
    const [editingLinkId, setEditingLinkId] = useState(null); // ID of link being edited
    const [draggedLinkId, setDraggedLinkId] = useState(null); // ID of link being dragged
    const [dragOverLinkId, setDragOverLinkId] = useState(null); // ID of link being dragged over
    const [previewLinks, setPreviewLinks] = useState([]); // Temporary order during drag
    const [confirmDeleteId, setConfirmDeleteId] = useState(null); // ID of link pending delete confirmation

    const [formData, setFormData] = useState({
        title: '',
        icon: 'Link',
        size: 'circle',
        type: 'link',
        url: '',
        showIcon: true,
        showText: true,
        action: {
            method: 'GET',
            url: '',
            headers: {},
            body: null
        }
    });

    // Grid constants
    const MIN_CELL_SIZE = 80;  // px - used for calculating max rows that fit
    // Responsive gap: smaller on mobile for tighter layout
    const GRID_GAP = containerSize.width < 768 ? 8 : 16; // 8px on mobile, 16px on desktop

    /**
     * Measure container size on mount and resize
     */
    useEffect(() => {
        const measureContainer = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setContainerSize({
                    width: rect.width,
                    height: rect.height
                });
            }
        };

        measureContainer();

        // Use ResizeObserver to detect container size changes (widget resize)
        const resizeObserver = new ResizeObserver(() => {
            measureContainer();
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    /**
     * Re-measure container when links change or edit mode toggles
     * This ensures grid expands/contracts dynamically
     */
    useEffect(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setContainerSize({
                width: rect.width,
                height: rect.height
            });
        }
    }, [links.length, editModeActive, showAddForm]);

    // Sync local edit mode with global edit mode
    useEffect(() => {
        if (!editMode) {
            setEditModeActive(false);
            setShowAddForm(false);
            setEditingLinkId(null);
        }
    }, [editMode]);

    // Toggle global drag state when modal is open
    useEffect(() => {
        if (setGlobalDragEnabled) {
            setGlobalDragEnabled(!(showAddForm || editingLinkId));
        }
    }, [showAddForm, editingLinkId, setGlobalDragEnabled]);

    // Auto-clear preview when links update from backend (after drop completes)
    useEffect(() => {
        if (previewLinks.length > 0 && !draggedLinkId) {
            setPreviewLinks([]);
        }
    }, [links, draggedLinkId, previewLinks.length]);

    /**
     * Pre-populate form when editing a link
     */
    useEffect(() => {
        if (editingLinkId) {
            const linkToEdit = links.find(l => l.id === editingLinkId);
            if (linkToEdit) {
                setFormData({
                    title: linkToEdit.title || '',
                    icon: linkToEdit.icon || 'Link',
                    size: linkToEdit.size || 'circle',
                    type: linkToEdit.type || 'link',
                    url: linkToEdit.url || '',
                    showIcon: linkToEdit.style?.showIcon !== false,
                    showText: linkToEdit.style?.showText !== false,
                    action: linkToEdit.action || {
                        method: 'GET',
                        url: '',
                        headers: {},
                        body: null
                    }
                });
            }
        } else if (!showAddForm) {
            // Reset form when closing
            setFormData({
                title: '',
                icon: 'Link',
                size: 'circle',
                type: 'link',
                url: '',
                showIcon: true,
                showText: true,
                action: { method: 'GET', url: '', headers: {}, body: null }
            });
        }
    }, [editingLinkId, showAddForm, links]);

    /**
     * Calculate grid dimensions and cell size
     * Strategy: Fit grid perfectly within available container space
     * - Measure actual available width/height (already accounts for padding)
     * - Calculate max rows/cols that fit
     * - Size cells to fill space without overflow
     */
    const calculateGridMetrics = () => {
        if (containerSize.width === 0 || containerSize.height === 0) {
            return { cols: 3, rows: 1, cellSize: 100, maxRows: 1 }; // Default fallback
        }

        const availableWidth = containerSize.width;
        const availableHeight = containerSize.height;

        // FIXED: Always use 6 columns on all breakpoints for consistency
        // Cells will shrink to fit on mobile instead of reducing columns
        const cols = 6;

        // Calculate rows that fit in height
        // Simple formula: how many rows can fit in available height?
        let rows = Math.floor((availableHeight + GRID_GAP) / (MIN_CELL_SIZE + GRID_GAP));
        rows = Math.max(1, rows); // Minimum 1 row

        // Calculate cell size constrained by BOTH width and height
        // We want cells to shrink to fit the available space perfectly

        // Width constraint
        const cellWidthMax = (availableWidth - (GRID_GAP * (cols - 1))) / cols;

        // Height constraint - cells must fit in vertical space
        const cellHeightMax = (availableHeight - (GRID_GAP * (rows - 1))) / rows;

        // Use the smaller of the two constraints
        // Remove MIN/MAX clamping - cells must shrink to fit available space
        let cellSize = Math.min(cellWidthMax, cellHeightMax);

        // maxRows for edit mode outlines (same as rows)
        const maxRows = rows;

        // Return grid metrics
        return { cols, rows, cellSize, maxRows };
    };

    /**
     * Calculate link positions for edit mode (left-aligned)
     */
    const calculateEditModeLayout = (gridCols, gridRows, linksToLayout = links) => {
        const positions = [];
        let row = 0;
        let col = 0;

        for (const link of linksToLayout) {
            const cellSpan = link.size === 'rectangle' ? 2 : 1;

            // Check if link fits in current row
            if (col + cellSpan > gridCols) {
                // Wrap to next row
                row++;
                col = 0;
            }

            // Check if we've run out of rows
            if (row >= gridRows) {
                break;
            }

            positions.push({
                linkId: link.id,
                gridCol: col,
                gridRow: row,
                gridColSpan: cellSpan,
                gridRowSpan: 1
            });

            col += cellSpan;
        }

        return positions;
    };

    /**
     * Calculate link positions for view mode (left-aligned like edit mode)
     */
    const calculateViewModeLayout = (gridCols, gridRows) => {
        // Use same left-aligned layout as edit mode
        return calculateEditModeLayout(gridCols, gridRows);
    };

    /**
     * Calculate remaining capacity
     */
    const getRemainingCapacity = (gridCols, gridRows) => {
        const totalCells = gridCols * gridRows;
        const occupiedCells = links.reduce((sum, link) => {
            return sum + (link.size === 'rectangle' ? 2 : 1);
        }, 0);
        return totalCells - occupiedCells;
    };

    /**
     * Get icon component
     */
    const getIcon = (iconName) => {
        const Icon = Icons[iconName] || ExternalLink;
        return Icon;
    };

    /**
     * Execute HTTP action
     */
    const executeAction = async (link, index) => {
        if (!link.action) {
            logger.error('No action configured for link', link);
            return;
        }

        const { method = 'GET', url, headers = {}, body = null } = link.action;

        setLinkStates(prev => ({ ...prev, [index]: 'loading' }));

        try {
            logger.debug(`Executing ${method} action:`, url);

            const requestConfig = {
                method: method.toLowerCase(),
                url,
                headers,
            };

            if (body && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
                requestConfig.data = body;
            }

            const response = await axios(requestConfig);

            logger.debug(`Action successful:`, response.status);

            setLinkStates(prev => ({ ...prev, [index]: 'success' }));
            setTimeout(() => {
                setLinkStates(prev => ({ ...prev, [index]: 'idle' }));
            }, 2000);
        } catch (error) {
            logger.error(`Action failed:`, error);
            setLinkStates(prev => ({ ...prev, [index]: 'error' }));
            setTimeout(() => {
                setLinkStates(prev => ({ ...prev, [index]: 'idle' }));
            }, 2000);
        }
    };

    /**
     * Save link (create or update)
     */
    const handleSaveLink = async () => {
        try {
            // Build link object
            const newLink = {
                id: editingLinkId || `link-${Date.now()}`,
                title: formData.title,
                icon: formData.icon,
                size: formData.size,
                type: formData.type,
                url: formData.url,
                style: {
                    showIcon: formData.showIcon,
                    showText: formData.showText
                },
                action: formData.type === 'action' ? formData.action : undefined
            };

            // Update links array
            const updatedLinks = editingLinkId
                ? links.map(l => l.id === editingLinkId ? newLink : l)
                : [...links, newLink];

            // Fetch current widgets from backend
            const response = await axios.get('/api/widgets');
            const allWidgets = response.data.widgets || [];

            // Check if widget exists in backend (to detect NEW unsaved widgets)
            const widgetExistsInBackend = allWidgets.some(w => w.id === widgetId);

            if (widgetExistsInBackend) {
                // Widget is saved - update backend and trigger full refresh
                const updatedWidgets = allWidgets.map(w =>
                    w.id === widgetId ? { ...w, config: { ...w.config, links: updatedLinks } } : w
                );
                await axios.put('/api/widgets', { widgets: updatedWidgets });

                logger.debug(`Link ${editingLinkId ? 'updated' : 'added'} (saved widget)`);

                // Close form
                setShowAddForm(false);
                setEditingLinkId(null);

                // Trigger full refresh from backend
                window.dispatchEvent(new CustomEvent('widget-config-updated', {
                    detail: { widgetId }
                }));

                // Mark Dashboard as having unsaved changes
                window.dispatchEvent(new CustomEvent('widgets-modified', {
                    detail: { widgets: updatedWidgets }
                }));
            } else {
                // Widget is NEW (not in backend) - only update Dashboard's local state
                // Don't save to backend (would remove widget from state)
                logger.debug(`Link ${editingLinkId ? 'updated' : 'added'} (unsaved widget)`);

                // Close form
                setShowAddForm(false);
                setEditingLinkId(null);

                // Dispatch event to update ONLY this widget's config in Dashboard's local state
                window.dispatchEvent(new CustomEvent('widget-config-changed', {
                    detail: {
                        widgetId,
                        config: { ...config, links: updatedLinks }
                    }
                }));
            }
        } catch (error) {
            logger.error('Failed to save link:', error);
            logger.error('Error details:', error.response?.data);
            showError('Save Failed', 'Failed to save link. Please try again.');
        }
    };

    /**
     * Delete link (called after inline confirmation)
     */
    const handleDeleteLink = async (linkId) => {
        setConfirmDeleteId(null); // Clear confirmation state

        try {
            // Remove from links array
            const updatedLinks = links.filter(l => l.id !== linkId);

            // Fetch current widgets from backend
            const response = await axios.get('/api/widgets');
            const allWidgets = response.data.widgets || [];

            // Check if widget exists in backend
            const widgetExistsInBackend = allWidgets.some(w => w.id === widgetId);

            if (widgetExistsInBackend) {
                // Widget is saved - update backend
                const updatedWidgets = allWidgets.map(w =>
                    w.id === widgetId ? { ...w, config: { ...w.config, links: updatedLinks } } : w
                );
                await axios.put('/api/widgets', { widgets: updatedWidgets });

                logger.debug('Link deleted (saved widget)');

                // Widget-only refresh with fade animation
                const widgetElement = document.querySelector(`[data-widget-id="${widgetId}"]`);
                if (widgetElement) {
                    widgetElement.style.opacity = '0.5';
                    widgetElement.style.transition = 'opacity 0.3s ease';
                    setTimeout(() => {
                        widgetElement.style.opacity = '1';
                    }, 100);
                }

                // Trigger parent re-render
                window.dispatchEvent(new CustomEvent('widget-config-updated', {
                    detail: { widgetId }
                }));

                // Mark Dashboard as having unsaved changes
                window.dispatchEvent(new CustomEvent('widgets-modified', {
                    detail: { widgets: updatedWidgets }
                }));
            } else {
                // Widget is NEW (not in backend) - only update local state
                logger.debug('Link deleted (unsaved widget)');

                // Dispatch event to update ONLY this widget's config
                window.dispatchEvent(new CustomEvent('widget-config-changed', {
                    detail: {
                        widgetId,
                        config: { ...config, links: updatedLinks }
                    }
                }));
            }
        } catch (error) {
            logger.error('Failed to delete link:', error);
            showError('Delete Failed', 'Failed to delete link. Please try again.');
        }
    };

    /**
     * Drag handlers for reordering links
     */
    const handleDragStart = (e, linkId) => {
        setDraggedLinkId(linkId);
        setPreviewLinks(links); // Initialize preview with current links
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', linkId);

        // Add semi-transparent effect
        e.currentTarget.style.opacity = '0.5';
    };

    const handleDragEnd = (e) => {
        e.currentTarget.style.opacity = '1';
        setDraggedLinkId(null);
        setDragOverLinkId(null);
        // Don't clear previewLinks here - let handleDrop do it after save completes
    };

    const handleDragOver = (e, linkId) => {
        e.preventDefault(); // MUST prevent default to allow drop
        e.stopPropagation(); // Prevent bubbling
        e.dataTransfer.dropEffect = 'move';

        if (draggedLinkId && draggedLinkId !== linkId && previewLinks.length > 0) {
            setDragOverLinkId(linkId);

            // Calculate new order for preview
            const draggedIndex = previewLinks.findIndex(l => l.id === draggedLinkId);
            const targetIndex = previewLinks.findIndex(l => l.id === linkId);

            if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
                const newLinks = [...previewLinks];
                const [draggedItem] = newLinks.splice(draggedIndex, 1);
                newLinks.splice(targetIndex, 0, draggedItem);
                setPreviewLinks(newLinks);
            }
        }
    };

    const handleDragLeave = () => {
        setDragOverLinkId(null);
    };

    const handleDrop = async (e, targetLinkId) => {
        e.preventDefault();

        if (!draggedLinkId || previewLinks.length === 0) {
            setDragOverLinkId(null);
            setPreviewLinks([]);
            return;
        }

        try {
            // Use the preview links order (already reordered during drag)
            const reorderedLinks = [...previewLinks];

            // Save to backend (match existing pattern)
            const response = await axios.get('/api/widgets');
            const allWidgets = response.data.widgets || [];
            const updatedWidgets = allWidgets.map(w =>
                w.id === widgetId ? { ...w, config: { ...w.config, links: reorderedLinks } } : w
            );
            await axios.put('/api/widgets', { widgets: updatedWidgets });

            // Widget-only refresh
            const widgetElement = document.querySelector(`[data-widget-id="${widgetId}"]`);
            if (widgetElement) {
                widgetElement.style.opacity = '0.5';
                widgetElement.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                    widgetElement.style.opacity = '1';
                }, 100);
            }

            // Trigger parent re-render
            window.dispatchEvent(new CustomEvent('widget-config-updated', {
                detail: { widgetId }
            }));

            // Clear preview after a brief delay to allow widget refresh to complete
            setTimeout(() => {
                setPreviewLinks([]);
                setDragOverLinkId(null);
            }, 100);
        } catch (error) {
            logger.error('Failed to reorder links:', error);
            showError('Reorder Failed', 'Failed to reorder links. Please try again.');
            setPreviewLinks([]); // Clear on error
        }
    };

    /**
     * Render grid outlines (edit mode only)
     */
    const renderGridOutlines = (gridCols, gridRows, cellSize) => {
        if (!editModeActive) return null;

        const outlines = [];

        // Create occupancy grid to track which cells are filled
        const occupancyGrid = Array(gridRows).fill(null).map(() => Array(gridCols).fill(false));

        // Mark occupied cells
        linkPositions.forEach(pos => {
            for (let c = 0; c < pos.gridColSpan; c++) {
                if (pos.gridRow < gridRows && pos.gridCol + c < gridCols) {
                    occupancyGrid[pos.gridRow][pos.gridCol + c] = true;
                }
            }
        });

        // Render outline for each cell
        for (let row = 0; row < gridRows; row++) {
            for (let col = 0; col < gridCols; col++) {
                const isOccupied = occupancyGrid[row][col];
                const style = {
                    position: 'absolute',
                    left: `${col * (cellSize + GRID_GAP)}px`,
                    top: `${row * (cellSize + GRID_GAP)}px`,
                    width: `${cellSize}px`,
                    height: `${cellSize}px`,
                    border: '2px dashed #888',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    transition: 'opacity 0.2s ease',
                    opacity: isOccupied ? 0 : 0.5, // Hide outline if cell is occupied
                };

                outlines.push(
                    <div
                        key={`outline-${row}-${col}`}
                        style={style}
                    />
                );
            }
        }

        return outlines;
    };

    /**
     * Render a single link
     */
    const renderLink = (link, position, cellSize) => {
        const Icon = getIcon(link.icon);
        const state = linkStates[link.id] || 'idle';
        const isLoading = state === 'loading';
        const isSuccess = state === 'success';
        const isError = state === 'error';
        const isCircle = link.size === 'circle';

        const width = cellSize * position.gridColSpan;
        const height = cellSize;

        // Base classes
        const baseClasses = 'flex items-center justify-center border bg-theme-tertiary border-theme transition-all duration-200 relative overflow-hidden';

        // Shape classes
        const shapeClasses = isCircle
            ? 'rounded-full flex-col'
            : 'rounded-full flex-row gap-2';

        // State classes
        const stateClasses = isSuccess
            ? 'border-success/70 bg-success/20'
            : isError
                ? 'border-error/70 bg-error/20'
                : 'hover:border-accent';

        const classes = `${baseClasses} ${shapeClasses} ${stateClasses}`;

        // Icon rendering - scale with cell size
        const iconSize = Math.max(16, Math.min(32, cellSize * 0.3)); // 30% of cell size, clamped 16-32px

        const renderIcon = () => {
            if (isLoading) return <Loader size={iconSize} className="text-accent animate-spin" />;
            if (isSuccess) return <CheckCircle2 size={iconSize} className="text-success" />;
            if (isError) return <XCircle size={iconSize} className="text-error" />;
            if (link.style?.showIcon !== false) {
                return <Icon size={iconSize} className="text-accent" />;
            }
            return null;
        };

        // Text rendering - scale with cell size
        const fontSize = cellSize < 60 ? 'text-xs' : cellSize < 80 ? 'text-sm' : 'text-sm';

        const renderText = () => {
            if (isSuccess && !isCircle) return <span className={`${fontSize} font-medium text-success`}>Success</span>;
            if (isError && !isCircle) return <span className={`${fontSize} font-medium text-error`}>Failed</span>;
            if (link.style?.showText !== false) {
                return (
                    <span className={`${fontSize} font-medium text-theme-primary ${isCircle ? 'mt-1' : ''}`}>
                        {link.title}
                    </span>
                );
            }
            return null;
        };

        // Absolute positioning within grid
        const style = {
            position: 'absolute',
            left: `${position.gridCol * (cellSize + GRID_GAP)}px`,
            top: `${position.gridRow * (cellSize + GRID_GAP)}px`,
            width: `${width}px`,
            height: `${height}px`,
        };

        // Edit mode controls (hover overlay)
        const renderEditControls = () => {
            if (!editModeActive) return null;

            // Hide controls during drag operations
            if (draggedLinkId) return null;

            return (
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 rounded-inherit pointer-events-none">
                    {/* Edit button */}
                    <button
                        className="p-2 bg-info hover:bg-info-hover rounded-lg transition-colors pointer-events-auto"
                        title="Edit link"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingLinkId(link.id);
                            setShowAddForm(false);
                            setConfirmDeleteId(null);
                        }}
                    >
                        <Edit2 size={16} className="text-white" />
                    </button>
                    {/* Delete button with inline confirmation */}
                    {confirmDeleteId !== link.id ? (
                        <button
                            className="p-2 bg-error hover:bg-error-hover rounded-lg transition-colors pointer-events-auto"
                            title="Delete link"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setConfirmDeleteId(link.id);
                            }}
                        >
                            <Trash2 size={16} className="text-white" />
                        </button>
                    ) : (
                        <>
                            <button
                                className="p-2 bg-error hover:bg-error-hover rounded-lg transition-colors pointer-events-auto"
                                title="Confirm delete"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteLink(link.id);
                                }}
                            >
                                <Check size={16} className="text-white" />
                            </button>
                            <button
                                className="p-2 bg-theme-tertiary hover:bg-theme-hover rounded-lg transition-colors pointer-events-auto"
                                title="Cancel"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setConfirmDeleteId(null);
                                }}
                            >
                                <X size={16} className="text-white" />
                            </button>
                        </>
                    )}
                </div>
            );
        };

        // Visual feedback for drag state
        const isDragging = draggedLinkId === link.id;
        const isDragOver = dragOverLinkId === link.id;
        const dragClasses = isDragOver ? ' ring-2 ring-accent ring-offset-2 ring-offset-theme-secondary' : '';

        // Regular link
        if (link.type === 'link' || !link.type) {
            return (
                <a
                    key={link.id}
                    href={editModeActive ? undefined : link.url}
                    target={editModeActive ? undefined : "_blank"}
                    rel={editModeActive ? undefined : "noopener noreferrer"}
                    className={`${classes} ${editModeActive ? 'cursor-grab active:cursor-grabbing' : ''}${dragClasses}`}
                    style={style}
                    onClick={(e) => editModeActive && e.preventDefault()}
                    draggable={editModeActive}
                    onDragStart={(e) => editModeActive && handleDragStart(e, link.id)}
                    onDragEnd={handleDragEnd}
                    onDragEnter={(e) => e.preventDefault()}
                    onDragOver={(e) => handleDragOver(e, link.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, link.id)}
                >
                    {renderIcon()}
                    {renderText()}
                    {renderEditControls()}
                </a>
            );
        }

        // HTTP action button
        return (
            <button
                key={link.id}
                onClick={(e) => {
                    if (editModeActive) {
                        e.preventDefault();
                        return;
                    }
                    executeAction(link, link.id);
                }}
                disabled={isLoading}
                className={`${classes} ${isLoading ? 'cursor-wait' : editModeActive ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}${dragClasses}`}
                style={style}
                draggable={editModeActive}
                onDragStart={(e) => editModeActive && handleDragStart(e, link.id)}
                onDragEnd={handleDragEnd}
                onDragEnter={(e) => e.preventDefault()}
                onDragOver={(e) => handleDragOver(e, link.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, link.id)}
            >
                {renderIcon()}
                {renderText()}
                {renderEditControls()}
            </button>
        );
    };

    // Calculate grid metrics
    const { cols, rows, cellSize, maxRows } = calculateGridMetrics();

    // Calculate positions (edit mode = left-aligned, view mode = centered)
    // Use preview links during drag for live reordering
    const activeLinks = (draggedLinkId && previewLinks.length > 0) ? previewLinks : links;
    const linkPositions = editModeActive
        ? calculateEditModeLayout(cols, rows, activeLinks)
        : calculateViewModeLayout(cols, rows);

    // Calculate remaining capacity
    const remainingCapacity = getRemainingCapacity(cols, rows);

    // Grid container dimensions
    const gridHeight = rows * cellSize + (rows - 1) * GRID_GAP;

    // Grid width: always use full columns for consistent left-aligned layout
    const gridWidth = cols * cellSize + (cols - 1) * GRID_GAP;

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full flex items-center justify-center ${editModeActive ? 'no-drag' : ''}`}
        >
            {/* Edit mode controls (Save/Cancel) */}
            {editModeActive && (
                <div className="absolute top-2 right-14 flex gap-2 z-30 no-drag">
                    <button
                        onClick={() => setEditModeActive(false)}
                        className="h-10 px-3 bg-theme-tertiary hover:bg-theme-hover rounded-lg text-theme-secondary hover:text-theme-primary transition-all shadow-lg flex items-center border border-theme"
                    >
                        <span className="text-xs font-medium">Cancel</span>
                    </button>
                    <button
                        onClick={() => {
                            setEditModeActive(false);
                        }}
                        className="h-10 px-3 bg-accent/80 hover:bg-accent rounded-lg text-white transition-all shadow-lg flex items-center"
                    >
                        <span className="text-xs font-medium">Save</span>
                    </button>
                </div>
            )}

            {/* Configure button (dashboard edit mode) */}
            {editMode && !editModeActive && (
                <button
                    onClick={() => setEditModeActive(true)}
                    className="absolute top-2 right-14 h-10 px-3 bg-theme-tertiary hover:bg-theme-hover rounded-lg text-theme-secondary hover:text-theme-primary transition-all no-drag flex items-center gap-1.5 shadow-lg z-20 border border-theme"
                >
                    <Edit2 size={14} />
                    <span className="text-xs font-medium">Configure</span>
                </button>
            )}

            {/* Empty state */}
            {links.length === 0 && !editModeActive ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-sm text-theme-secondary">No links configured</p>
                    {editMode && (
                        <p className="text-xs text-theme-tertiary mt-1">Click Configure to add links</p>
                    )}
                </div>
            ) : (
                /* Grid container */
                <div
                    className="relative"
                    style={{
                        width: `${gridWidth}px`,
                        height: `${gridHeight}px`
                    }}
                >
                    {/* Grid outlines (edit mode only - shows all available cells) */}
                    {renderGridOutlines(cols, editModeActive ? maxRows : rows, cellSize)}

                    {/* Render links */}
                    {linkPositions.map(position => {
                        const link = links.find(l => l.id === position.linkId);
                        return link ? renderLink(link, position, cellSize) : null;
                    })}

                    {/* Add button (in edit mode, if space available) */}
                    {editModeActive && remainingCapacity > 0 && !showAddForm && (() => {
                        // Calculate the next available cell position
                        let nextCol = 0;
                        let nextRow = 0;

                        if (linkPositions.length > 0) {
                            const lastPosition = linkPositions[linkPositions.length - 1];
                            nextCol = lastPosition.gridCol + lastPosition.gridColSpan;
                            nextRow = lastPosition.gridRow;

                            // Check if next position would overflow current row
                            if (nextCol >= cols) {
                                nextCol = 0;
                                nextRow++;
                            }
                        }

                        return (
                            <button
                                onClick={() => {
                                    setShowAddForm(true);
                                    setEditingLinkId(null);
                                }}
                                className="absolute p-4 border-2 border-dashed border-theme hover:border-accent rounded-full transition-all hover:scale-105 flex items-center justify-center bg-theme-tertiary hover:bg-theme-hover cursor-pointer z-20"
                                style={{
                                    left: `${nextCol * (cellSize + GRID_GAP)}px`,
                                    top: `${nextRow * (cellSize + GRID_GAP)}px`,
                                    width: `${cellSize}px`,
                                    height: `${cellSize}px`,
                                }}
                            >
                                <Plus size={32} className="text-theme-secondary" />
                            </button>
                        );
                    })()}
                </div>
            )}

            {/* Add/Edit form (rendered outside widget via portal to avoid clipping) */}
            {editModeActive && (showAddForm || editingLinkId) && ReactDOM.createPortal(
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 z-[9998]"
                        onClick={() => {
                            setShowAddForm(false);
                            setEditingLinkId(null);
                        }}
                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        onDragStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        onDrag={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        style={{
                            pointerEvents: 'auto',
                            cursor: 'default',
                            userSelect: 'none',
                            WebkitUserSelect: 'none'
                        }}
                    />

                    {/* Form Modal */}
                    <div
                        className="fixed bg-theme-secondary border border-theme rounded-xl shadow-2xl p-5 space-y-4 z-[9999]"
                        style={{
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            maxWidth: '420px',
                            width: 'calc(100% - 32px)',
                            maxHeight: '80vh',
                            overflowY: 'auto'
                        }}
                    >
                        {/* Header with close button */}
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-semibold text-theme-primary">
                                {editingLinkId ? 'Edit Link' : 'Add New Link'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setEditingLinkId(null);
                                }}
                                className="p-1.5 hover:bg-theme-tertiary rounded-lg transition-colors"
                                title="Close"
                            >
                                <Icons.X size={16} className="text-theme-secondary" />
                            </button>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-xs text-theme-secondary mb-1">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-3 py-2 bg-theme-tertiary border border-theme rounded text-sm text-theme-primary focus:border-accent focus:outline-none"
                                placeholder="Enter link title"
                            />
                        </div>

                        {/* Shape selector */}
                        <div>
                            <label className="block text-xs text-theme-secondary mb-1">Shape</label>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setFormData({ ...formData, size: 'circle' })}
                                    className={`flex-1 px-4 py-3 rounded-lg text-sm transition-all flex flex-col items-center gap-2 ${formData.size === 'circle'
                                        ? 'bg-accent text-white ring-2 ring-accent ring-offset-2 ring-offset-theme-secondary'
                                        : 'bg-theme-tertiary text-theme-secondary hover:bg-theme-hover'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${formData.size === 'circle' ? 'border-white' : 'border-theme'}`}>
                                        <span className="text-xs font-medium">1×1</span>
                                    </div>
                                    <span className="text-xs font-medium">Circle</span>
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, size: 'rectangle' })}
                                    className={`flex-1 px-4 py-3 rounded-lg text-sm transition-all flex flex-col items-center gap-2 ${formData.size === 'rectangle'
                                        ? 'bg-accent text-white ring-2 ring-accent ring-offset-2 ring-offset-theme-secondary'
                                        : 'bg-theme-tertiary text-theme-secondary hover:bg-theme-hover'
                                        }`}
                                >
                                    <div className={`w-20 h-12 rounded-full border-2 flex items-center justify-center ${formData.size === 'rectangle' ? 'border-white' : 'border-theme'}`}>
                                        <span className="text-xs font-medium">2×1</span>
                                    </div>
                                    <span className="text-xs font-medium">Rectangle</span>
                                </button>
                            </div>
                        </div>

                        {/* Type selector */}
                        <div>
                            <label className="block text-xs text-theme-secondary mb-1">Type</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFormData({ ...formData, type: 'link' })}
                                    className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${formData.type === 'link'
                                        ? 'bg-accent text-white'
                                        : 'bg-theme-tertiary text-theme-secondary hover:bg-theme-hover'
                                        }`}
                                >
                                    Open Link
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, type: 'action' })}
                                    className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${formData.type === 'action'
                                        ? 'bg-accent text-white'
                                        : 'bg-theme-tertiary text-theme-secondary hover:bg-theme-hover'
                                        }`}
                                >
                                    HTTP Action
                                </button>
                            </div>
                        </div>

                        {/* URL (for links) or Action URL (for actions) */}
                        {formData.type === 'link' ? (
                            <div>
                                <label className="block text-xs text-theme-secondary mb-1">URL</label>
                                <input
                                    type="url"
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    className="w-full px-3 py-2 bg-theme-tertiary border border-theme rounded text-sm text-theme-primary focus:border-accent focus:outline-none"
                                    placeholder="https://example.com"
                                />
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-xs text-theme-secondary mb-1">Method</label>
                                    <select
                                        value={formData.action.method}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            action: { ...formData.action, method: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 bg-theme-tertiary border border-theme rounded text-sm text-theme-primary focus:border-accent focus:outline-none"
                                    >
                                        <option value="GET">GET</option>
                                        <option value="POST">POST</option>
                                        <option value="PUT">PUT</option>
                                        <option value="DELETE">DELETE</option>
                                        <option value="PATCH">PATCH</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-theme-secondary mb-1">Action URL</label>
                                    <input
                                        type="url"
                                        value={formData.action.url}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            action: { ...formData.action, url: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 bg-theme-tertiary border border-theme rounded text-sm text-theme-primary focus:border-accent focus:outline-none"
                                        placeholder="https://api.example.com/action"
                                    />
                                </div>
                            </>
                        )}

                        {/* Icon Picker */}
                        <div>
                            <label className="block text-xs text-theme-secondary mb-1">Icon</label>
                            <IconPicker
                                value={formData.icon}
                                onChange={(icon) => setFormData({ ...formData, icon })}
                            />
                        </div>

                        {/* Display options */}
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm text-theme-secondary cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.showIcon}
                                    onChange={(e) => setFormData({ ...formData, showIcon: e.target.checked })}
                                    className="rounded border-theme bg-theme-tertiary"
                                />
                                Show Icon
                            </label>
                            <label className="flex items-center gap-2 text-sm text-theme-secondary cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.showText}
                                    onChange={(e) => setFormData({ ...formData, showText: e.target.checked })}
                                    className="rounded border-theme bg-theme-tertiary"
                                />
                                Show Text
                            </label>
                        </div>

                        {/* Form actions */}
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setEditingLinkId(null);
                                    // Reset form
                                    setFormData({
                                        title: '',
                                        icon: 'Link',
                                        size: 'circle',
                                        type: 'link',
                                        url: '',
                                        showIcon: true,
                                        showText: true,
                                        action: { method: 'GET', url: '', headers: {}, body: null }
                                    });
                                }}
                                className="px-4 py-2 bg-theme-tertiary hover:bg-theme-hover rounded text-sm text-theme-secondary hover:text-theme-primary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveLink}
                                className="px-4 py-2 bg-accent hover:bg-accent/80 rounded text-sm text-white transition-colors"
                            >
                                Save Link
                            </button>
                        </div>
                    </div>
                </>,
                document.body
            )}

            {/* Debug info (temporary) */}
            {process.env.NODE_ENV === 'development' && (
                <div className="absolute bottom-2 left-2 text-xs text-theme-secondary bg-black/50 px-2 py-1 rounded">
                    {cols}x{rows} grid, {cellSize.toFixed(0)}px cells, {remainingCapacity} remaining
                </div>
            )}
        </div>
    );
};

export default LinkGridWidget_v2;
