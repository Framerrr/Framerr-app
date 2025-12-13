import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Save, GripVertical, Loader, Check } from 'lucide-react';
import * as Icons from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import IconPicker from '../IconPicker';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
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
import { useNotifications } from '../../context/NotificationContext';

// Sortable Tab Item Component
const SortableTabItem = ({ tab, onEdit, onDelete, getIconComponent, confirmDeleteId, setConfirmDeleteId }) => {
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
        transition: isDragging ? 'none' : transition,  // No transition while dragging
        opacity: isDragging ? 0.5 : 1,
        willChange: isDragging ? 'transform' : 'auto'
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="glass-subtle rounded-xl shadow-medium p-6 border border-theme flex items-center justify-between card-glow"
        >
            {/* Drag Handle */}
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-theme-tertiary hover:text-theme-primary transition-colors mr-3"
                style={{
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    WebkitTouchCallout: 'none'
                }}
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
                        <span className="font-medium text-theme-primary">{tab.name}</span>
                        <span className="text-xs text-theme-tertiary font-mono">/{tab.slug}</span>
                        {!tab.enabled && (
                            <span className="text-xs px-2 py-0.5 bg-theme-tertiary text-theme-secondary rounded">
                                Disabled
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-theme-secondary mt-1 truncate">{tab.url}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-shrink-0">
                <Button
                    onClick={() => onEdit(tab)}
                    variant="ghost"
                    size="sm"
                    className="text-accent hover:bg-accent/10"
                    title="Edit tab"
                >
                    <Edit size={14} className="mr-1" />
                    <span className="hidden sm:inline">Edit</span>
                </Button>
                {confirmDeleteId !== tab.id ? (
                    <Button
                        onClick={() => setConfirmDeleteId(tab.id)}
                        variant="ghost"
                        size="sm"
                        className="text-error hover:bg-error/10"
                        title="Delete tab"
                    >
                        <Trash2 size={14} className="mr-1" />
                        <span className="hidden sm:inline">Delete</span>
                    </Button>
                ) : (
                    <div className="flex gap-1">
                        <Button
                            onClick={() => onDelete(tab.id, tab.name)}
                            variant="danger"
                            size="sm"
                            title="Confirm delete"
                        >
                            <Check size={14} />
                        </Button>
                        <Button
                            onClick={() => setConfirmDeleteId(null)}
                            variant="secondary"
                            size="sm"
                            title="Cancel"
                        >
                            <X size={14} />
                        </Button>
                    </div>
                )}
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
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const { error: showError, success: showSuccess } = useNotifications();

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
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 150,       // 150ms hold for smoother response
                tolerance: 5      // Tighter tolerance for less jitter
            }
        }),
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
                // Notify sidebar to update
                window.dispatchEvent(new Event('tabsUpdated'));
                showSuccess(
                    modalMode === 'create' ? 'Tab Created' : 'Tab Updated',
                    `Tab "${formData.name}" ${modalMode === 'create' ? 'created' : 'updated'} successfully`
                );
            } else {
                const error = await response.json();
                showError('Save Failed', error.error || 'Failed to save tab');
            }
        } catch (error) {
            logger.error('Error saving tab:', error);
            showError('Save Failed', 'Failed to save tab');
        }
    };

    const handleDelete = async (tabId, tabName) => {
        try {
            const response = await fetch(`/api/tabs/${tabId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                setConfirmDeleteId(null);
                fetchTabs();
                // Notify sidebar to update
                window.dispatchEvent(new Event('tabsUpdated'));
                showSuccess('Tab Deleted', `Tab "${tabName}" has been deleted`);
            } else {
                const error = await response.json();
                showError('Delete Failed', error.error || 'Failed to delete tab');
                setConfirmDeleteId(null);
            }
        } catch (error) {
            logger.error('Error deleting tab:', error);
            showError('Delete Failed', 'Failed to delete tab');
            setConfirmDeleteId(null);
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
            const response = await fetch('/api/tabs/reorder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ orderedIds })
            });

            if (response.ok) {
                // Notify sidebar to update
                window.dispatchEvent(new Event('tabsUpdated'));
            }
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
                <div className="text-theme-secondary">Loading tabs...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            {/* Header */}
            <div className="mb-6 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-theme-primary">My Tabs</h2>
                <p className="text-theme-secondary text-sm">
                    Manage your personal sidebar tabs - only you can see these
                </p>
            </div>

            <div className="mb-6 flex justify-center">
                <Button
                    onClick={handleAdd}
                    title="Add new tab"
                    icon={Plus}
                >
                    <span className="hidden sm:inline">Add Tab</span>
                </Button>
            </div>

            {/* Info Box */}
            <div className="mb-6 p-6 bg-accent/10 border border-accent/20 rounded-xl glass-subtle">
                <p className="text-sm text-accent">
                    Personal tabs are iframe pages that only you can see in your sidebar. Create tabs for services, tools, or dashboards you frequently access.
                </p>
            </div>

            {/* Tabs List */}
            {tabs.length === 0 ? (
                <div className="glass-subtle rounded-xl shadow-deep p-8 text-center border border-theme">
                    <p className="text-theme-secondary">No tabs yet. Add your first tab to get started!</p>
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
                                    confirmDeleteId={confirmDeleteId}
                                    setConfirmDeleteId={setConfirmDeleteId}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            {/* Modal */}
            <Dialog.Root open={showModal} onOpenChange={setShowModal}>
                <AnimatePresence>
                    {showModal && (
                        <Dialog.Portal forceMount>
                            <Dialog.Overlay asChild>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="fixed inset-0 bg-black/80 z-50"
                                />
                            </Dialog.Overlay>
                            <Dialog.Content asChild>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.96 }}
                                    transition={{ type: 'spring', stiffness: 220, damping: 30 }}
                                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 glass-card rounded-xl shadow-deep max-w-2xl w-[calc(100%-2rem)] border border-theme z-50 max-h-[85vh] overflow-y-auto"
                                >
                                    {/* Modal Header */}
                                    <div className="flex items-center justify-between p-4 sm:p-6 border-b border-theme sticky top-0 bg-theme-primary z-10">
                                        <Dialog.Title className="text-lg sm:text-xl font-bold text-theme-primary">
                                            {modalMode === 'create' ? 'Add New Tab' : 'Edit Tab'}
                                        </Dialog.Title>
                                        <Dialog.Close asChild>
                                            <button
                                                className="text-theme-secondary hover:text-theme-primary transition-colors"
                                                title="Close"
                                            >
                                                <X size={24} />
                                            </button>
                                        </Dialog.Close>
                                    </div>

                                    {/* Modal Form */}
                                    <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                                        <Input
                                            label="Tab Name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            placeholder="e.g., Radarr"
                                            helperText="Appears in sidebar (URL slug auto-generated)"
                                        />

                                        <Input
                                            label="URL"
                                            type="url"
                                            value={formData.url}
                                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                            required
                                            placeholder="http://example.com"
                                        />

                                        <div>
                                            <label className="block mb-2 font-medium text-theme-secondary text-sm">
                                                Icon
                                            </label>
                                            <IconPicker
                                                value={formData.icon}
                                                onChange={(icon) => setFormData({ ...formData, icon })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block mb-2 font-medium text-theme-secondary text-sm">
                                                Group (Optional)
                                            </label>
                                            <select
                                                value={formData.groupId}
                                                onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                                                className="w-full px-4 py-3 bg-theme-tertiary border border-theme rounded-lg text-theme-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                                            >
                                                <option value="">No Group</option>
                                                {tabGroups.map(group => (
                                                    <option key={group.id} value={group.id}>
                                                        {group.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-theme-tertiary mt-1">
                                                Organize tabs into groups in the sidebar
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="enabled"
                                                checked={formData.enabled}
                                                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                                                className="w-4 h-4 rounded border-theme text-accent focus:ring-accent"
                                            />
                                            <label htmlFor="enabled" className="text-sm text-theme-secondary">
                                                Enabled (tab visible in sidebar)
                                            </label>
                                        </div>

                                        {/* Modal Actions */}
                                        <div className="flex justify-end gap-3 pt-4">
                                            <Dialog.Close asChild>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                >
                                                    Cancel
                                                </Button>
                                            </Dialog.Close>
                                            <Button
                                                type="submit"
                                                icon={Save}
                                            >
                                                {modalMode === 'create' ? 'Create Tab' : 'Save Changes'}
                                            </Button>
                                        </div>
                                    </form>
                                </motion.div>
                            </Dialog.Content>
                        </Dialog.Portal>
                    )}
                </AnimatePresence>
            </Dialog.Root>
        </div >
    );
};

export default UserTabsSettings;
