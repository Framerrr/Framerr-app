/**
 * TemplateBuilderStep1 - Setup form for template metadata
 * 
 * Fields:
 * - Template Name (required)
 * - Category (required, with admin creation)
 * - Description (optional)
 * - Default for New Users (admin only)
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Star } from 'lucide-react';
import type { TemplateData } from './TemplateBuilder';
import logger from '../../utils/logger';

interface Category {
    id: string;
    name: string;
}

interface Step1Props {
    data: TemplateData;
    onChange: (updates: Partial<TemplateData>) => void;
    isAdmin?: boolean;
}

const TemplateBuilderStep1: React.FC<Step1Props> = ({
    data,
    onChange,
    isAdmin = false,
}) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);

    // Load categories
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const response = await axios.get<{ categories: Category[] }>('/api/templates/categories');
                setCategories(response.data.categories || []);
            } catch (error) {
                logger.error('Failed to load categories:', { error });
            } finally {
                setLoading(false);
            }
        };
        loadCategories();
    }, []);

    // Create new category
    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;

        setCreatingCategory(true);
        try {
            const response = await axios.post<{ category: Category }>('/api/templates/categories', {
                name: newCategoryName.trim(),
            });
            const newCategory = response.data.category;
            setCategories(prev => [...prev, newCategory]);
            onChange({ categoryId: newCategory.id });
            setNewCategoryName('');
            setIsCreatingCategory(false);
        } catch (error) {
            logger.error('Failed to create category:', { error });
        } finally {
            setCreatingCategory(false);
        }
    };

    return (
        <div className="space-y-6 max-w-lg mx-auto">
            {/* Template Name */}
            <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">
                    Template Name <span className="text-error">*</span>
                </label>
                <input
                    type="text"
                    value={data.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    placeholder="My Dashboard Template"
                    className="w-full px-4 py-3 rounded-lg bg-theme-primary border border-theme
                               text-theme-primary placeholder:text-theme-tertiary
                               focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                               transition-colors"
                    autoFocus
                />
            </div>

            {/* Category */}
            <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">
                    Category <span className="text-error">*</span>
                </label>

                {loading ? (
                    <div className="w-full px-4 py-3 rounded-lg bg-theme-primary border border-theme text-theme-tertiary">
                        Loading categories...
                    </div>
                ) : isCreatingCategory ? (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="New category name"
                            className="flex-1 px-4 py-3 rounded-lg bg-theme-primary border border-theme
                                       text-theme-primary placeholder:text-theme-tertiary
                                       focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreateCategory();
                                if (e.key === 'Escape') setIsCreatingCategory(false);
                            }}
                        />
                        <button
                            onClick={handleCreateCategory}
                            disabled={!newCategoryName.trim() || creatingCategory}
                            className="px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 
                                       disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        >
                            {creatingCategory ? '...' : 'Add'}
                        </button>
                        <button
                            onClick={() => setIsCreatingCategory(false)}
                            className="px-4 py-2 bg-theme-tertiary text-theme-primary rounded-lg 
                                       hover:bg-theme-hover transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <select
                        value={data.categoryId || ''}
                        onChange={(e) => {
                            if (e.target.value === '__new__') {
                                setIsCreatingCategory(true);
                            } else {
                                onChange({ categoryId: e.target.value || null });
                            }
                        }}
                        className="w-full px-4 py-3 rounded-lg bg-theme-primary border border-theme
                                   text-theme-primary focus:outline-none focus:ring-2 focus:ring-accent 
                                   focus:border-transparent appearance-none cursor-pointer transition-colors"
                    >
                        <option value="">None</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                        {isAdmin && (
                            <>
                                <option disabled>───────────</option>
                                <option value="__new__">+ New Category...</option>
                            </>
                        )}
                    </select>
                )}
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">
                    Description <span className="text-theme-tertiary">(optional)</span>
                </label>
                <textarea
                    value={data.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    placeholder="A brief description of what this template is for..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg bg-theme-primary border border-theme
                               text-theme-primary placeholder:text-theme-tertiary
                               focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                               resize-none transition-colors"
                />
            </div>

            {/* Default for New Users - Admin only */}
            {isAdmin && (
                <div className="pt-4 border-t border-theme">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={data.isDefault || false}
                                onChange={(e) => onChange({ isDefault: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className={`w-5 h-5 rounded border-2 bg-theme-primary 
                                            transition-colors flex items-center justify-center
                                            ${data.isDefault
                                    ? 'bg-accent border-accent'
                                    : 'border-theme hover:border-accent'}`}>
                                {data.isDefault && <Star size={12} className="text-white" />}
                            </div>
                        </div>
                        <div className="flex-1">
                            <span className="font-medium text-theme-primary group-hover:text-accent transition-colors">
                                Set as default for new users
                            </span>
                            <p className="text-sm text-theme-tertiary">
                                New users will start with this template applied
                            </p>
                        </div>
                    </label>
                </div>
            )}
        </div>
    );
};

export default TemplateBuilderStep1;
