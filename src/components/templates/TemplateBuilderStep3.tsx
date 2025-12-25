/**
 * TemplateBuilderStep3 - Review and save screen
 * 
 * Displays:
 * - Thumbnail preview (placeholder for now)
 * - Template info (name, category, description, widget count)
 * 
 * Actions:
 * - Cancel
 * - Save
 * - Save & Apply
 * - Save & Share (admin only)
 */

import React, { useState } from 'react';
import axios from 'axios';
import { Save, Play, Share2, LayoutGrid } from 'lucide-react';
import { Button } from '../common/Button';
import type { TemplateData } from './TemplateBuilder';
import logger from '../../utils/logger';

interface Step3Props {
    data: TemplateData;
    onSave?: (template: TemplateData) => void;
    onShare?: (template: TemplateData & { id: string }) => void;
    onClose: () => void;
    isAdmin?: boolean;
}

const TemplateBuilderStep3: React.FC<Step3Props> = ({
    data,
    onSave,
    onShare,
    onClose,
    isAdmin = false,
}) => {
    const [saving, setSaving] = useState(false);
    const [saveAction, setSaveAction] = useState<'save' | 'apply' | 'share' | null>(null);

    // Get unique widget types for display
    const getWidgetTypes = () => {
        const types = new Set(data.widgets.map(w => w.type));
        return Array.from(types);
    };

    const widgetTypes = getWidgetTypes();

    // Save template
    const handleSave = async (action: 'save' | 'apply' | 'share') => {
        setSaving(true);
        setSaveAction(action);

        try {
            // Create or update template
            const endpoint = data.id ? `/api/templates/${data.id}` : '/api/templates';
            const method = data.id ? 'put' : 'post';

            const response = await axios[method]<{ template: TemplateData & { id: string } }>(endpoint, {
                name: data.name,
                description: data.description || undefined,
                categoryId: data.categoryId, // Send null explicitly to clear category
                widgets: data.widgets,
                isDraft: false,
            });

            const savedTemplate = response.data.template;

            // Handle action-specific logic
            if (action === 'apply') {
                // Apply template to dashboard
                await axios.post(`/api/templates/${savedTemplate.id}/apply`);
                window.dispatchEvent(new CustomEvent('widgets-added'));
            }

            // Call onSave callback if provided
            if (onSave) {
                onSave(savedTemplate);
            }

            // For share action, close builder and trigger share modal
            if (action === 'share' && onShare) {
                onClose();
                onShare(savedTemplate);
                return; // Don't close again below
            }

            // Close builder
            onClose();

        } catch (error) {
            logger.error('Failed to save template:', { error, action });
        } finally {
            setSaving(false);
            setSaveAction(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Thumbnail Preview Placeholder */}
            <div className="rounded-lg border border-theme bg-theme-tertiary p-8 flex items-center justify-center min-h-[200px]">
                <div className="text-center text-theme-secondary">
                    <LayoutGrid size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Template Preview</p>
                    <p className="text-xs text-theme-tertiary">
                        {data.widgets.length === 0
                            ? 'No widgets added yet'
                            : `${data.widgets.length} widget${data.widgets.length !== 1 ? 's' : ''}`
                        }
                    </p>
                </div>
            </div>

            {/* Template Info */}
            <div className="space-y-3 p-4 rounded-lg bg-theme-secondary border border-theme">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-sm text-theme-tertiary">Name</div>
                        <div className="font-medium text-theme-primary">{data.name || 'Untitled'}</div>
                    </div>
                </div>

                {data.description && (
                    <div>
                        <div className="text-sm text-theme-tertiary">Description</div>
                        <div className="text-theme-secondary text-sm">{data.description}</div>
                    </div>
                )}

                <div className="flex gap-6">
                    <div>
                        <div className="text-sm text-theme-tertiary">Category</div>
                        <div className="text-theme-primary">
                            {data.categoryId ? 'Custom' : 'None'}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-theme-tertiary">Widgets</div>
                        <div className="text-theme-primary">
                            {data.widgets.length === 0
                                ? 'None'
                                : widgetTypes.length <= 3
                                    ? widgetTypes.join(', ')
                                    : `${widgetTypes.slice(0, 3).join(', ')} +${widgetTypes.length - 3} more`
                            }
                            {data.widgets.length > 0 && ` (${data.widgets.length} total)`}
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-theme">
                <Button
                    variant="secondary"
                    onClick={onClose}
                    disabled={saving}
                >
                    Cancel
                </Button>

                <div className="flex-1" />

                <Button
                    variant="secondary"
                    onClick={() => handleSave('save')}
                    disabled={saving || !data.name.trim()}
                    className="flex items-center gap-2"
                >
                    <Save size={16} />
                    {saving && saveAction === 'save' ? 'Saving...' : 'Save'}
                </Button>

                <Button
                    variant="primary"
                    onClick={() => handleSave('apply')}
                    disabled={saving || !data.name.trim()}
                    className="flex items-center gap-2"
                >
                    <Play size={16} />
                    {saving && saveAction === 'apply' ? 'Applying...' : 'Save & Apply'}
                </Button>

                {isAdmin && (
                    <Button
                        variant="secondary"
                        onClick={() => handleSave('share')}
                        disabled={saving || !data.name.trim()}
                        className="flex items-center gap-2"
                    >
                        <Share2 size={16} />
                        {saving && saveAction === 'share' ? 'Saving...' : 'Save & Share'}
                    </Button>
                )}
            </div>
        </div>
    );
};

export default TemplateBuilderStep3;
