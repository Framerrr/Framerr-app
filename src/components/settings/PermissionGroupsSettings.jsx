import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, X, Save, AlertTriangle, Users, Loader, Check } from 'lucide-react';
import logger from '../../utils/logger';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useNotifications } from '../../context/NotificationContext';

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
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const { error: showError, warning: showWarning } = useNotifications();

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
                // Convert groups object to array: {"admin":{...}, "user":{...}} => [{id:"admin",...}, {id:"user",...}]
                const groupsArray = Object.entries(data.groups || {}).map(([id, group]) => ({
                    id,
                    ...group
                }));
                setGroups(groupsArray);
                setDefaultGroup(data.defaultGroup || 'user');
            }
        } catch (error) {
            logger.error('Error fetching groups:', error);
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
            showWarning('Missing Name', 'Group name is required');
            return;
        }

        // Skip empty permissions check - the UI warning is sufficient

        const groupId = modalMode === 'create' ? generateGroupId(formData.name) : formData.id;

        if (modalMode === 'create' && groups.some(g => g.id === groupId)) {
            showWarning('Duplicate Group', `A group with ID "${groupId}" already exists.`);
            return;
        }

        const newGroup = { id: groupId, name: formData.name, permissions: formData.permissions };

        try {
            const updatedGroupsArray = modalMode === 'create'
                ? [...groups, newGroup]
                : groups.map(g => g.id === groupId ? newGroup : g);

            // Convert array back to object format for backend: [{id:"admin",...}] => {"admin":{...}}
            const groupsObject = updatedGroupsArray.reduce((acc, group) => {
                const { id, ...groupData } = group;
                acc[id] = groupData;
                return acc;
            }, {});

            const response = await fetch('/api/config/system', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ groups: groupsObject })
            });

            if (response.ok) {
                setShowModal(false);
                fetchGroups();
            } else {
                showError('Save Failed', (await response.json()).error || 'Failed to save group');
            }
        } catch (error) {
            logger.error('Error saving group:', error);
            showError('Save Failed', 'Failed to save group');
        }
    };

    const handleDelete = async (group) => {
        if (PROTECTED_GROUPS.includes(group.id)) {
            showWarning('Cannot Delete', `Cannot delete system group "${group.name}".`);
            setConfirmDeleteId(null);
            return;
        }

        if (group.id === defaultGroup) {
            showWarning('Cannot Delete', `Cannot delete "${group.name}" as it's the default group.`);
            setConfirmDeleteId(null);
            return;
        }

        try {
            const updatedGroupsArray = groups.filter(g => g.id !== group.id);

            // Convert array back to object format for backend
            const groupsObject = updatedGroupsArray.reduce((acc, group) => {
                const { id, ...groupData } = group;
                acc[id] = groupData;
                return acc;
            }, {});

            const response = await fetch('/api/config/system', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ groups: groupsObject })
            });

            if (response.ok) {
                setConfirmDeleteId(null);
                fetchGroups();
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

    const handleDefaultGroupChange = async (newDefaultGroup) => {
        try {
            const response = await fetch('/api/config/system', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ defaultGroup: newDefaultGroup })
            });

            if (response.ok) setDefaultGroup(newDefaultGroup);
            else showError('Update Failed', 'Failed to update default group');
        } catch (error) {
            showError('Update Failed', 'Failed to update default group');
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

    if (loading) return <div className="text-center py-16 text-theme-secondary">Loading permission groups...</div>;

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="mb-6 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-theme-primary">Permission Groups</h2>
                <p className="text-theme-secondary text-sm">Manage access control and user permissions</p>
            </div>

            <div className="mb-6 flex justify-center">
                <Button
                    onClick={handleCreate}
                    title="Add new permission group"
                    icon={Plus}
                >
                    <span className="hidden sm:inline">Add Group</span>
                </Button>
            </div>

            {/* Default Group */}
            <div className="mb-6 p-4 rounded-xl border border-theme bg-theme-tertiary/30" style={{ transition: 'all 0.3s ease' }}>
                <label className="block mb-2 font-medium text-theme-primary">Default Group for New Users</label>
                <p className="text-sm text-theme-secondary mb-3">New users are automatically assigned to this group</p>
                <select value={defaultGroup} onChange={(e) => handleDefaultGroupChange(e.target.value)}
                    className="w-full px-4 py-3 bg-theme-tertiary border border-theme rounded-lg text-theme-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all">
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map(group => (
                    <div key={group.id} className="rounded-xl p-6 border border-theme bg-theme-tertiary/30 hover:bg-theme-tertiary/50 hover:border-theme-light transition-all flex flex-col" style={{ transition: 'all 0.3s ease' }}>
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 flex-1">
                                <Shield size={20} className={group.permissions.includes('*') ? 'text-accent' : 'text-info'} />
                                <h3 className="font-semibold text-theme-primary truncate">{group.name}</h3>
                            </div>
                            {PROTECTED_GROUPS.includes(group.id) && (
                                <span className="px-2 py-0.5 bg-warning/20 text-warning rounded text-xs font-medium ml-2">System</span>
                            )}
                        </div>

                        <div className="mb-4">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${group.permissions.includes('*') ? 'bg-accent/20 text-accent' : 'bg-info/20 text-info'}`}>
                                {group.permissions.includes('*') ? 'All Permissions' : `${group.permissions.length} Permission${group.permissions.length === 1 ? '' : 's'}`}
                            </span>
                        </div>

                        <div className="text-xs text-theme-tertiary mb-4">ID: {group.id}</div>

                        <div className="flex gap-2 mt-auto">
                            <Button
                                onClick={() => handleEdit(group)}
                                variant="ghost"
                                size="sm"
                                className="flex-1 text-accent hover:bg-accent/10"
                                title="Edit group"
                            >
                                <Edit size={14} className="mr-2" />
                                <span className="hidden sm:inline">Edit</span>
                            </Button>
                            {confirmDeleteId !== group.id ? (
                                <Button
                                    onClick={() => setConfirmDeleteId(group.id)}
                                    disabled={PROTECTED_GROUPS.includes(group.id)}
                                    variant="ghost"
                                    size="sm"
                                    className={`flex-1 ${PROTECTED_GROUPS.includes(group.id) ? 'text-theme-tertiary cursor-not-allowed' : 'text-error hover:bg-error/10'}`}
                                    title={PROTECTED_GROUPS.includes(group.id) ? "System group cannot be deleted" : "Delete group"}
                                >
                                    <Trash2 size={14} className="mr-2" />
                                    <span className="hidden sm:inline">Delete</span>
                                </Button>
                            ) : (
                                <div className="flex gap-1 flex-1">
                                    <Button
                                        onClick={() => handleDelete(group)}
                                        variant="danger"
                                        size="sm"
                                        className="flex-1"
                                        title="Confirm delete"
                                    >
                                        <Check size={14} />
                                    </Button>
                                    <Button
                                        onClick={() => setConfirmDeleteId(null)}
                                        variant="secondary"
                                        size="sm"
                                        className="flex-1"
                                        title="Cancel"
                                    >
                                        <X size={14} />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <div onClick={(e) => e.stopPropagation()} className="glass-card rounded-xl shadow-deep border border-theme p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-theme-primary">{modalMode === 'create' ? 'Create Group' : `Edit: ${selectedGroup?.name}`}</h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-theme-secondary hover:text-theme-primary transition-colors"
                                title="Close"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <Input
                                label="Group Name *"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="e.g., Power Users"
                                helperText={formData.name ? `ID: ${generateGroupId(formData.name)}` : ''}
                            />

                            <div>
                                <label className="block mb-3 font-medium text-theme-secondary text-sm">Permissions *</label>
                                <div className="space-y-2">
                                    {AVAILABLE_PERMISSIONS.map(perm => {
                                        const isChecked = formData.permissions.includes(perm.id);
                                        const isWildcard = formData.permissions.includes('*');
                                        const isDisabled = isWildcard && perm.id !== '*';
                                        return (
                                            <label key={perm.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${isDisabled ? 'bg-theme-tertiary/30 border-theme/30 opacity-50 cursor-not-allowed' :
                                                isChecked ? 'bg-accent/10 border-accent/30 hover:bg-accent/15' : 'bg-theme-tertiary/30 border-theme/50 hover:bg-theme-tertiary/50'
                                                }`}>
                                                <input type="checkbox" checked={isChecked} onChange={() => togglePermission(perm.id)} disabled={isDisabled}
                                                    className="mt-0.5 w-4 h-4 rounded border-theme text-accent" />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span>{perm.icon}</span>
                                                        <span className="font-medium text-theme-primary">{perm.label}</span>
                                                    </div>
                                                    <p className="text-xs text-theme-secondary mt-0.5">{perm.description}</p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                                {formData.permissions.length === 0 && (
                                    <div className="flex items-center gap-2 mt-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                                        <AlertTriangle size={16} className="text-warning" />
                                        <p className="text-xs text-warning">No permissions selected - users will have very limited access</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4">
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

export default PermissionGroupsSettings;
