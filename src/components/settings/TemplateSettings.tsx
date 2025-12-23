/**
 * TemplateSettings - Templates section in Settings
 * 
 * Provides entry points to the Template Builder:
 * - Create New Template (empty)
 * - Save Current Dashboard as Template
 */

import React, { useState } from 'react';
import { Plus, Save, Layout } from 'lucide-react';
import { Button } from '../common/Button';
import TemplateBuilder from '../templates/TemplateBuilder';
import { useLayout } from '../../context/LayoutContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import logger from '../../utils/logger';

interface TemplateSettingsProps {
    className?: string;
}

interface WidgetData {
    i: string;
    type: string;
    layouts?: {
        lg?: { x: number; y: number; w: number; h: number };
    };
}

const TemplateSettings: React.FC<TemplateSettingsProps> = ({ className = '' }) => {
    const { user } = useAuth();
    const isAdmin = user?.group === 'admin';

    const [showBuilder, setShowBuilder] = useState(false);
    const [builderMode, setBuilderMode] = useState<'create' | 'save-current'>('create');
    const [currentWidgets, setCurrentWidgets] = useState<WidgetData[]>([]);

    // Open builder in create mode (empty template)
    const handleCreateNew = () => {
        setBuilderMode('create');
        setCurrentWidgets([]);
        setShowBuilder(true);
    };

    // Open builder in save-current mode (with current dashboard widgets)
    const handleSaveCurrent = async () => {
        try {
            // Fetch current dashboard widgets
            const response = await axios.get<{ widgets: WidgetData[] }>('/api/widgets');
            const widgets = response.data.widgets || [];

            // Convert to template widget format
            const templateWidgets = widgets.map(w => ({
                type: w.type,
                layout: w.layouts?.lg || { x: 0, y: 0, w: 2, h: 2 },
            }));

            setBuilderMode('save-current');
            setCurrentWidgets(widgets);
            setShowBuilder(true);
        } catch (error) {
            logger.error('Failed to get current widgets:', { error });
        }
    };

    const handleBuilderClose = () => {
        setShowBuilder(false);
    };

    const handleTemplateSaved = () => {
        // Could add a toast notification here
        logger.info('Template saved successfully');
    };

    return (
        <div className={`rounded-xl p-6 border border-theme bg-theme-secondary ${className}`}>
            <div className="flex items-center gap-3 mb-4">
                <Layout size={20} className="text-accent" />
                <h3 className="text-lg font-semibold text-theme-primary">Templates</h3>
            </div>

            <p className="text-sm text-theme-secondary mb-6">
                Create and save dashboard layouts as reusable templates.
            </p>

            <div className="space-y-3">
                {/* Create New Template */}
                <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-theme-primary border border-theme">
                    <div>
                        <div className="font-medium text-theme-primary">Create New Template</div>
                        <div className="text-sm text-theme-secondary">
                            Build a new template from scratch
                        </div>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={handleCreateNew}
                        className="flex items-center gap-2 whitespace-nowrap"
                    >
                        <Plus size={16} />
                        Create
                    </Button>
                </div>

                {/* Save Current Dashboard */}
                <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-theme-primary border border-theme">
                    <div>
                        <div className="font-medium text-theme-primary">Save Current Dashboard</div>
                        <div className="text-sm text-theme-secondary">
                            Save your current layout as a template
                        </div>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={handleSaveCurrent}
                        className="flex items-center gap-2 whitespace-nowrap"
                    >
                        <Save size={16} />
                        Save
                    </Button>
                </div>
            </div>

            {/* Template Builder Modal */}
            <TemplateBuilder
                isOpen={showBuilder}
                onClose={handleBuilderClose}
                mode={builderMode}
                initialData={
                    builderMode === 'save-current'
                        ? {
                            widgets: currentWidgets.map(w => ({
                                type: w.type,
                                layout: w.layouts?.lg || { x: 0, y: 0, w: 2, h: 2 },
                            }))
                        }
                        : undefined
                }
                onSave={handleTemplateSaved}
                isAdmin={isAdmin}
            />
        </div>
    );
};

export default TemplateSettings;
