import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { FolderTree, Plus, Edit, Trash2, X, Save, GripVertical, Loader, Check } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
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
    DragEndEvent,
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
import LoadingSpinner from '../common/LoadingSpinner';

interface TabGroup {
    id: string;
    name: string;
    order: number;
}

interface FormData {
    id: string;
    name: string;
    order: number;
}

interface SortableGroupItemProps {
    group: TabGroup;
    onEdit: (group: TabGroup) => void;
    onDelete: (group: TabGroup) => void;
    confirmDeleteId: string | null;
    setConfirmDeleteId: (id: string | null) => void;
}

// Sortable Group Item Component
const SortableGroupItem: React.FC<SortableGroupItemProps> = ({ group, onEdit, onDelete, confirmDeleteId, setConfirmDeleteId }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: group.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        opacity: isDragging ? 0.5 : 1,
        willChange: isDragging ? 'transform' : 'auto'
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="glass-subtle rounded-xl shadow-medium p-6 border border-theme flex items-center gap-4 card-glow"
        >
            {/* Drag Handle */}
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-theme-tertiary hover:text-theme-primary transition-colors"
                style={{
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    WebkitTouchCallout: 'none'
                } as React.CSSProperties}
                title="Drag to reorder"
            >
                <GripVertical size={20} />
            </button>

            <FolderTree size={20} className="text-accent flex-shrink-0" />

            <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-theme-primary">{group.name}</h3>
                <p className="text-xs text-theme-tertiary truncate">ID: {group.id}</p>
            </div>

            <div className="flex gap-2 flex-shrink-0">
                <Button
                    onClick={() => onEdit(group)}
                    variant="ghost"
                    size="sm"
                    className="text-accent hover:bg-accent/10"
                    title="Edit group"
                >
                    <Edit size={14} className="mr-1" />
                    <span className="hidden sm:inline">Edit</span>
                </Button>
                {confirmDeleteId !== group.id ? (
                    <Button
                        onClick={() => setConfirmDeleteId(group.id)}
                        variant="ghost"
                        size="sm"
                        className="text-error hover:bg-error/10"
                        title="Delete group"
                    >
                        <Trash2 size={14} className="mr-1" />
                        <span className="hidden sm:inline">Delete</span>
                    </Button>
                ) : (
                    <div className="flex gap-1">
                        <Button
                            onClick={() => onDelete(group)}
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

const TabGroupsSettings: React.FC = () => {
    const [tabGroups, setTabGroups] = useState<TabGroup[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedGroup, setSelectedGroup] = useState<TabGroup | null>(null);
    const [formData, setFormData] = useState<FormData>({ id: '', name: '', order: 0 });
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const { error: showError, warning: showWarning, success: showSuccess } = useNotifications();

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 150,
                tolerance: 5
            }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchTabGroups();
    }, []);

    const fetchTabGroups = async (): Promise<void> => {
        try {
            const response = await fetch('/api/config/system', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                setTabGroups((data.tabGroups || []).sort((a: TabGroup, b: TabGroup) => a.order - b.order));
            }
        } catch (error) {
            logger.error('Error fetching tab groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateGroupId = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const handleCreate = (): void => {
        setModalMode('create');
        setFormData({ id: '', name: '', order: tabGroups.length });
        setSelectedGroup(null);
        setShowModal(true);
    };

    const handleEdit = (group: TabGroup): void => {
        setModalMode('edit');
        setFormData({ id: group.id, name: group.name, order: group.order });
        setSelectedGroup(group);
        setShowModal(true);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        if (!formData.name.trim()) {
            showWarning('Missing Name', 'Group name is required');
            return;
        }

        const groupId = modalMode === 'create' ? generateGroupId(formData.name) : formData.id;

        if (modalMode === 'create' && tabGroups.some(g => g.id === groupId)) {
            showWarning('Duplicate Group', `A group with ID "${groupId}" already exists.`);
            return;
        }

        const newGroup: TabGroup = { id: groupId, name: formData.name, order: formData.order || 0 };

        try {
            const updatedGroups = modalMode === 'create'
                ? [...tabGroups, newGroup]
                : tabGroups.map(g => g.id === groupId ? newGroup : g);

            const response = await fetch('/api/config/system', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ tabGroups: updatedGroups })
            });

            if (response.ok) {
                setShowModal(false);
                fetchTabGroups();
                showSuccess(
                    modalMode === 'create' ? 'Group Created' : 'Group Updated',
                    `Tab group "${formData.name}" ${modalMode === 'create' ? 'created' : 'updated'} successfully`
                );
            } else {
                const errorData = await response.json();
                showError('Save Failed', errorData.error || 'Failed to save group');
            }
        } catch (error) {
            logger.error('Error saving group:', error);
            showError('Save Failed', 'Failed to save group');
        }
    };

    const handleDelete = async (group: TabGroup): Promise<void> => {
        try {
            const response = await fetch('/api/config/system', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ tabGroups: tabGroups.filter(g => g.id !== group.id) })
            });

            if (response.ok) {
                setConfirmDeleteId(null);
                fetchTabGroups();
                showSuccess('Group Deleted', `Tab group "${group.name}" has been deleted`);
            } else {
                showError('Delete Failed', 'Failed to delete group');
                setConfirmDeleteId(null);
            }
        } catch (error) {
            logger.error('Error deleting group:', error);
            showError('Delete Failed', 'Failed to delete group');
            setConfirmDeleteId(null);
        }
    };

    const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        const oldIndex = tabGroups.findIndex(g => g.id === active.id);
        const newIndex = tabGroups.findIndex(g => g.id === over.id);

        const newGroups = arrayMove(tabGroups, oldIndex, newIndex);

        // Update order values
        const reorderedGroups = newGroups.map((g, idx) => ({ ...g, order: idx }));

        setTabGroups(reorderedGroups); // Optimistic update

        try {
            const response = await fetch('/api/config/system', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ tabGroups: reorderedGroups })
            });

            if (!response.ok) {
                fetchTabGroups(); // Revert on error
            }
        } catch (error) {
            logger.error('Error reordering:', error);
            fetchTabGroups(); // Revert on error
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <LoadingSpinner size="lg" message="Loading tab groups..." />
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            {/* Header */}
            <div className="mb-6 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-theme-primary">Tab Groups</h2>
                <p className="text-theme-secondary text-sm">Organize your tabs into collapsible sidebar groups</p>
            </div>

            <div className="mb-6 flex justify-center">
                <Button
                    onClick={handleCreate}
                    title="Add new group"
                    icon={Plus}
                >
                    <span className="hidden sm:inline">Add Group</span>
                </Button>
            </div>

            {/* Info Box */}
            <div className="mb-6 p-6 bg-accent/10 border border-accent/20 rounded-xl glass-subtle">
                <p className="text-sm text-accent">
                    Tab groups help organize your iframe tabs in the sidebar. When creating or editing tabs, you can assign them to these groups.
                </p>
            </div>

            {/* Groups List */}
            {tabGroups.length === 0 ? (
                <div className="glass-subtle rounded-xl shadow-deep p-12 text-center border border-theme">
                    <FolderTree size={48} className="mx-auto mb-4 opacity-50 text-theme-tertiary" />
                    <p className="text-theme-secondary">No tab groups yet. Create one to organize your sidebar tabs!</p>
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={tabGroups.map(g => g.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-3">
                            {tabGroups.map((group) => (
                                <SortableGroupItem
                                    key={group.id}
                                    group={group}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
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
                                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 glass-card rounded-xl shadow-deep w-[calc(100%-2rem)] max-w-md border border-theme z-50"
                                >
                                    <div className="p-4 sm:p-6">
                                        <div className="flex justify-between items-center mb-6">
                                            <Dialog.Title className="text-lg sm:text-xl font-bold text-theme-primary">
                                                {modalMode === 'create' ? 'Create Tab Group' : `Edit: ${selectedGroup?.name}`}
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

                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <Input
                                                label="Group Name *"
                                                value={formData.name}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                                placeholder="e.g., Media, Downloads, System"
                                                helperText={formData.name ? `ID: ${generateGroupId(formData.name)}` : ''}
                                            />

                                            <div className="flex gap-3 pt-2">
                                                <Dialog.Close asChild>
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        className="flex-1"
                                                    >
                                                        Cancel
                                                    </Button>
                                                </Dialog.Close>
                                                <Button
                                                    type="submit"
                                                    className="flex-1"
                                                    icon={Save}
                                                >
                                                    {modalMode === 'create' ? 'Create' : 'Save'}
                                                </Button>
                                            </div>
                                        </form>
                                    </div>
                                </motion.div>
                            </Dialog.Content>
                        </Dialog.Portal>
                    )}
                </AnimatePresence>
            </Dialog.Root>
        </div>
    );
};

export default TabGroupsSettings;
