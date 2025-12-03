import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Save, GripVertical } from 'lucide-react';
import * as Icons from 'lucide-react';
import IconPicker from '../IconPicker';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import logger from '../../utils/logger';

// Sortable Tab Item Component
const SortableTabItem = ({ tab, onEdit, onDelete, getIconComponent }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: tab.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="glass-subtle rounded-xl shadow-medium p-6 border border-slate-700/50 flex items-center justify-between card-glow"
        >
            {/* Drag Handle */}
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 transition-colors mr-3 touch-none"
                title="Drag to reorder"
            >
                <GripVertical size={20} />
            </button>

            {/* Tab Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-shrink-0">
                    {getIconComponent(tab.icon)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-medium text-white">{tab.name}</span>
                        <span className="text-xs text-slate-500 font-mono">/{tab.slug}</span>
                        {!tab.enabled && (
                            <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded">
                                Disabled
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1 truncate">{tab.url}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-shrink-0">
                <button
                    onClick={() => onEdit(tab)}
                    className="button-elevated px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-sm flex items-center gap-1 transition-all"
                    title="Edit tab"
                >
                    <Edit size={14} />
                    <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                    onClick={() => onDelete(tab.id, tab.name)}
                    className="button-elevated px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm flex items-center gap-1 transition-all"
                    title="Delete tab"
                >
                    <Trash2 size={14} />
                    <span className="hidden sm:inline">Delete</span>
                </button>
            </div>
        </div>
    );
};

const UserTabsSettings = () => {
    const [tabs, setTabs] = useState([]);
    const [tabGroups, setTabGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedTab, setSelectedTab] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        icon: 'Server',
        groupId: '',
        enabled: true
    });

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchTabs();
        fetchTabGroups();
    }, []);

    const fetchTabs = async () => {
        try {
            const response = await fetch('/api/tabs', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setTabs(data.tabs || []);
            }
        } catch (error) {
            logger.error('Error fetching tabs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTabGroups = async () => {
        try {
            const response = await fetch('/api/config/system', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setTabGroups(data.tabGroups || []);
            }
        } catch (error) {
            logger.error('Error fetching tab groups:', error);
        }
    };

    const handleAdd = () => {
        setModalMode('create');
        setSelectedTab(null);
        setFormData({
            name: '',
            url: '',
            icon: 'Server',
            groupId: '',
            enabled: true
        });
        setShowModal(true);
    };

    const handleEdit = (tab) => {
        setModalMode('edit');
        setSelectedTab(tab);
        setFormData({
            name: tab.name,
            url: tab.url,
            icon: tab.icon || 'Server',
            groupId: tab.groupId || '',
            enabled: tab.enabled !== false
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const url = modalMode === 'create'
            ? '/api/tabs'
            : `/api/tabs/${selectedTab.id}`;

        const method = modalMode === 'create' ? 'POST' : 'PUT';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setShowModal(false);
                fetchTabs();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to save tab');
            }
        } catch (error) {
            logger.error('Error saving tab:', error);
            alert('Failed to save tab');
        }
    };

    const handleDelete = async (tabId, tabName) => {
        if (!confirm(`Are you sure you want to delete tab "${tabName}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/tabs/${tabId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                fetchTabs();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to delete tab');
            }
        } catch (error) {
            logger.error('Error deleting tab:', error);
            alert('Failed to delete tab');
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = tabs.findIndex(t => t.id === active.id);
        const newIndex = tabs.findIndex(t => t.id === over.id);

        const newTabs = arrayMove(tabs, oldIndex, newIndex);
        setTabs(newTabs); // Optimistic update

        // Persist to server
        try {
            const orderedIds = newTabs.map(t => t.id);
            await fetch('/api/tabs/reorder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ orderedIds })
            });
        } catch (error) {
            logger.error('Error reordering tabs:', error);
            fetchTabs(); // Revert on error
        }
    };

    const getIconComponent = (iconName) => {
        const IconComponent = Icons[iconName] || Icons.Server;
        return <IconComponent size={20} className="text-accent" />;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-slate-400">Loading tabs...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            {/* Header */}
            <div className="mb-6 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white">My Tabs</h2>
                <p className="text-slate-400 text-sm">
                    Manage your personal sidebar tabs - only you can see these
                </p>
            </div>
            <div className="mb-6 flex justify-center">
                <button
                    onClick={handleAdd}
                    className="button-elevated flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg transition-all font-medium"
                    title="Add new tab"
                >
                    <Plus size={18} />
                    <span className="hidden sm:inline">Add Tab</span>
                </button>
            </div>

            {/* Info Box */}
            <div className="mb-6 p-6 bg-accent/10 border border-accent/30 rounded-xl glass-subtle">
                <p className="text-sm text-accent">
                    Personal tabs are iframe pages that only you can see in your sidebar. Create tabs for services, tools, or dashboards you frequently access.
                </p>
            </div>

            {/* Tabs List */}
            {tabs.length === 0 ? (
                <div className="glass-subtle rounded-xl shadow-deep p-8 text-center border border-slate-700">
                    <p className="text-slate-400">No tabs yet. Add your first tab to get started!</p>
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={tabs.map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-3">
                            {tabs.map((tab) => (
                                <SortableTabItem
                                    key={tab.id}
                                    tab={tab}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    getIconComponent={getIconComponent}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            {/* Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                        <div className="glass-card rounded-xl shadow-deep max-w-2xl w-full border border-slate-700">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                                <h3 className="text-xl font-bold text-white">
                                    {modalMode === 'create' ? 'Add New Tab' : 'Edit Tab'}
                                </h3>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-slate-400 hover:text-white transition-colors"
                                    title="Close"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Modal Form */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block mb-2 font-medium text-slate-300 text-sm">
                                        Tab Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        className="input-glow w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent transition-colors"
                                        placeholder="e.g., Radarr"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Appears in sidebar (URL slug auto-generated)
                                    </p>
                                </div>

                                <div>
                                    <label className="block mb-2 font-medium text-slate-300 text-sm">
                                        URL
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.url}
                                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                        required
                                        className="input-glow w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent transition-colors"
                                        placeholder="http://example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-2 font-medium text-slate-300 text-sm">
                                        Icon
                                    </label>
                                    <IconPicker
                                        value={formData.icon}
                                        onChange={(icon) => setFormData({ ...formData, icon })}
                                    />
                                </div>

                                <div>
                                    <label className="block mb-2 font-medium text-slate-300 text-sm">
                                        Group (Optional)
                                    </label>
                                    <select
                                        value={formData.groupId}
                                        onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                                        className="input-glow w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
                                    >
                                        <option value="">No Group</option>
                                        {tabGroups.map(group => (
                                            <option key={group.id} value={group.id}>
                                                {group.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Organize tabs into groups in the sidebar
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="enabled"
                                        checked={formData.enabled}
                                        onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                                        className="w-4 h-4 rounded border-slate-600 text-accent focus:ring-accent"
                                    />
                                    <label htmlFor="enabled" className="text-sm text-slate-300">
                                        Enabled (tab visible in sidebar)
                                    </label>
                                </div>

                                {/* Modal Actions */}
                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="button-elevated px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg flex items-center gap-2 transition-all"
                                    >
                                        <Save size={18} />
                                        {modalMode === 'create' ? 'Create Tab' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default UserTabsSettings;
