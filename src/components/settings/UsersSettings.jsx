import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Plus, Edit, Trash2, Key, X, Save, Loader, Check, Copy } from 'lucide-react';
import logger from '../../utils/logger';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

// Hardcoded permission groups - admin, user, guest
const PERMISSION_GROUPS = [
    { id: 'admin', name: 'Admin' },
    { id: 'user', name: 'User' },
    { id: 'guest', name: 'Guest' }
];

const UsersSettings = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedUser, setSelectedUser] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [confirmResetId, setConfirmResetId] = useState(null);
    const [tempPassword, setTempPassword] = useState(null);
    const { error: showError, success: showSuccess } = useNotifications();
    const { user: currentUser } = useAuth();

    // Check if editing self (to prevent group demotion)
    const isEditingSelf = modalMode === 'edit' && selectedUser?.id === currentUser?.id;

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        group: 'user'
    });

    // Check if group is admin
    const isAdminGroup = (group) => group === 'admin';

    useEffect(() => {
        fetchUsers();
    }, []);

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
            logger.error('Error fetching users:', error);
            setUsers([]);
        } finally {
            setLoading(false);
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
                showSuccess(
                    modalMode === 'create' ? 'User Created' : 'User Updated',
                    modalMode === 'create' ? `User "${formData.username}" created successfully` : `User "${formData.username}" updated successfully`
                );
            } else {
                const error = await response.json();
                showError('Save Failed', error.error || 'Failed to save user');
            }
        } catch (error) {
            logger.error('Error saving user:', error);
            showError('Save Failed', 'Failed to save user');
        }
    };

    const handleDeleteUser = async (userId, username) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                setConfirmDeleteId(null);
                fetchUsers();
                showSuccess('User Deleted', `User "${username}" has been deleted`);
            } else {
                const error = await response.json();
                showError('Delete Failed', error.error || 'Failed to delete user');
                setConfirmDeleteId(null);
            }
        } catch (error) {
            logger.error('Error deleting user:', error);
            showError('Delete Failed', 'Failed to delete user');
            setConfirmDeleteId(null);
        }
    };

    const handleResetPassword = async (userId, username) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setTempPassword({ userId, password: data.tempPassword });
                setConfirmResetId(null);
                showSuccess('Password Reset', `New temporary password generated for ${username}`);
            } else {
                const error = await response.json();
                showError('Reset Failed', error.error || 'Failed to reset password');
                setConfirmResetId(null);
            }
        } catch (error) {
            logger.error('Error resetting password:', error);
            showError('Reset Failed', 'Failed to reset password');
            setConfirmResetId(null);
        }
    };

    if (loading) {
        return <div className="text-center py-16 text-theme-secondary">Loading users...</div>;
    }

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="mb-6 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-theme-primary">
                    User Management
                </h2>
                <p className="text-theme-secondary text-sm">
                    Manage dashboard users, roles, and permissions
                </p>
            </div>

            <div className="mb-6 flex justify-center">
                <Button
                    onClick={handleCreateUser}
                    title="Add new user"
                    icon={Plus}
                >
                    <span className="hidden sm:inline">Add User</span>
                </Button>
            </div>

            {/* Users Table - Responsive */}
            <div className="rounded-xl overflow-hidden border border-theme bg-theme-tertiary/30" style={{ transition: 'all 0.3s ease' }}>
                <div className="overflow-x-auto scroll-contain-x">
                    <table className="w-full">
                        <thead className="bg-theme-tertiary/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-theme-secondary">Username</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-theme-secondary hidden md:table-cell">Email</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-theme-secondary">Group</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-theme-secondary hidden lg:table-cell">Created</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-theme-secondary">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-t border-theme hover:bg-theme-tertiary/20 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-bold text-sm text-white">
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-theme-primary">{user.username}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-theme-secondary text-sm hidden md:table-cell">
                                        {user.email || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${isAdminGroup(user.group)
                                            ? 'bg-accent/20 text-accent'
                                            : 'bg-theme-tertiary text-theme-secondary'
                                            }`}>
                                            {user.group || 'user'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-theme-secondary text-sm hidden lg:table-cell">
                                        {user.createdAt ? new Date(user.createdAt * 1000).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2 justify-end items-center">
                                            {/* Show temp password if just reset */}
                                            {tempPassword?.userId === user.id && (
                                                <div className="flex items-center gap-2 bg-success/10 border border-success/20 px-2 py-1 rounded-lg text-xs">
                                                    <span className="text-success font-mono">{tempPassword.password}</span>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(tempPassword.password);
                                                            showSuccess('Copied', 'Password copied to clipboard');
                                                        }}
                                                        className="text-success hover:text-success/80"
                                                        title="Copy password"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => setTempPassword(null)}
                                                        className="text-success hover:text-success/80"
                                                        title="Dismiss"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            )}

                                            <Button
                                                onClick={() => handleEditUser(user)}
                                                variant="ghost"
                                                size="sm"
                                                className="text-accent hover:bg-accent/10"
                                                title="Edit user"
                                            >
                                                <Edit size={16} />
                                            </Button>

                                            {/* Reset Password - Inline Confirmation */}
                                            {confirmResetId !== user.id ? (
                                                <Button
                                                    onClick={() => setConfirmResetId(user.id)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-warning hover:bg-warning/10 hidden sm:flex"
                                                    title="Reset password"
                                                >
                                                    <Key size={16} />
                                                </Button>
                                            ) : (
                                                <div className="flex gap-1">
                                                    <Button
                                                        onClick={() => handleResetPassword(user.id, user.username)}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-warning bg-warning/20"
                                                        title="Confirm reset"
                                                    >
                                                        <Check size={14} />
                                                    </Button>
                                                    <Button
                                                        onClick={() => setConfirmResetId(null)}
                                                        variant="secondary"
                                                        size="sm"
                                                        title="Cancel"
                                                    >
                                                        <X size={14} />
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Delete - Inline Confirmation */}
                                            {confirmDeleteId !== user.id ? (
                                                <Button
                                                    onClick={() => setConfirmDeleteId(user.id)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-error hover:bg-error/10"
                                                    title="Delete user"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            ) : (
                                                <div className="flex gap-1">
                                                    <Button
                                                        onClick={() => handleDeleteUser(user.id, user.username)}
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
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {users.length === 0 && (
                    <div className="text-center py-12 text-theme-secondary">
                        <UsersIcon size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No users found. Create your first user to get started.</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="glass-card rounded-xl shadow-deep border border-theme p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
                    >
                        {/* Modal Header */}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-theme-primary">
                                {modalMode === 'create' ? 'Create User' : 'Edit User'}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-theme-secondary hover:text-theme-primary transition-colors"
                                title="Close"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                label="Username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />

                            <Input
                                label="Email (Optional)"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="user@example.com"
                                helperText="If set, user can login with either username or email"
                            />

                            <Input
                                label={`Password ${modalMode === 'edit' ? '(leave blank to keep current)' : ''}`}
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required={modalMode === 'create'}
                            />

                            <div>
                                <label className="block mb-2 font-medium text-theme-secondary text-sm">
                                    Permission Group
                                </label>
                                <select
                                    value={formData.group}
                                    onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                                    disabled={isEditingSelf}
                                    className={`w-full px-4 py-3 bg-theme-tertiary border border-theme rounded-lg text-theme-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all ${isEditingSelf ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {PERMISSION_GROUPS.map(group => (
                                        <option key={group.id} value={group.id}>
                                            {group.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-theme-tertiary mt-1">
                                    {isEditingSelf
                                        ? 'You cannot change your own permission group'
                                        : 'Admin: Full access | User: Standard access | Guest: Read-only'
                                    }
                                </p>
                            </div>

                            {/* Actions */}
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
                                    {modalMode === 'create' ? 'Create User' : 'Save Changes'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersSettings;
