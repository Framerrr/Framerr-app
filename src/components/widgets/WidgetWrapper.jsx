import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Card } from '../common/Card';

/**
 * WidgetWrapper - Container component for dashboard widgets
 * Provides consistent styling, header, and controls for all widget types
 */
const WidgetWrapper = ({
    id,
    type,
    title,
    icon: Icon,
    editMode = false,
    flatten = false, // New: flatten mode removes glassmorphism/shadows
    hideHeader = false, // New: hide header completely
    onDelete,
    children
}) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Force hide header for link-grid widgets (they don't support headers)
    const shouldHideHeader = type === 'link-grid' ? true : hideHeader;

    return (
        <Card
            className={`widget-wrapper h-full overflow-hidden flex flex-col relative ${flatten ? 'flatten-mode' : ''}`}
            padding={type === 'link-grid' ? 'none' : 'lg'}
        >
            {/* Delete button - ALWAYS visible in edit mode, positioned absolutely */}
            {editMode && onDelete && (
                <div className="absolute top-2 right-2 z-50 flex items-center gap-2 no-drag">
                    {!showDeleteConfirm ? (
                        // Normal delete button
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setShowDeleteConfirm(true);
                            }}
                            className="w-10 h-10 rounded-lg bg-red-500/20 hover:bg-red-500/30 
                                       flex items-center justify-center text-red-400 hover:text-red-300
                                       transition-all duration-200"
                            style={{ pointerEvents: 'auto', cursor: 'pointer', touchAction: 'none' }}
                            aria-label="Delete widget"
                        >
                            <X size={20} />
                        </button>
                    ) : (
                        // Inline confirmation buttons (expanded)
                        <>
                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setShowDeleteConfirm(false);
                                }}
                                className="px-3 py-2 rounded-lg bg-theme-tertiary hover:bg-theme-hover text-theme-primary text-sm font-medium
                                           flex items-center gap-1 transition-all duration-200"
                                style={{ pointerEvents: 'auto', cursor: 'pointer', touchAction: 'none' }}
                            >
                                <X size={14} />
                                <span>Cancel</span>
                            </button>
                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onDelete(id);
                                }}
                                className="px-3 py-2 rounded-lg bg-error hover:bg-error/80 text-white text-sm font-medium
                                           flex items-center gap-1 transition-all duration-200"
                                style={{ pointerEvents: 'auto', cursor: 'pointer', touchAction: 'none' }}
                            >
                                <Check size={14} />
                                <span>Confirm</span>
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Widget Header - conditionally rendered */}
            {!shouldHideHeader && (
                <div className="widget-header flex items-center justify-between p-4 border-b border-theme">
                    <div className="flex items-center gap-3">
                        {Icon && (
                            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                                <Icon size={18} className="text-accent" />
                            </div>
                        )}
                        <h3 className="text-lg font-semibold text-theme-primary">
                            {title || 'Widget'}
                        </h3>
                    </div>
                </div>
            )}

            {/* Widget Content */}
            <div className={`widget-content flex-1 ${type === 'link-grid' ? 'overflow-hidden p-[2px]' : 'overflow-auto p-4'}`}>
                {children}
            </div>
        </Card>
    );
};

export default WidgetWrapper;
