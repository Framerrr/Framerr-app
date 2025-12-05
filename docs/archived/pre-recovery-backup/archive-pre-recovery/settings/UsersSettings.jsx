import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Plus, Edit, Trash2, Key, X, Save, Shield, UserCog } from 'lucide-react';
import PermissionGroupsSettings from './PermissionGroupsSettings';

const UsersSettings = () => {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [permissionGroups, setPermissionGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        group: 'user'
    });

    useEffect(() => {
        fetchUsers();
        fetchPermissionGroups();
    }, []);

    // Refresh permission groups when switching to users tab
    useEffect(() => {
        if (activeTab === 'users') {
            fetchPermissionGroups();
        }
    }, [activeTab]);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/admin/users', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(Array.isArray(data.users) ? data.users : []);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchPermissionGroups = async () => {
        try {
            const response = await fetch('/api/config/system', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setPermissionGroups(data.groups || []);
            }
        } catch (error) {
            console.error('Error fetching permission groups:', error);
        }
    };

    const handleCreateUser = () => {
        setModalMode('create');
        setFormData({ username: '', email: '', password: '', group: 'user' });
        setSelectedUser(null);
        setShowModal(true);
    };

    const handleEditUser = (user) => {
        setModalMode('edit');
        setFormData({
            username: user.username,
            email: user.email || '',
            password: '',
            group: user.group || 'user'
        });
        setSelectedUser(user);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const url = modalMode === 'create'
                ? '/api/admin/users'
                : `/api/admin/users/${selectedUser.id}`;

            const method = modalMode === 'create' ? 'POST' : 'PUT';

            const body = modalMode === 'create'
                ? formData
                : { ...formData, password: formData.password || undefined };

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body)
            });

            if (response.ok) {
                setShowModal(false);
                fetchUsers();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to save user');
            }
        } catch (error) {
            console.error('Error saving user:', error);
            alert('Failed to save user');
        }
    };

    const handleDeleteUser = async (userId, username) => {
        if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                fetchUsers();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user');
        }
    };

    const handleResetPassword = async (userId, username) => {
        if (!confirm(`Reset password for user "${username}"? They will need to set a new password on next login.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                alert(`Password reset successfully. New temporary password: ${data.tempPassword}`);
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to reset password');
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            alert('Failed to reset password');
        }
    };

    if (loading) {
        return <div className="text-center py-16 text-slate-400">Loading users...</div>;
    }

    return (
        <div>
            {/* Sub-Tab Navigation */}
            <div className="mb-6 border-b border-slate-700">
                <div className="flex gap-1">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'users'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-slate-400 hover:text-slate-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <UsersIcon size={18} />
                            <span>User Accounts</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('permissions')}
                        className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'permissions'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-slate-400 hover:text-slate-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Shield size={18} />
                            <span>Permission Groups</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'users' ? (
                <div>
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold mb-2 text-white">
                                User Management
                            </h2>
                            <p className="text-slate-400 text-sm">
                                Manage dashboard users, roles, and permissions
                            </p>
                        </div>
                        <button
                            onClick={handleCreateUser}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                        >
                            <Plus size={18} />
                            <span>Add User</span>
                        </button>
                    </div>

                    {/* Users Table - Responsive */}
                    <div className="bg-slate-800/30 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-800/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Username</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300 hidden md:table-cell">Email</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Group</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300 hidden lg:table-cell">Created</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id} className="border-t border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
                                                        {user.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-white">{user.username}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 text-sm hidden md:table-cell">
                                                {user.email || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.group === 'admin'
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : 'bg-slate-700/50 text-slate-300'
                                                    }`}>
                                                    {user.group || 'user'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 text-sm hidden lg:table-cell">
                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={() => handleEditUser(user)}
                                                        className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                                                        title="Edit user"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleResetPassword(user.id, user.username)}
                                                        className="p-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-colors hidden sm:block"
                                                        title="Reset password"
                                                    >
                                                        <Key size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id, user.username)}
                                                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                                        title="Delete user"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {users.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                <UsersIcon size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No users found. Create your first user to get started.</p>
                            </div>
                        )}
                    </div>

                    {/* Modal */}
                    {showModal && (
                        <div
                            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
                            onClick={() => setShowModal(false)}
                        >
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
                            >
                                {/* Modal Header */}
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-white">
                                        {modalMode === 'create' ? 'Create User' : 'Edit User'}
                                    </h3>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="text-slate-400 hover:text-white transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block mb-2 font-medium text-slate-300 text-sm">
                                            Username
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            required
                                            className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block mb-2 font-medium text-slate-300 text-sm">
                                            Email (Optional)
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                                            placeholder="user@example.com"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            If set, user can login with either username or email
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block mb-2 font-medium text-slate-300 text-sm">
                                            Password {modalMode === 'edit' && '(leave blank to keep current)'}
                                        </label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required={modalMode === 'create'}
                                            className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block mb-2 font-medium text-slate-300 text-sm">
                                            Permission Group
                                        </label>
                                        <select
                                            value={formData.group}
                                            onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                                        >
                                            {permissionGroups.map(group => (
                                                <option key={group.id} value={group.id}>
                                                    {group.name}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Controls what this user can access (managed in Permission Groups tab)
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                                        >
                                            <Save size={18} />
                                            {modalMode === 'create' ? 'Create User' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <PermissionGroupsSettings />
            )}
        </div>
    );
};

export default UsersSettings;
