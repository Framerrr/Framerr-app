/**
 * TemplateCard - Individual template display card
 * 
 * Displays template info with actions: Apply, Edit, Duplicate, Delete
 * Responsive layout: Desktop = row, Mobile = stacked
 */

import React, { useState } from 'react';
import { Edit2, Copy, Trash2, Play, Check, X, Clock, Share2, Star, RefreshCw, RotateCcw, Tag } from 'lucide-react';
import { Button } from '../common/Button';
import TemplateThumbnail from './TemplateThumbnail';
import { useLayout } from '../../context/LayoutContext';

export interface Template {
    id: string;
    name: string;
    description?: string;
    categoryId?: string;
    categoryName?: string;
    ownerId: string;
    ownerUsername?: string;
    widgets: Array<{ type: string; layout: { x: number; y: number; w: number; h: number } }>;
    isDraft: boolean;
    isDefault?: boolean;
    sharedBy?: string;
    hasUpdate?: boolean;
    userModified?: boolean;
    sharedFromId?: string;
    shareCount?: number; // Number of users this template is shared with (for admin view)
    createdAt: string;
    updatedAt: string;
}

interface TemplateCardProps {
    template: Template;
    onApply: (template: Template) => void;
    onEdit: (template: Template) => void;
    onDuplicate: (template: Template) => void;
    onDelete: (template: Template) => void;
    onShare?: (template: Template) => void;
    onSync?: (template: Template) => void;
    onRevert?: (template: Template) => void;
    onNameChange: (template: Template, newName: string) => void;
    onPreview?: (template: Template) => void;
    isAdmin?: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
    template,
    onApply,
    onEdit,
    onDuplicate,
    onDelete,
    onShare,
    onSync,
    onRevert,
    onNameChange,
    onPreview,
    isAdmin = false,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(template.name);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { isMobile } = useLayout();

    const handleNameSave = () => {
        if (editedName.trim() && editedName !== template.name) {
            onNameChange(template, editedName.trim());
        }
        setIsEditing(false);
    };

