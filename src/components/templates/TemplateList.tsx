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
import { Layout, RefreshCw, AlertCircle } from 'lucide-react';
import axios from 'axios';
import TemplateCard, { Template } from './TemplateCard';
import { Button } from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import logger from '../../utils/logger';
import { useNotifications } from '../../context/NotificationContext';

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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [applyingId, setApplyingId] = useState<string | null>(null);
    const { success, error: showError } = useNotifications();

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

    // Sort: Drafts first, then by name
    const sortedTemplates = [...enrichedTemplates].sort((a, b) => {
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

    if (sortedTemplates.length === 0) {
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
        <div className="space-y-3">
            {sortedTemplates.map(template => (
                <TemplateCard
                    key={template.id}
                    template={template}
                    onApply={handleApply}
                    onEdit={onEdit}
                    onDuplicate={onDuplicate}
                    onDelete={handleDelete}
                    onNameChange={handleNameChange}
                    isAdmin={isAdmin}
                />
            ))}
        </div>
    );
};

export default TemplateList;
