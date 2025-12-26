import React, { useState, useRef, useEffect, DragEvent, CSSProperties } from 'react';
import ReactDOM from 'react-dom';
import { ExternalLink, Loader, CheckCircle2, XCircle, Plus, Edit2, Trash2, Check, X, LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import axios, { AxiosRequestConfig } from 'axios';
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

type LinkSize = 'circle' | 'rectangle';
type LinkType = 'link' | 'action';
type LinkState = 'idle' | 'loading' | 'success' | 'error';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type GridJustify = 'left' | 'center' | 'right';

interface LinkAction {
    method: HttpMethod;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
}

interface LinkStyle {
    showIcon?: boolean;
    showText?: boolean;
}

interface Link {
    id: string;
    title: string;
    icon: string;
    size: LinkSize;
    type: LinkType;
    url?: string;
    style?: LinkStyle;
    action?: LinkAction;
}

interface LinkPosition {
    linkId: string;
    gridCol: number;
    gridRow: number;
    gridColSpan: number;
    gridRowSpan: number;
}

interface GridMetrics {
    cols: number;
    rows: number;
    cellSize: number;
    maxRows: number;
}

interface FormData {
    title: string;
    icon: string;
    size: LinkSize;
    type: LinkType;
    url: string;
    showIcon: boolean;
    showText: boolean;
    action: LinkAction;
}

interface ContainerSize {
    width: number;
    height: number;
}

interface LinkGridWidgetConfig {
    links?: Link[];
    gridJustify?: GridJustify;
    [key: string]: unknown;
}

interface LinkGridWidgetProps {
    config?: LinkGridWidgetConfig;
    editMode?: boolean;
    widgetId?: string;
    setGlobalDragEnabled?: (enabled: boolean) => void;
}

interface WidgetData {
    id?: string;
    config?: Record<string, unknown>;
    [key: string]: unknown;
}

interface WidgetsResponse {
    widgets?: WidgetData[];
}

const LinkGridWidget_v2: React.FC<LinkGridWidgetProps> = ({ config, editMode = false, widgetId, setGlobalDragEnabled }) => {
    const { links = [], gridJustify = 'center' } = config || {};
    const { error: showError, success: showSuccess } = useNotifications();

    // Refs for dimension measurement
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [containerSize, setContainerSize] = useState<ContainerSize>({ width: 0, height: 0 });

    // Widget state
    const [linkStates, setLinkStates] = useState<Record<string, LinkState>>({}); // HTTP action states
    const [showAddForm, setShowAddForm] = useState<boolean>(false); // Show add link form
    const [editingLinkId, setEditingLinkId] = useState<string | null>(null); // ID of link being edited
    const [draggedLinkId, setDraggedLinkId] = useState<string | null>(null); // ID of link being dragged
    const [dragOverLinkId, setDragOverLinkId] = useState<string | null>(null); // ID of link being dragged over
    const [previewLinks, setPreviewLinks] = useState<Link[]>([]); // Temporary order during drag
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null); // ID of link pending delete confirmation

    const [formData, setFormData] = useState<FormData>({
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

    // Detect touch device - disable HTML5 draggable on touch devices (iOS doesn't support it and causes issues)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    /**
     * Measure container size on mount and resize
     */
    useEffect(() => {
        const measureContainer = (): void => {
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
    }, [links.length, editMode, showAddForm]);

    // Reset form state when dashboard exits edit mode
    useEffect(() => {
        if (!editMode) {
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
     * Note: We use a ref to access current links without adding to dependencies
     */
    const linksRef = useRef<Link[]>(links);
    linksRef.current = links;

    useEffect(() => {
        if (editingLinkId) {
            const linkToEdit = linksRef.current.find(l => l.id === editingLinkId);
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
    }, [editingLinkId, showAddForm]);

    /**
     * Calculate grid dimensions and cell size
     * Strategy: Fit grid perfectly within available container space
     * - Measure actual available width/height (already accounts for padding)
     * - Calculate max rows/cols that fit
     * - Size cells to fill space without overflow
     */
    const calculateGridMetrics = (): GridMetrics => {
        if (containerSize.width === 0 || containerSize.height === 0) {
            return { cols: 6, rows: 1, cellSize: 100, maxRows: 1 }; // Default fallback
        }

        const availableWidth = containerSize.width;
        const availableHeight = containerSize.height;

        // Responsive columns based on width (~100px per column)
        const MIN_COLS = 6;  // Minimum for mobile
        const MAX_COLS = 12; // Maximum for full-width widget
        let cols = Math.floor(availableWidth / 100);
        cols = Math.max(MIN_COLS, Math.min(MAX_COLS, cols));

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
        const cellSize = Math.min(cellWidthMax, cellHeightMax);

        // maxRows for edit mode outlines (same as rows)
        const maxRows = rows;

        // Return grid metrics
        return { cols, rows, cellSize, maxRows };
    };

    /**
     * Calculate link positions for edit mode (left-aligned)
     */
    const calculateEditModeLayout = (gridCols: number, gridRows: number, linksToLayout: Link[] = links): LinkPosition[] => {
        const positions: LinkPosition[] = [];
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
    const calculateViewModeLayout = (gridCols: number, gridRows: number): LinkPosition[] => {
        // Use same left-aligned layout as edit mode
        return calculateEditModeLayout(gridCols, gridRows);
    };

    /**
     * Calculate remaining capacity
     */
    const getRemainingCapacity = (gridCols: number, gridRows: number): number => {
        const totalCells = gridCols * gridRows;
        const occupiedCells = links.reduce((sum, link) => {
            return sum + (link.size === 'rectangle' ? 2 : 1);
        }, 0);
        return totalCells - occupiedCells;
    };

    /**
     * Get icon component
     */
    const getIcon = (iconName: string): LucideIcon => {
        const Icon = (Icons as unknown as Record<string, LucideIcon>)[iconName] || ExternalLink;
        return Icon;
    };

    /**
     * Execute HTTP action
     */
    const executeAction = async (link: Link, index: string): Promise<void> => {
        if (!link.action) {
            logger.error('No action configured for link', link);
            return;
        }

        const { method = 'GET', url, headers = {}, body = null } = link.action;

        setLinkStates(prev => ({ ...prev, [index]: 'loading' }));

        try {
            logger.debug(`Executing ${method} action:`, url);

            const requestConfig: AxiosRequestConfig = {
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
     * Only updates local state via event - Dashboard handles actual save
     */
    const handleSaveLink = (): void => {
        // Build link object
        const newLink: Link = {
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

        logger.debug(`Link ${editingLinkId ? 'updated' : 'added'} (tentative)`);

        // Close form
        setShowAddForm(false);
        setEditingLinkId(null);

        // Dispatch event to update Dashboard's local state
        // Dashboard will handle save when user saves the dashboard
        window.dispatchEvent(new CustomEvent('widget-config-changed', {
            detail: {
                widgetId,
                config: { ...config, links: updatedLinks }
            }
        }));
    };

    /**
     * Delete link (called after inline confirmation)
     * Only updates local state via event - Dashboard handles actual save
     */
    const handleDeleteLink = (linkId: string): void => {
        setConfirmDeleteId(null); // Clear confirmation state

        // Remove from links array
        const updatedLinks = links.filter(l => l.id !== linkId);

        logger.debug('Link deleted (tentative)');

        // Dispatch event to update Dashboard's local state
        window.dispatchEvent(new CustomEvent('widget-config-changed', {
            detail: {
                widgetId,
                config: { ...config, links: updatedLinks }
            }
        }));
    };

    /**
     * Drag handlers for reordering links
     */
    const handleDragStart = (e: DragEvent<HTMLAnchorElement | HTMLButtonElement>, linkId: string): void => {
        setDraggedLinkId(linkId);
        setPreviewLinks(links); // Initialize preview with current links
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', linkId);

        // Add semi-transparent effect
        (e.currentTarget as HTMLElement).style.opacity = '0.5';
    };

    const handleDragEnd = (e: DragEvent<HTMLAnchorElement | HTMLButtonElement>): void => {
        (e.currentTarget as HTMLElement).style.opacity = '1';
        setDraggedLinkId(null);
        setDragOverLinkId(null);
        // Don't clear previewLinks here - let handleDrop do it after save completes
    };

    const handleDragOver = (e: DragEvent<HTMLAnchorElement | HTMLButtonElement>, linkId: string): void => {
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

    const handleDragLeave = (): void => {
        setDragOverLinkId(null);
    };

    const handleDrop = (e: DragEvent<HTMLAnchorElement | HTMLButtonElement>, targetLinkId: string): void => {
        e.preventDefault();

        if (!draggedLinkId || previewLinks.length === 0) {
            setDragOverLinkId(null);
            setPreviewLinks([]);
            return;
        }

        // Use the preview links order (already reordered during drag)
        const reorderedLinks = [...previewLinks];

        logger.debug('Links reordered (tentative)');

        // Clear preview state
        setPreviewLinks([]);
        setDragOverLinkId(null);

        // Dispatch event to update Dashboard's local state
        window.dispatchEvent(new CustomEvent('widget-config-changed', {
            detail: {
                widgetId,
                config: { ...config, links: reorderedLinks }
            }
        }));
    };

    // Calculate grid metrics
    const { cols, rows, cellSize, maxRows } = calculateGridMetrics();

    // Calculate positions (edit mode = left-aligned, view mode = centered)
    // Use preview links during drag for live reordering
    const activeLinks = (draggedLinkId && previewLinks.length > 0) ? previewLinks : links;
    const linkPositions = editMode
        ? calculateEditModeLayout(cols, rows, activeLinks)
        : calculateViewModeLayout(cols, rows);

    /**
     * Render grid outlines (edit mode only)
     */
    const renderGridOutlines = (gridCols: number, gridRows: number, gridCellSize: number): React.ReactNode => {
        if (!editMode) return null;

        const outlines: React.ReactNode[] = [];

        // Create occupancy grid to track which cells are filled
        const occupancyGrid: boolean[][] = Array(gridRows).fill(null).map(() => Array(gridCols).fill(false));

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
                const style: CSSProperties = {
                    position: 'absolute',
                    left: `${col * (gridCellSize + GRID_GAP)}px`,
                    top: `${row * (gridCellSize + GRID_GAP)}px`,
                    width: `${gridCellSize}px`,
                    height: `${gridCellSize}px`,
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
    const renderLink = (link: Link, position: LinkPosition, gridCellSize: number): React.ReactNode => {
        const Icon = getIcon(link.icon);
        const state = linkStates[link.id] || 'idle';
        const isLoading = state === 'loading';
        const isSuccess = state === 'success';
        const isError = state === 'error';
        const isCircle = link.size === 'circle';

        const width = gridCellSize * position.gridColSpan;
        const height = gridCellSize;

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
                : ''; // No default hover - editModeClasses handles it

        const classes = `${baseClasses} ${shapeClasses} ${stateClasses}`;

        // Icon rendering - scale with cell size
        const iconSize = Math.max(16, Math.min(32, gridCellSize * 0.3)); // 30% of cell size, clamped 16-32px

        const renderIcon = (): React.ReactNode => {
            if (isLoading) return <Loader size={iconSize} className="text-accent animate-spin" />;
            if (isSuccess) return <CheckCircle2 size={iconSize} className="text-success" />;
            if (isError) return <XCircle size={iconSize} className="text-error" />;
            if (link.style?.showIcon !== false) {
                return <Icon size={iconSize} className="text-accent" />;
            }
            return null;
        };

        // Text rendering - scale with cell size
        const fontSize = gridCellSize < 60 ? 'text-xs' : gridCellSize < 80 ? 'text-sm' : 'text-sm';

        const renderText = (): React.ReactNode => {
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
        const style: CSSProperties = {
            position: 'absolute',
            left: `${position.gridCol * (gridCellSize + GRID_GAP)}px`,
            top: `${position.gridRow * (gridCellSize + GRID_GAP)}px`,
            width: `${width}px`,
            height: `${height}px`,
        };

        // Click handler: open edit modal in edit mode
        const handleLinkClick = (e: React.MouseEvent): void => {
            if (editMode) {
                e.preventDefault();
                e.stopPropagation();
                setEditingLinkId(link.id);
                setShowAddForm(false);
            }
        };

        // Visual feedback for drag state and edit mode
        const isDragOver = dragOverLinkId === link.id;
        const dragClasses = isDragOver ? ' ring-2 ring-accent ring-offset-2 ring-offset-theme-secondary' : '';
        const editModeClasses = ''; // No edit mode styling on links - widget wrapper provides feedback

        // Regular link
        if (link.type === 'link' || !link.type) {
            return (
                <a
                    key={link.id}
                    href={editMode ? undefined : link.url}
                    target={editMode ? undefined : "_blank"}
                    rel={editMode ? undefined : "noopener noreferrer"}
                    className={`${classes}${editModeClasses} ${editMode ? 'cursor-pointer' : ''}${dragClasses}`}
                    style={style}
                    onClick={handleLinkClick}
                    draggable={editMode && !editingLinkId && !isTouchDevice}
                    onDragStart={(e) => editMode && handleDragStart(e, link.id)}
                    onDragEnd={handleDragEnd}
                    onDragEnter={(e) => e.preventDefault()}
                    onDragOver={(e) => handleDragOver(e, link.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, link.id)}
                >
                    {renderIcon()}
                    {renderText()}
                </a>
            );
        }

        // HTTP action button
        return (
            <button
                key={link.id}
                onClick={(e) => {
                    if (editMode) {
                        handleLinkClick(e);
                        return;
                    }
                    executeAction(link, link.id);
                }}
                disabled={isLoading}
                className={`${classes}${editModeClasses} ${isLoading ? 'cursor-wait' : editMode ? 'cursor-pointer' : 'cursor-pointer'}${dragClasses}`}
                style={style}
                draggable={editMode && !editingLinkId && !isTouchDevice}
                onDragStart={(e) => editMode && handleDragStart(e, link.id)}
                onDragEnd={handleDragEnd}
                onDragEnter={(e) => e.preventDefault()}
                onDragOver={(e) => handleDragOver(e, link.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, link.id)}
            >
                {renderIcon()}
                {renderText()}
            </button>
        );
    };

    // Calculate remaining capacity
    const remainingCapacity = getRemainingCapacity(cols, rows);

    // Grid container dimensions
    const gridHeight = rows * cellSize + (rows - 1) * GRID_GAP;

    // Grid width: always use full columns for consistent left-aligned layout
    const gridWidth = cols * cellSize + (cols - 1) * GRID_GAP;

    // Get justify class for container
    const justifyClass = gridJustify === 'left' ? 'justify-start'
        : gridJustify === 'center' ? 'justify-center'
            : 'justify-end';

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full flex items-center ${justifyClass} no-drag`}
            style={editMode ? {
                touchAction: 'manipulation',
                WebkitUserSelect: 'none',
                userSelect: 'none'
            } : undefined}
        >

            {/* Empty state */}
            {links.length === 0 && !editMode ? (
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
                    {renderGridOutlines(cols, editMode ? maxRows : rows, cellSize)}

                    {/* Render links */}
                    {linkPositions.map(position => {
                        const link = links.find(l => l.id === position.linkId);
                        return link ? renderLink(link, position, cellSize) : null;
                    })}

                    {/* Add button (in edit mode, if space available) */}
                    {editMode && remainingCapacity > 0 && !showAddForm && (() => {
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
            {editMode && (showAddForm || editingLinkId) && ReactDOM.createPortal(
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
                                            action: { ...formData.action, method: e.target.value as HttpMethod }
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
                                onChange={(icon: string) => setFormData({ ...formData, icon })}
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
                            {/* Delete button - only show when editing existing link */}
                            {editingLinkId && (
                                confirmDeleteId === editingLinkId ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                handleDeleteLink(editingLinkId);
                                                setEditingLinkId(null);
                                            }}
                                            className="px-4 py-2 bg-error hover:bg-error/80 rounded text-sm text-white transition-colors"
                                        >
                                            Delete
                                        </button>
                                        <button
                                            onClick={() => setConfirmDeleteId(null)}
                                            className="px-4 py-2 bg-theme-tertiary hover:bg-theme-hover rounded text-sm text-theme-secondary hover:text-theme-primary transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setConfirmDeleteId(editingLinkId)}
                                        className="px-4 py-2 bg-error/20 hover:bg-error/30 border border-error/50 rounded text-sm text-error transition-colors"
                                    >
                                        Delete
                                    </button>
                                )
                            )}
                            <div className="flex-1" />
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setEditingLinkId(null);
                                    setConfirmDeleteId(null);
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
