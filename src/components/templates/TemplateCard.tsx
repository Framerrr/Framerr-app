/**
 * TemplateCard - Individual template display card
 * 
 * Displays template info with actions: Apply, Edit, Duplicate, Delete
 */

import React, { useState } from 'react';
import { Edit2, Copy, Trash2, Play, Check, X, Clock, Share2, Star, AlertTriangle } from 'lucide-react';
import { Button } from '../common/Button';

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
    createdAt: string;
    updatedAt: string;
}

interface TemplateCardProps {
    template: Template;
    onApply: (template: Template) => void;
    onEdit: (template: Template) => void;
    onDuplicate: (template: Template) => void;
    onDelete: (template: Template) => void;
    onNameChange: (template: Template, newName: string) => void;
    isAdmin?: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
    template,
    onApply,
    onEdit,
    onDuplicate,
    onDelete,
    onNameChange,
    isAdmin = false,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(template.name);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

    return (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-theme-primary border border-theme hover:border-accent/50 transition-colors group">
            {/* Thumbnail placeholder */}
            <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-theme-tertiary border border-theme flex items-center justify-center overflow-hidden">
                <div className="text-xs text-theme-tertiary text-center p-2">
                    {template.widgets.length} widget{template.widgets.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                {/* Name - inline editable */}
                <div className="flex items-center gap-2 mb-1">
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            onBlur={handleNameSave}
                            onKeyDown={handleNameKeyDown}
                            className="bg-theme-secondary border border-accent rounded px-2 py-1 text-theme-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent"
                            autoFocus
                        />
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="text-theme-primary font-medium hover:text-accent transition-colors truncate text-left"
                        >
                            {template.name}
                        </button>
                    )}
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                    {template.isDraft && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/20 text-warning text-xs">
                            <Edit2 size={10} />
                            Draft
                        </span>
                    )}
                    {template.sharedBy && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info/20 text-info text-xs">
                            <Share2 size={10} />
                            Shared by @{template.sharedBy}
                        </span>
                    )}
                    {template.isDefault && isAdmin && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/20 text-accent text-xs">
                            <Star size={10} />
                            Default
                        </span>
                    )}
                    {template.hasUpdate && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/20 text-success text-xs">
                            <Clock size={10} />
                            Updated
                        </span>
                    )}
                    {template.categoryName && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs">
                            {template.categoryName}
                        </span>
                    )}
                </div>

                {/* Description */}
                {template.description && (
                    <p className="text-xs text-theme-tertiary line-clamp-1">
                        {template.description}
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 flex items-center gap-2">
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
        </div>
    );
};

export default TemplateCard;
