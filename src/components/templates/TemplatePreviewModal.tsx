/**
 * TemplatePreviewModal - Read-only preview of template layout
 * 
 * Features:
 * - Desktop/Mobile toggle
 * - Read-only grid layout visualization
 * - Apply and Edit buttons
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { X, Monitor, Smartphone, Play, Edit2 } from 'lucide-react';
import { Button } from '../common/Button';
import { getWidgetIcon, WIDGET_TYPES } from '../../utils/widgetRegistry';
import { getMockWidget } from './MockWidgets';
import type { Template } from './TemplateCard';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface TemplatePreviewModalProps {
    template: Template;
    isOpen: boolean;
    onClose: () => void;
    onApply: (template: Template) => void;
    onEdit: (template: Template) => void;
    isMobile?: boolean;
}

// Grid configuration matching dashboard
const GRID_COLS = { lg: 24, sm: 2 };
const ROW_HEIGHT = 40; // Smaller row height for preview
const BREAKPOINTS = { lg: 768, sm: 0 };

type ViewMode = 'desktop' | 'mobile';

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
    template,
    isOpen,
    onClose,
    onApply,
    onEdit,
    isMobile = false,
}) => {
    // On mobile, force mobile view only
    const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? 'mobile' : 'desktop');

    // Convert template widgets to grid layouts
    const layouts = useMemo(() => {
        const lgLayout: Layout[] = template.widgets.map((widget, index) => ({
            i: `widget-${index}`,
            x: widget.layout.x,
            y: widget.layout.y,
            w: widget.layout.w,
            h: widget.layout.h,
        }));

        // Build mobile layout using same algorithm as TemplateBuilderStep2
        const widgetInfos = template.widgets.map((w, i) => ({
            index: i,
            x: w.layout.x,
            y: w.layout.y,
            h: w.layout.h,
            yStart: w.layout.y,
            yEnd: w.layout.y + w.layout.h,
        }));

        const ySorted = [...widgetInfos].sort((a, b) => {
            if (a.y !== b.y) return a.y - b.y;
            if (a.x !== b.x) return a.x - b.x;
            return a.index - b.index;
        });

        // Band detection for mobile
        const bands: typeof widgetInfos[] = [];
        let currentBand: typeof widgetInfos = [];
        let currentBandMaxY = -1;

        ySorted.forEach((widget) => {
            if (currentBand.length === 0) {
                currentBand.push(widget);
                currentBandMaxY = widget.yEnd;
                return;
            }

            if (widget.yStart < currentBandMaxY) {
                currentBand.push(widget);
                currentBandMaxY = Math.max(currentBandMaxY, widget.yEnd);
            } else {
                bands.push(currentBand);
                currentBand = [widget];
                currentBandMaxY = widget.yEnd;
            }
        });
        if (currentBand.length > 0) {
            bands.push(currentBand);
        }

        // Build mobile order from bands
        const mobileOrder: number[] = [];
        bands.forEach(band => {
            const sortedBand = [...band].sort((a, b) => {
                if (a.x !== b.x) return a.x - b.x;
                return a.y - b.y;
            });
            sortedBand.forEach(w => mobileOrder.push(w.index));
        });

        // Create mobile layout
        let mobileY = 0;
        const smLayout: Layout[] = mobileOrder.map((originalIndex) => {
            const widget = template.widgets[originalIndex];
            const layout = {
                i: `widget-${originalIndex}`,
                x: 0,
                y: mobileY,
                w: 2,
                h: widget.layout.h,
            };
            mobileY += widget.layout.h;
            return layout;
        });

        return { lg: lgLayout, sm: smLayout };
    }, [template.widgets]);

    const activeBreakpoints = viewMode === 'mobile'
        ? { sm: 0 }
        : BREAKPOINTS;
    const activeCols = viewMode === 'mobile'
        ? { sm: GRID_COLS.sm }
        : GRID_COLS;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal - animated from thumbnail */}
                    <motion.div
                        layoutId={`template-preview-${template.id}`}
                        className="relative z-10 w-full max-w-4xl mx-4 bg-theme-secondary rounded-xl border border-theme shadow-2xl flex flex-col overflow-hidden"
                        style={{
                            maxHeight: isMobile
                                ? 'calc(100vh - 86px - 24px - env(safe-area-inset-bottom, 0px))'  // Tab bar + margin + safe area
                                : '90vh'
                        }}
                        layout
                        transition={{
                            layout: { type: 'tween', ease: [0.4, 0, 0.2, 1], duration: 0.35 }
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-theme">
                            <div>
                                <h2 className="text-lg font-semibold text-theme-primary">{template.name}</h2>
                                {template.description && (
                                    <p className="text-sm text-theme-tertiary">{template.description}</p>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Toolbar */}
                        <div className="flex items-center justify-between p-3 border-b border-theme bg-theme-primary/50">
                            {/* View Toggle - Desktop only */}
                            {!isMobile ? (
                                <div className="flex items-center gap-1 p-1 rounded-lg bg-theme-tertiary">
                                    <button
                                        onClick={() => setViewMode('desktop')}
                                        className={`p-2 rounded-md transition-all ${viewMode === 'desktop'
                                            ? 'bg-accent text-white'
                                            : 'text-theme-secondary hover:text-theme-primary'
                                            }`}
                                        title="Desktop View"
                                    >
                                        <Monitor size={16} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('mobile')}
                                        className={`p-2 rounded-md transition-all ${viewMode === 'mobile'
                                            ? 'bg-accent text-white'
                                            : 'text-theme-secondary hover:text-theme-primary'
                                            }`}
                                        title="Mobile View"
                                    >
                                        <Smartphone size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-theme-tertiary">
                                    <Smartphone size={14} />
                                    <span className="text-xs">Mobile Preview</span>
                                </div>
                            )}

                            {/* Widget count */}
                            <span className="text-xs text-theme-tertiary">
                                {template.widgets.length} widget{template.widgets.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Preview Grid */}
                        <div className={`flex-1 overflow-auto bg-theme-tertiary p-4 ${viewMode === 'mobile' ? 'flex justify-center' : ''
                            }`}>
                            <div className={viewMode === 'mobile' ? 'w-[300px]' : 'w-full'}>
                                <ResponsiveGridLayout
                                    layouts={layouts}
                                    breakpoints={activeBreakpoints}
                                    cols={activeCols}
                                    rowHeight={ROW_HEIGHT}
                                    isDraggable={false}
                                    isResizable={false}
                                    margin={[8, 8]}
                                    containerPadding={[16, 16]}
                                    compactType="vertical"
                                >
                                    {template.widgets.map((widget, index) => {
                                        const Icon = getWidgetIcon(widget.type);
                                        const metadata = WIDGET_TYPES[widget.type];
                                        const MockWidget = getMockWidget(widget.type);

                                        return (
                                            <div
                                                key={`widget-${index}`}
                                                className="glass-subtle rounded-lg border border-theme overflow-hidden flex flex-col"
                                            >
                                                <div className="flex items-center gap-2 p-2 border-b border-theme bg-theme-secondary/50">
                                                    <Icon size={14} className="text-accent" />
                                                    <span className="text-xs font-medium text-theme-primary truncate">
                                                        {metadata?.name || widget.type}
                                                    </span>
                                                </div>
                                                <div className="flex-1 overflow-hidden p-2">
                                                    <MockWidget />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </ResponsiveGridLayout>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-end gap-3 p-4 border-t border-theme">
                            {!isMobile && (
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        onClose();
                                        onEdit(template);
                                    }}
                                >
                                    <Edit2 size={14} />
                                    Edit
                                </Button>
                            )}
                            <Button
                                variant="primary"
                                onClick={() => {
                                    onClose();
                                    onApply(template);
                                }}
                            >
                                <Play size={14} />
                                Apply Template
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default TemplatePreviewModal;
