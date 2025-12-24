/**
 * TemplateList - Displays user's templates with management actions
 * 
 * Features:
 * - Fetches templates from API
 * - Apply, Edit, Duplicate, Delete actions
 * - Inline name editing
 * - Empty state
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Layout, RefreshCw, AlertCircle, Filter } from 'lucide-react';
import axios from 'axios';
import TemplateCard, { Template } from './TemplateCard';
import TemplatePreviewModal from './TemplatePreviewModal';
import { Button } from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import logger from '../../utils/logger';
import { useNotifications } from '../../context/NotificationContext';
import { useLayout } from '../../context/LayoutContext';

interface Category {
    id: string;
    name: string;
}

interface TemplateListProps {
    onEdit: (template: Template) => void;
    onDuplicate: (template: Template) => void;
    isAdmin?: boolean;
    refreshTrigger?: number;
}

const TemplateList: React.FC<TemplateListProps> = ({
    onEdit,
    onDuplicate,
    isAdmin = false,
    refreshTrigger = 0,
}) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [applyingId, setApplyingId] = useState<string | null>(null);
    const { success, error: showError } = useNotifications();
    const { isMobile } = useLayout();

    // Fetch templates
    const fetchTemplates = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get<{ templates: Template[]; categories: Category[] }>('/api/templates');
            setTemplates(response.data.templates || []);
            setCategories(response.data.categories || []);
        } catch (err) {
            logger.error('Failed to fetch templates', { error: err });
            setError('Failed to load templates');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates, refreshTrigger]);

    // Apply template
    const handleApply = async (template: Template) => {
        if (!confirm(`Apply "${template.name}" to your dashboard?\n\nYour current dashboard will be backed up and can be restored later.`)) {
            return;
        }

        try {
            setApplyingId(template.id);
            await axios.post(`/api/templates/${template.id}/apply`);
            success('Template Applied', `"${template.name}" has been applied to your dashboard.`);

            // Trigger dashboard reload
            window.dispatchEvent(new CustomEvent('widgets-added'));
        } catch (err) {
            logger.error('Failed to apply template', { error: err });
            showError('Apply Failed', 'Failed to apply template. Please try again.');
        } finally {
            setApplyingId(null);
        }
    };

    // Delete template
    const handleDelete = async (template: Template) => {
        try {
            await axios.delete(`/api/templates/${template.id}`);
            setTemplates(prev => prev.filter(t => t.id !== template.id));
            success('Template Deleted', `"${template.name}" has been deleted.`);
        } catch (err) {
            logger.error('Failed to delete template', { error: err });
            showError('Delete Failed', 'Failed to delete template. Please try again.');
        }
    };

    // Update template name
    const handleNameChange = async (template: Template, newName: string) => {
        try {
            await axios.put(`/api/templates/${template.id}`, { name: newName });
            setTemplates(prev => prev.map(t =>
                t.id === template.id ? { ...t, name: newName } : t
            ));
        } catch (err) {
            logger.error('Failed to update template name', { error: err });
            showError('Update Failed', 'Failed to update template name.');
        }
    };

    // Enrich templates with category names
    const enrichedTemplates = templates.map(t => ({
        ...t,
        categoryName: categories.find(c => c.id === t.categoryId)?.name,
    }));

    // Filter by category
    const filteredTemplates = selectedCategory
        ? enrichedTemplates.filter(t => t.categoryId === selectedCategory)
        : enrichedTemplates;

    // Sort: Drafts first, then by name
    const sortedTemplates = [...filteredTemplates].sort((a, b) => {
        if (a.isDraft && !b.isDraft) return -1;
        if (!a.isDraft && b.isDraft) return 1;
        return a.name.localeCompare(b.name);
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle size={32} className="text-error mb-4" />
                <p className="text-theme-secondary mb-4">{error}</p>
                <Button variant="secondary" onClick={fetchTemplates}>
                    <RefreshCw size={14} />
                    Retry
                </Button>
            </div>
        );
    }
    // Empty state - no templates at all (before filtering)
    if (enrichedTemplates.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <Layout size={32} className="text-theme-tertiary mb-4" />
                <p className="text-theme-secondary mb-2">No templates yet</p>
                <p className="text-sm text-theme-tertiary">
                    Create a new template or save your current dashboard as a template.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Category Filter */}
            {categories.length > 0 && (
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-theme-tertiary" />
                    <select
                        value={selectedCategory || ''}
                        onChange={(e) => setSelectedCategory(e.target.value || null)}
                        className="bg-theme-primary border border-theme rounded-lg px-3 py-2 text-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                    {selectedCategory && (
                        <span className="text-xs text-theme-tertiary">
                            {sortedTemplates.length} template{sortedTemplates.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            )}

            {/* Template Cards */}
            <div className="space-y-3">
                {sortedTemplates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Layout size={24} className="text-theme-tertiary mb-2" />
                        <p className="text-theme-secondary text-sm">No templates in this category</p>
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className="text-accent text-xs mt-2 hover:underline"
                        >
                            Show all templates
                        </button>
                    </div>
                ) : (
                    sortedTemplates.map(template => (
                        <TemplateCard
                            key={template.id}
                            template={template}
                            onApply={handleApply}
                            onEdit={onEdit}
                            onDuplicate={onDuplicate}
                            onDelete={handleDelete}
                            onNameChange={handleNameChange}
                            onPreview={setPreviewTemplate}
                            isAdmin={isAdmin}
                        />
                    ))
                )}
            </div>

            {/* Preview Modal */}
            {previewTemplate && (
                <TemplatePreviewModal
                    template={previewTemplate}
                    isOpen={!!previewTemplate}
                    onClose={() => setPreviewTemplate(null)}
                    onApply={handleApply}
                    onEdit={onEdit}
                    isMobile={isMobile}
                />
            )}
        </div>
    );
};

export default TemplateList;
