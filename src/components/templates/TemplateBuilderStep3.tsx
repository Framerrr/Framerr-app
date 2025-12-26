/**
 * TemplateBuilderStep3 - Review and save screen
 * 
 * Displays:
 * - Live grid preview with mock widgets
 * - Template info (name, category, description, widget count)
 * 
 * Actions:
 * - Cancel
 * - Save
 * - Save & Apply
 * - Save & Share (admin only)
 */

import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { Save, Play, Share2 } from 'lucide-react';
import { Button } from '../common/Button';
import { getWidgetIcon, WIDGET_TYPES } from '../../utils/widgetRegistry';
import { getMockWidget } from './MockWidgets';
import type { TemplateData } from './TemplateBuilder';
import logger from '../../utils/logger';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Grid configuration for preview
const GRID_COLS = { lg: 24 };
const ROW_HEIGHT = 30; // Smaller for preview
const BREAKPOINTS = { lg: 0 };

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

    // Convert template widgets to grid layouts
    const layouts = useMemo(() => {
        const lgLayout: Layout[] = data.widgets.map((widget, index) => ({
            i: `widget-${index}`,
            x: widget.layout.x,
            y: widget.layout.y,
            w: widget.layout.w,
            h: widget.layout.h,
        }));
        return { lg: lgLayout };
    }, [data.widgets]);

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
                isDefault: data.isDefault || false, // Include isDefault in the request
            });

            const savedTemplate = response.data.template;

            // Handle default template setting/clearing
            if (data.isDefault) {
                // Set as default
                try {
                    await axios.post(`/api/templates/${savedTemplate.id}/set-default`);
                    logger.info('Template set as default for new users', { templateId: savedTemplate.id });
                } catch (defaultError) {
                    logger.error('Failed to set template as default:', { error: defaultError });
                }
            } else if (data.id) {
                // Only clear default for existing templates (not new ones)
                // The PUT endpoint with isDefault: false will handle DB update
                logger.debug('Template isDefault set to false', { templateId: savedTemplate.id });
            }

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
            {/* Live Grid Preview */}
            <div className="rounded-lg border border-theme bg-theme-tertiary overflow-hidden">
                <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                    {data.widgets.length === 0 ? (
                        <div className="flex items-center justify-center h-[150px] text-theme-tertiary">
                            <p className="text-sm">No widgets added</p>
                        </div>
                    ) : (
                        <div className="p-2">
                            <ResponsiveGridLayout
                                layouts={layouts}
                                breakpoints={BREAKPOINTS}
                                cols={GRID_COLS}
                                rowHeight={ROW_HEIGHT}
                                isDraggable={false}
                                isResizable={false}
                                margin={[6, 6]}
                                containerPadding={[8, 8]}
                                compactType="vertical"
                            >
                                {data.widgets.map((widget, index) => {
                                    const Icon = getWidgetIcon(widget.type);
                                    const metadata = WIDGET_TYPES[widget.type];
                                    const MockWidget = getMockWidget(widget.type);

                                    return (
                                        <div
                                            key={`widget-${index}`}
                                            className="glass-subtle rounded-lg border border-theme overflow-hidden flex flex-col"
                                        >
                                            <div className="flex items-center gap-2 p-1.5 border-b border-theme bg-theme-secondary/50">
                                                <Icon size={12} className="text-accent" />
                                                <span className="text-xs font-medium text-theme-primary truncate">
                                                    {metadata?.name || widget.type}
                                                </span>
                                            </div>
                                            <div className="flex-1 overflow-hidden p-1.5">
                                                <MockWidget />
                                            </div>
                                        </div>
                                    );
                                })}
                            </ResponsiveGridLayout>
                        </div>
                    )}
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

