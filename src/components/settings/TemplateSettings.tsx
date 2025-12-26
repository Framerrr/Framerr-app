/**
 * TemplateSettings - Templates section in Settings
 * 
 * Features:
 * - Create New Template button
 * - Save Current Dashboard as Template button
 * - Template list with management actions
 * - Revert to previous dashboard (if backup exists)
 */

import React, { useState, useEffect } from 'react';
import { Plus, Save, Layout, RotateCcw } from 'lucide-react';
import { Button } from '../common/Button';
import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import TemplateBuilder from '../templates/TemplateBuilder';
import TemplateList from '../templates/TemplateList';
import TemplateSharingDropdown from '../templates/TemplateSharingDropdown';
import { useLayout } from '../../context/LayoutContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import axios from 'axios';
import logger from '../../utils/logger';
import type { Template } from '../templates/TemplateCard';

interface TemplateSettingsProps {
    className?: string;
}

interface WidgetData {
    i: string;
    type: string;
    layouts?: {
        lg?: { x: number; y: number; w: number; h: number };
    };
    config?: Record<string, unknown>;
}

interface BackupData {
    widgets: WidgetData[];
    mobileLayoutMode: string;
    createdAt: string;
}

const TemplateSettings: React.FC<TemplateSettingsProps> = ({ className = '' }) => {
    const { user } = useAuth();
    const { isMobile } = useLayout();
    const { success, error: showError } = useNotifications();
    const isAdmin = user?.group === 'admin';

    const [showBuilder, setShowBuilder] = useState(false);
    const [builderMode, setBuilderMode] = useState<'create' | 'save-current' | 'edit' | 'duplicate'>('create');
    const [currentWidgets, setCurrentWidgets] = useState<WidgetData[]>([]);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [hasBackup, setHasBackup] = useState(false);
    const [reverting, setReverting] = useState(false);

    // Sharing modal state
    const [sharingTemplate, setSharingTemplate] = useState<Template | null>(null);

    // Revert confirmation dialog state
    const [showRevertConfirm, setShowRevertConfirm] = useState(false);

    // Check for backup on mount and when templates are applied
    useEffect(() => {
        const checkBackup = async () => {
            try {
                const response = await axios.get<{ backup: BackupData | null }>('/api/templates/backup');
                setHasBackup(!!response.data.backup);
            } catch (err) {
                logger.debug('No backup available');
            }
        };
        checkBackup();

        // Re-check backup when widgets are added (template applied triggers this event)
        const handleWidgetsAdded = () => {
            // Small delay to ensure API has finished creating the backup
            setTimeout(checkBackup, 500);
        };

        window.addEventListener('widgets-added', handleWidgetsAdded);
        return () => window.removeEventListener('widgets-added', handleWidgetsAdded);
    }, [refreshTrigger]);

    // Open builder in create mode (empty template)
    const handleCreateNew = () => {
        if (isMobile) {
            showError('Desktop Required', 'Template builder is only available on desktop.');
            return;
        }
        setBuilderMode('create');
        setCurrentWidgets([]);
        setEditingTemplate(null);
        setShowBuilder(true);
    };

    // Open builder in save-current mode (with current dashboard widgets)
    const handleSaveCurrent = async () => {
        if (isMobile) {
            showError('Desktop Required', 'Template builder is only available on desktop.');
            return;
        }
        try {
            // Fetch current dashboard widgets
            const response = await axios.get<{ widgets: WidgetData[] }>('/api/widgets');
            const widgets = response.data.widgets || [];

            setBuilderMode('save-current');
            setCurrentWidgets(widgets);
            setEditingTemplate(null);
            setShowBuilder(true);
        } catch (error) {
            logger.error('Failed to get current widgets:', { error });
            showError('Error', 'Failed to load current dashboard.');
        }
    };

    // Edit existing template
    const handleEdit = (template: Template) => {
        if (isMobile) {
            showError('Desktop Required', 'Template builder is only available on desktop.');
            return;
        }
        setBuilderMode('edit');
        setEditingTemplate(template);
        setShowBuilder(true);
    };

    // Duplicate template (opens builder with copy)
    const handleDuplicate = (template: Template) => {
        if (isMobile) {
            showError('Desktop Required', 'Template builder is only available on desktop.');
            return;
        }
        setBuilderMode('duplicate');
        setEditingTemplate({
            ...template,
            name: `${template.name} (Copy)`,
            id: '', // Clear ID so it creates a new template
        });
        setShowBuilder(true);
    };

    // Revert to previous dashboard - opens confirmation dialog
    const handleRevert = () => {
        setShowRevertConfirm(true);
    };

    // Execute revert after confirmation
    const executeRevert = async () => {
        try {
            setReverting(true);
            await axios.post('/api/templates/revert');
            success('Dashboard Restored', 'Your previous dashboard has been restored.');
            setHasBackup(false);

            // Trigger dashboard reload
            window.dispatchEvent(new CustomEvent('widgets-added'));

            // Close dialog
            setShowRevertConfirm(false);
        } catch (err) {
            logger.error('Failed to revert dashboard:', { error: err });
            showError('Revert Failed', 'Failed to restore previous dashboard.');
        } finally {
            setReverting(false);
        }
    };

    const handleBuilderClose = () => {
        setShowBuilder(false);
        setEditingTemplate(null);
    };

    const handleTemplateSaved = () => {
        setRefreshTrigger(prev => prev + 1);
        success('Template Saved', 'Your template has been saved successfully.');
    };

    // Get initial data for builder based on mode
    const getBuilderInitialData = () => {
        if (builderMode === 'save-current') {
            return {
                widgets: currentWidgets.map(w => ({
                    type: w.type,
                    layout: w.layouts?.lg || { x: 0, y: 0, w: 2, h: 2 },
                    config: w.config, // Preserve widget settings (showHeader, flatten, etc.)
                }))
            };
        }
        if ((builderMode === 'edit' || builderMode === 'duplicate') && editingTemplate) {
            return {
                // Include ID for edit mode so Step3 uses PUT instead of POST
                // For duplicate mode, id is cleared in handleDuplicate
                id: editingTemplate.id || undefined,
                name: editingTemplate.name,
                description: editingTemplate.description,
                categoryId: editingTemplate.categoryId,
                widgets: editingTemplate.widgets,
                isDefault: editingTemplate.isDefault,
            };
        }
        return undefined;
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Actions Section */}
            <div className="rounded-xl p-6 border border-theme bg-theme-secondary">
                <div className="flex items-center gap-3 mb-4">
                    <Layout size={20} className="text-accent" />
                    <h3 className="text-lg font-semibold text-theme-primary">Templates</h3>
                </div>

                <p className="text-sm text-theme-secondary mb-6">
                    Create and save dashboard layouts as reusable templates.
                </p>

                {/* Desktop only: Template creation buttons */}
                {!isMobile && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Create New Template */}
                        <Button
                            variant="secondary"
                            onClick={handleCreateNew}
                            className="flex items-center justify-center gap-2 w-full py-3"
                        >
                            <Plus size={16} />
                            Create New Template
                        </Button>

                        {/* Save Current Dashboard */}
                        <Button
                            variant="secondary"
                            onClick={handleSaveCurrent}
                            className="flex items-center justify-center gap-2 w-full py-3"
                        >
                            <Save size={16} />
                            Save Current Dashboard
                        </Button>
                    </div>
                )}

                {/* Mobile: Show info message instead */}
                {isMobile && (
                    <p className="text-sm text-theme-tertiary italic">
                        Template creation and editing is only available on desktop.
                    </p>
                )}

                {/* Revert Button */}
                {hasBackup && (
                    <div className="mt-4 pt-4 border-t border-theme">
                        <Button
                            variant="secondary"
                            onClick={handleRevert}
                            disabled={reverting}
                            className="flex items-center gap-2 w-full justify-center"
                        >
                            <RotateCcw size={16} className={reverting ? 'animate-spin' : ''} />
                            {reverting ? 'Reverting...' : 'Revert to Previous Dashboard'}
                        </Button>
                        <p className="text-xs text-theme-tertiary text-center mt-2">
                            Restore the dashboard you had before applying a template.
                        </p>
                    </div>
                )}
            </div>

            {/* Template List Section */}
            <div className="rounded-xl p-6 border border-theme bg-theme-secondary">
                <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-lg font-semibold text-theme-primary">Your Templates</h3>
                </div>

                <TemplateList
                    onEdit={handleEdit}
                    onDuplicate={handleDuplicate}
                    onShare={isAdmin ? setSharingTemplate : undefined}
                    isAdmin={isAdmin}
                    refreshTrigger={refreshTrigger}
                />
            </div>

            {/* Template Builder Modal */}
            <TemplateBuilder
                isOpen={showBuilder}
                onClose={handleBuilderClose}
                mode={builderMode === 'edit' ? 'edit' : builderMode === 'duplicate' ? 'create' : builderMode}
                initialData={getBuilderInitialData()}
                editingTemplateId={builderMode === 'edit' ? editingTemplate?.id : undefined}
                onSave={handleTemplateSaved}
                onShare={isAdmin ? (template) => {
                    // After saving, open share modal with the saved template
                    setSharingTemplate(template as Template);
                } : undefined}
                onDraftSaved={() => setRefreshTrigger(prev => prev + 1)}
                isAdmin={isAdmin}
            />

            {/* Share Template Modal */}
            <Modal
                isOpen={!!sharingTemplate}
                onClose={() => setSharingTemplate(null)}
                title={`Share "${sharingTemplate?.name || 'Template'}"`}
                size="sm"
            >
                {sharingTemplate && (
                    <div className="space-y-4">
                        <p className="text-sm text-theme-secondary">
                            Choose who can access this template.
                        </p>
                        <TemplateSharingDropdown
                            templateId={sharingTemplate.id}
                            templateName={sharingTemplate.name}
                            onShareComplete={() => {
                                setSharingTemplate(null);
                                setRefreshTrigger(prev => prev + 1);
                                success('Template Shared', `"${sharingTemplate.name}" sharing settings updated.`);
                            }}
                        />
                    </div>
                )}
            </Modal>

            {/* Revert Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showRevertConfirm}
                onClose={() => setShowRevertConfirm(false)}
                onConfirm={executeRevert}
                title="Revert Dashboard"
                message="Revert to your previous dashboard?\n\nThis will restore the dashboard you had before applying a template."
                confirmLabel="Revert"
                variant="danger"
                isLoading={reverting}
            />
        </div>
    );
};

export default TemplateSettings;
