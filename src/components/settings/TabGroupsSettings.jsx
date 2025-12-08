import React, { useState, useEffect } from 'react';
import { FolderTree, Plus, Edit, Trash2, X, Save, GripVertical, Loader } from 'lucide-react';
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

// Sortable Group Item Component
const SortableGroupItem = ({ group, onEdit, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: group.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
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
                }}
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
                <Button
                    onClick={() => onDelete(group)}
                    variant="ghost"
                    size="sm"
                    className="text-error hover:bg-error/10"
                    title="Delete group"
                >
                    <Trash2 size={14} className="mr-1" />
                    <span className="hidden sm:inline">Delete</span>
                </Button>
            </div>
        </div>
    );
};

const TabGroupsSettings = () => {
    const [tabGroups, setTabGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [formData, setFormData] = useState({ id: '', name: '', order: 0 });

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
        fetchTabGroups();
    }, []);

    const fetchTabGroups = async () => {
        try {
            const response = await fetch('/api/config/system', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                // Tab groups stored in system config
                setTabGroups((data.tabGroups || []).sort((a, b) => a.order - b.order));
            }
        } catch (error) {
            logger.error('Error fetching tab groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateGroupId = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const handleCreate = () => {
        setModalMode('create');
        setFormData({ id: '', name: '', order: tabGroups.length });
        setSelectedGroup(null);
        setShowModal(true);
    };

    const handleEdit = (group) => {
        setModalMode('edit');
        setFormData({ id: group.id, name: group.name, order: group.order });
        setSelectedGroup(group);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            alert('Group name is required');
            return;
        }

        const groupId = modalMode === 'create' ? generateGroupId(formData.name) : formData.id;

        if (modalMode === 'create' && tabGroups.some(g => g.id === groupId)) {
            alert(`A group with ID "${groupId}" already exists.`);
            return;
        }

        const newGroup = { id: groupId, name: formData.name, order: formData.order || 0 };

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
            } else {
                alert((await response.json()).error || 'Failed to save group');
            }
        } catch (error) {
            logger.error('Error saving group:', error);
            alert('Failed to save group');
        }
    };

    const handleDelete = async (group) => {
        if (!confirm(`Delete tab group "${group.name}"?\n\nNote: Tabs in this group will not be deleted, but may not display in sidebar until reassigned.`)) {
            return;
        }

        try {
            const response = await fetch('/api/config/system', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ tabGroups: tabGroups.filter(g => g.id !== group.id) })
            });

            if (response.ok) fetchTabGroups();
            else alert('Failed to delete group');
        } catch (error) {
            logger.error('Error deleting group:', error);
            alert('Failed to delete group');
        }
    };

    const handleDragEnd = async (event) => {
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

    if (loading) return <div className="text-center py-16 text-theme-secondary">Loading tab groups...</div>;

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
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <div onClick={(e) => e.stopPropagation()} className="glass-card rounded-xl shadow-deep p-6 w-full max-w-md border border-theme">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-theme-primary">{modalMode === 'create' ? 'Create Tab Group' : `Edit: ${selectedGroup?.name}`}</h3>
                            <button onClick={() => setShowModal(false)} className="text-theme-secondary hover:text-theme-primary transition-colors" title="Close">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                label="Group Name *"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="e.g., Media, Downloads, System"
                                helperText={formData.name ? `ID: ${generateGroupId(formData.name)}` : ''}
                            />

                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    variant="secondary"
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
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
                </div>
            )}
        </div>
    );
};

export default TabGroupsSettings;
