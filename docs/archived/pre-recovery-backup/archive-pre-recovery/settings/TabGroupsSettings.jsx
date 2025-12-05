import React, { useState, useEffect } from 'react';
import { FolderTree, Plus, Edit, Trash2, X, Save, GripVertical } from 'lucide-react';

const TabGroupsSettings = () => {
    const [tabGroups, setTabGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [formData, setFormData] = useState({ id: '', name: '', order: 0 });

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
            console.error('Error fetching tab groups:', error);
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
            console.error('Error saving group:', error);
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
            console.error('Error deleting group:', error);
            alert('Failed to delete group');
        }
    };

    const moveGroup = async (groupId, direction) => {
        const index = tabGroups.findIndex(g => g.id === groupId);
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === tabGroups.length - 1)) {
            return;
        }

        const newGroups = [...tabGroups];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newGroups[index], newGroups[targetIndex]] = [newGroups[targetIndex], newGroups[index]];

        // Update order values
        const reorderedGroups = newGroups.map((g, idx) => ({ ...g, order: idx }));

        try {
            const response = await fetch('/api/config/system', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ tabGroups: reorderedGroups })
            });
            if (response.ok) {
                setTabGroups(reorderedGroups);
            }
        } catch (error) {
            console.error('Error reordering:', error);
        }
    };

    if (loading) return <div className="text-center py-16 text-slate-400">Loading tab groups...</div>;

    return (
        <div>
            {/* Header */}
            <div className="mb-6 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white">Tab Groups</h2>
                <p className="text-slate-400 text-sm">Organize your tabs into collapsible sidebar groups</p>
            </div>
            <div className="mb-6 flex justify-center">
                <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors font-medium">
                    <Plus size={18} /><span>Add Group</span>
                </button>
            </div>

            {/* Info Box */}
            <div className="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-xl">
                <p className="text-sm text-accent">
                    Tab groups help organize your iframe tabs in the sidebar. When creating or editing tabs, you can assign them to these groups.
                </p>
            </div>

            {/* Groups List */}
            {tabGroups.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <FolderTree size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No tab groups yet. Create one to organize your sidebar tabs!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tabGroups.map((group, index) => (
                        <div key={group.id} className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50 flex items-center gap-4">
                            <GripVertical size={20} className="text-slate-600" />
                            <FolderTree size={20} className="text-accent" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-white">{group.name}</h3>
                                <p className="text-xs text-slate-500">ID: {group.id}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => moveGroup(group.id, 'up')} disabled={index === 0}
                                    className={`px-3 py-1.5 rounded-lg text-sm ${index === 0 ? 'bg-slate-700/30 text-slate-600 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
                                    ↑
                                </button>
                                <button onClick={() => moveGroup(group.id, 'down')} disabled={index === tabGroups.length - 1}
                                    className={`px-3 py-1.5 rounded-lg text-sm ${index === tabGroups.length - 1 ? 'bg-slate-700/30 text-slate-600 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
                                    ↓
                                </button>
                                <button onClick={() => handleEdit(group)} className="px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-sm flex items-center gap-1">
                                    <Edit size={14} />Edit
                                </button>
                                <button onClick={() => handleDelete(group)} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm flex items-center gap-1">
                                    <Trash2 size={14} />Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <div onClick={(e) => e.stopPropagation()} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">{modalMode === 'create' ? 'Create Tab Group' : `Edit: ${selectedGroup?.name}`}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block mb-2 font-medium text-slate-300 text-sm">Group Name *</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
                                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent transition-colors"
                                    placeholder="e.g., Media, Downloads, System" />
                                {formData.name && <p className="text-xs text-slate-500 mt-1">ID: {generateGroupId(formData.name)}</p>}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors font-medium">
                                    <Save size={18} />{modalMode === 'create' ? 'Create' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TabGroupsSettings;
