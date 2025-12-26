import React, { useState } from 'react';
import { X, Check, LucideIcon } from 'lucide-react';
import { Card } from '../common/Card';

export interface WidgetWrapperProps {
    id: string;
    type: string;
    title?: string;
    icon?: LucideIcon;
    editMode?: boolean;
    flatten?: boolean;
    showHeader?: boolean;
    onDelete?: (id: string) => void;
    extraEditControls?: React.ReactNode;  // Widget-specific edit controls (rendered below delete)
    children: React.ReactNode;
}

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
    flatten = false,
    showHeader = true,
    onDelete,
    extraEditControls,
    children
}: WidgetWrapperProps): React.JSX.Element => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

    // Force hide header for link-grid widgets (they don't support headers)
    const shouldShowHeader = type === 'link-grid' ? false : showHeader;

    return (
        <Card
            className={`widget-wrapper h-full overflow-hidden flex flex-col relative ${flatten ? 'flatten-mode' : ''}`}
            padding={type === 'link-grid' ? 'sm' : 'lg'}
        >
            {/* Edit mode controls - ALWAYS visible in edit mode, positioned absolutely */}
            {editMode && (onDelete || extraEditControls) && (
                <div className="absolute top-2 right-2 z-50 flex flex-col items-end gap-1 no-drag">
                    {/* Delete button */}
                    {onDelete && !showDeleteConfirm && (
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
                    )}

                    {/* Delete confirmation buttons */}
                    {onDelete && showDeleteConfirm && (
                        <div className="flex items-center gap-2">
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
                        </div>
                    )}

                    {/* Extra widget-specific controls */}
                    {extraEditControls}
                </div>
            )}

            {/* Widget Header - conditionally rendered */}
            {shouldShowHeader && (
                <div className="widget-header flex items-center justify-between p-2 md:p-4 border-b border-theme">
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
            <div className={`widget-content flex-1 ${type === 'link-grid' ? 'overflow-hidden p-[2px]' : 'overflow-auto p-2 md:p-4'}`}>
                {children}
            </div>
        </Card>
    );
};

export default WidgetWrapper;
