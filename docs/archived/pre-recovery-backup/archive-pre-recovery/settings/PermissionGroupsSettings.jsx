import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, X, Save, AlertTriangle, Users } from 'lucide-react';

// System groups that cannot be deleted
const PROTECTED_GROUPS = ['admin', 'user', 'guest'];

// Available permissions with descriptions
const AVAILABLE_PERMISSIONS = [
    { id: '*', label: 'Full Access (Admin)', description: 'Complete system access, overrides all other permissions', icon: '👑' },
    { id: 'view_dashboard', label: 'View Dashboard', description: 'Access to dashboard and navigation', icon: '📊' },
    { id: 'manage_widgets', label: 'Manage Widgets', description: 'Add, edit, and delete dashboard widgets', icon: '🧩' },
    { id: 'manage_system', label: 'Manage System', description: 'Access Settings page and system configuration', icon: '⚙️' },
    { id: 'manage_users', label: 'Manage Users', description: 'Create, edit, and delete user accounts', icon: '👥' }
];

const PermissionGroupsSettings = () => {
    const [groups, setGroups] = useState([]);
    const [defaultGroup, setDefaultGroup] = useState('user');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        permissions: ['view_dashboard']
    });

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            const response = await fetch('/api/config/system', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                setGroups(data.groups || []);
                setDefaultGroup(data.defaultGroup || 'user');
            }
        } catch (error) {
            console.error('Error fetching groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateGroupId = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const handleCreate = () => {
        setModalMode('create');
        setFormData({ id: '', name: '', permissions: ['view_dashboard'] });
        setSelectedGroup(null);
        setShowModal(true);
    };

    const handleEdit = (group) => {
        setModalMode('edit');
        setFormData({ id: group.id, name: group.name, permissions: [...group.permissions] });
        setSelectedGroup(group);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert('Group name is required');
            return;
        }
        if (formData.permissions.length === 0 && !confirm('This group has no permissions. Continue?')) {
            return;
        }

        const groupId = modalMode === 'create' ? generateGroupId(formData.name) : formData.id;
        if (modalMode === 'create' && groups.some(g => g.id === groupId)) {
            alert(`A group with ID "${groupId}" already exists.`);
            return;
        }

        const newGroup = { id: groupId, name: formData.name, permissions: formData.permissions };
        try {
            const updatedGroups = modalMode === 'create'
                ? [...groups, newGroup]
                : groups.map(g => g.id === groupId ? newGroup : g);

            const response = await fetch('/api/config/system', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ groups: updatedGroups })
            });

            if (response.ok) {
                setShowModal(false);
                fetchGroups();
            } else {
                alert((await response.json()).error || 'Failed to save group');
            }
        } catch (error) {
            console.error('Error saving group:', error);
            alert('Failed to save group');
        }
    };

    const handleDelete = async (group) => {
        if (PROTECTED_GROUPS.includes(group.id)) {
            alert(`Cannot delete system group "${group.name}".`);
            return;
        }
        if (group.id === defaultGroup) {
            alert(`Cannot delete "${group.name}" as it's the default group.`);
            return;
        }
        if (!confirm(`Delete group "${group.name}"?`)) return;

        try {
            const response = await fetch('/api/config/system', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ groups: groups.filter(g => g.id !== group.id) })
            });
            if (response.ok) fetchGroups();
            else alert('Failed to delete group');
        } catch (error) {
            console.error('Error deleting group:', error);
            alert('Failed to delete group');
        }
    };

    const handleDefaultGroupChange = async (newDefaultGroup) => {
        try {
            const response = await fetch('/api/config/system', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ defaultGroup: newDefaultGroup })
            });
            if (response.ok) setDefaultGroup(newDefaultGroup);
            else alert('Failed to update default group');
        } catch (error) {
            alert('Failed to update default group');
        }
    };

    const togglePermission = (permissionId) => {
        setFormData(prev => {
            const current = prev.permissions;
            if (permissionId === '*') {
                return { ...prev, permissions: current.includes('*') ? ['view_dashboard'] : ['*'] };
            }
            if (current.includes('*')) return prev;
            return {
                ...prev, permissions: current.includes(permissionId)
                    ? current.filter(p => p !== permissionId)
                    : [...current, permissionId]
            };
        });
    };

    if (loading) return <div className="text-center py-16 text-slate-400">Loading permission groups...</div>;

    return (
        <div>
            {/* Header */}
            <div className="mb-6 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white">Permission Groups</h2>
                <p className="text-slate-400 text-sm">Manage access control and user permissions</p>
            </div>
            <div className="mb-6 flex justify-center">
                <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
                    <Plus size={18} /><span>Add Group</span>
                </button>
            </div>

            {/* Default Group */}
            <div className="mb-6 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <label className="block mb-2 font-medium text-white">Default Group for New Users</label>
                <p className="text-sm text-slate-400 mb-3">New users are automatically assigned to this group</p>
                <select value={defaultGroup} onChange={(e) => handleDefaultGroupChange(e.target.value)}
                    className="px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors">
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map(group => (
                    <div key={group.id} className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50 flex flex-col">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 flex-1">
                                <Shield size={20} className={group.permissions.includes('*') ? 'text-purple-400' : 'text-blue-400'} />
                                <h3 className="font-semibold text-white truncate">{group.name}</h3>
                            </div>
                            {PROTECTED_GROUPS.includes(group.id) && (
                                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium ml-2">System</span>
                            )}
                        </div>
                        <div className="mb-4">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${group.permissions.includes('*') ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {group.permissions.includes('*') ? 'All Permissions' : `${group.permissions.length} Permission${group.permissions.length === 1 ? '' : 's'}`}
                            </span>
                        </div>
                        <div className="text-xs text-slate-500 mb-4">ID: {group.id}</div>
                        <div className="flex gap-2 mt-auto">
                            <button onClick={() => handleEdit(group)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors text-sm">
                                <Edit size={14} />Edit
                            </button>
                            <button onClick={() => handleDelete(group)} disabled={PROTECTED_GROUPS.includes(group.id)}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${PROTECTED_GROUPS.includes(group.id) ? 'bg-slate-700/30 text-slate-600 cursor-not-allowed' : 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                                    }`}>
                                <Trash2 size={14} />Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <div onClick={(e) => e.stopPropagation()} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">{modalMode === 'create' ? 'Create Group' : `Edit: ${selectedGroup?.name}`}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block mb-2 font-medium text-slate-300 text-sm">Group Name *</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
                                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" placeholder="e.g., Power Users" />
                                {formData.name && <p className="text-xs text-slate-500 mt-1">ID: {generateGroupId(formData.name)}</p>}
                            </div>
                            <div>
                                <label className="block mb-3 font-medium text-slate-300 text-sm">Permissions *</label>
                                <div className="space-y-2">
                                    {AVAILABLE_PERMISSIONS.map(perm => {
                                        const isChecked = formData.permissions.includes(perm.id);
                                        const isWildcard = formData.permissions.includes('*');
                                        const isDisabled = isWildcard && perm.id !== '*';
                                        return (
                                            <label key={perm.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${isDisabled ? 'bg-slate-800/30 border-slate-700/30 opacity-50 cursor-not-allowed' :
                                                isChecked ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15' : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50'
                                                }`}>
                                                <input type="checkbox" checked={isChecked} onChange={() => togglePermission(perm.id)} disabled={isDisabled}
                                                    className="mt-0.5 w-4 h-4 rounded border-slate-600 text-blue-600" />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span>{perm.icon}</span>
                                                        <span className="font-medium text-white">{perm.label}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-0.5">{perm.description}</p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                                {formData.permissions.length === 0 && (
                                    <div className="flex items-center gap-2 mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                        <AlertTriangle size={16} className="text-yellow-400" />
                                        <p className="text-xs text-yellow-400">No permissions selected - users will have very limited access</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
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

export default PermissionGroupsSettings;