    const handleNameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleNameSave();
        } else if (e.key === 'Escape') {
            setEditedName(template.name);
            setIsEditing(false);
        }
    };

    // Is this a shared template (not owned by admin)?
    const isSharedCopy = !!template.sharedBy;

    // Badges component for reuse - Stack vertically, outline style like WidgetGallery
    // Category is rendered separately under the name
    const BadgesSection = () => (
        <div className="flex flex-col items-start gap-1">
            {template.isDraft && (
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-warning/20 text-warning text-xs">
                    <Edit2 size={12} />
                    <span>Draft</span>
                </div>
            )}
            {template.sharedBy && (
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-info/20 text-info text-xs">
                    <Share2 size={12} />
                    <span>by {template.sharedBy}</span>
                </div>
            )}
            {/* Admin: Show share count if shared */}
            {isAdmin && !isSharedCopy && template.shareCount && template.shareCount > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-accent/20 text-accent text-xs">
                    <Share2 size={12} />
                    <span>with {template.shareCount}</span>
                </div>
            )}
            {template.isDefault && isAdmin && (
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-accent/20 text-accent text-xs">
                    <Star size={12} />
                    <span>Default</span>
                </div>
            )}
            {template.hasUpdate && (
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-success/20 text-success text-xs animate-pulse">
                    <Clock size={12} />
                    <span>Update</span>
                </div>
            )}
        </div>
    );

    // Actions component for reuse
    const ActionsSection = () => (
        <div className="flex items-center gap-2 flex-wrap">
            {showDeleteConfirm ? (
                <>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(false)}
                    >
                        <X size={14} />
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                            onDelete(template);
                            setShowDeleteConfirm(false);
                        }}
                        className="bg-error hover:bg-error/80"
                    >
                        <Check size={14} />
                        Delete
                    </Button>
                </>
            ) : (
                <>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onApply(template)}
                        title="Apply template"
                    >
                        <Play size={14} />
                        Apply
                    </Button>

                    {/* Sync button for shared templates with updates */}
                    {isSharedCopy && template.hasUpdate && onSync && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onSync(template)}
                            title="Sync with latest version"
                            className="text-success border-success/50 hover:bg-success/10"
                        >
                            <RefreshCw size={14} />
                        </Button>
                    )}

                    {/* Revert button for user-modified shared templates */}
                    {isSharedCopy && template.userModified && !template.hasUpdate && onRevert && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onRevert(template)}
                            title="Revert to shared version"
                        >
                            <RotateCcw size={14} />
                        </Button>
                    )}

                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onEdit(template)}
                        title="Edit template"
                    >
                        <Edit2 size={14} />
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onDuplicate(template)}
                        title="Duplicate template"
                    >
                        <Copy size={14} />
                    </Button>
                    {isAdmin && !isSharedCopy && onShare && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onShare(template)}
                            title="Share template"
                        >
                            <Share2 size={14} />
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(true)}
                        title="Delete template"
                        className="hover:bg-error/20 hover:text-error hover:border-error"
                    >
                        <Trash2 size={14} />
                    </Button>
                </>
            )}
        </div>
    );

    // Mobile layout (stacked)
    if (isMobile) {
        return (
            <div className={`flex flex-col gap-3 p-4 rounded-lg border transition-colors ${template.isDraft
                ? 'bg-accent/5 border-accent/30'
                : 'bg-theme-primary border-theme'
                }`}>
                {/* Row 1: Thumbnail + Name + Badges */}
                <div className="flex items-center gap-3">
                    {/* Thumbnail */}
                    <button
                        onClick={() => onPreview?.(template)}
                        className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden hover:ring-2 hover:ring-accent/50 transition-all cursor-pointer"
                        title="Preview template"
                    >
                        <TemplateThumbnail widgets={template.widgets} />
                    </button>

                    {/* Name + Category */}
                    <div className="flex-1 min-w-0">
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                onBlur={handleNameSave}
                                onKeyDown={handleNameKeyDown}
                                className="w-full px-2 py-1 text-sm bg-theme-secondary border border-theme rounded text-theme-primary focus:border-accent outline-none"
                                autoFocus
                            />
                        ) : (
                            <h3
                                className="font-medium text-theme-primary truncate cursor-pointer hover:text-accent text-sm"
                                onClick={() => {
                                    setEditedName(template.name);
                                    setIsEditing(true);
                                }}
                                title={template.name}
                            >
                                {template.name}
                            </h3>
                        )}
                        {/* Category under name */}
                        {template.categoryName && (
                            <div className="flex items-center gap-1 text-xs text-theme-tertiary mt-0.5 truncate" title={template.categoryName}>
                                <Tag size={10} className="flex-shrink-0" />
                                <span className="truncate">{template.categoryName}</span>
                            </div>
                        )}
                    </div>

                    {/* Badges (centered, stacking) */}
                    <div className="flex-shrink-0">
                        <BadgesSection />
                    </div>
                </div>

                {/* Row 2: Action buttons */}
                <ActionsSection />
            </div>
        );
    }

    // Desktop layout (row)
    return (
        <div className={`flex items-center gap-4 p-4 rounded-lg border transition-colors group ${template.isDraft
            ? 'bg-accent/5 border-accent/30 hover:border-accent/60'
            : 'bg-theme-primary border-theme hover:border-accent/50'
            }`}>
            {/* Thumbnail - clickable to preview */}
            <button
                onClick={() => onPreview?.(template)}
                className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden hover:ring-2 hover:ring-accent/50 transition-all cursor-pointer"
                title="Preview template"
            >
                <TemplateThumbnail widgets={template.widgets} />
            </button>

            {/* Info */}
            <div className="flex-1 min-w-0">
                {/* Name */}
                {isEditing ? (
                    <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onBlur={handleNameSave}
                        onKeyDown={handleNameKeyDown}
                        className="w-full px-2 py-1 text-sm bg-theme-secondary border border-theme rounded text-theme-primary focus:border-accent outline-none"
                        autoFocus
                    />
                ) : (
                    <h3
                        className="font-medium text-theme-primary group-hover:text-accent transition-colors cursor-pointer truncate"
                        onClick={() => {
                            setEditedName(template.name);
                            setIsEditing(true);
                        }}
                    >
                        {template.name}
                    </h3>
                )}

                {/* Category under name */}
                {template.categoryName && (
                    <div className="flex items-center gap-1 text-xs text-theme-tertiary mt-0.5 truncate" title={template.categoryName}>
                        <Tag size={10} className="flex-shrink-0" />
                        <span className="truncate">{template.categoryName}</span>
                    </div>
                )}

                {/* Description */}
                {template.description && (
                    <p className="text-xs text-theme-tertiary line-clamp-1">
                        {template.description}
                    </p>
                )}
            </div>

            {/* Badges */}
            <div className="flex-shrink-0">
                <BadgesSection />
            </div>

            {/* Actions */}
            <div className="flex-shrink-0">
                <ActionsSection />
            </div>
        </div>
    );
};

export default TemplateCard;
