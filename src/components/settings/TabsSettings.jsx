import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ChevronUp, ChevronDown, X, Save, Layout } from 'lucide-react';
import * as Icons from 'lucide-react';
import IconPicker from '../IconPicker';

const TabsSettings = () => {
    const [tabs, setTabs] = useState([]);
    const [groups, setGroups] = useState([{ id: 'admin', name: 'Administrators' }, { id: 'user', name: 'Users' }, { id: 'guest', name: 'Guests' }]); // Default groups for now
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedTab, setSelectedTab] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        icon: 'Server',
        groupId: 'admin',
        enabled: true
    });

    useEffect(() => {
        fetchTabs();
    }, []);

    const fetchTabs = async () => {
        try {
            const response = await fetch('/api/tabs/admin', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setTabs(data.tabs || []);
            }
        } catch (error) {
            console.error('Error fetching tabs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setModalMode('create');
        setFormData({ name: '', url: '', icon: 'Server', groupId: 'admin', enabled: true });
        setSelectedTab(null);
        setShowModal(true);
    };

    const handleEdit = (tab) => {
        setModalMode('edit');
        setFormData({
            name: tab.name,
            url: tab.url,
            icon: tab.icon || 'Server',
            groupId: tab.groupId || 'admin',
            enabled: tab.enabled !== false
        });
        setSelectedTab(tab);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const url = modalMode === 'create'
                ? '/api/tabs/admin'
                : `/api/tabs/admin/${selectedTab.id}`;

            const method = modalMode === 'create' ? 'POST' : 'PUT';

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
            console.error('Error saving tab:', error);
            alert('Failed to save tab');
        }
    };

    const handleDelete = async (tabId, tabName) => {
        if (!confirm(`Are you sure you want to delete tab "${tabName}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/tabs/admin/${tabId}`, {
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
            console.error('Error deleting tab:', error);
            alert('Failed to delete tab');
        }
    };

    const moveTab = async (index, direction) => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= tabs.length) return;

        const newTabs = [...tabs];
        [newTabs[index], newTabs[newIndex]] = [newTabs[newIndex], newTabs[index]];

        // Update UI optimistically
        setTabs(newTabs);

        // Send new order to server
        try {
            const orderedIds = newTabs.map(t => t.id);
            await fetch('/api/tabs/admin/reorder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ orderedIds })
            });
        } catch (error) {
            console.error('Error reordering tabs:', error);
            // Revert on error
            fetchTabs();
        }
    };

    const renderIcon = (iconValue) => {
        if (iconValue && iconValue.startsWith('data:image')) {
            return (
                <img
                    src={iconValue}
                    alt="icon"
                    className="w-5 h-5 object-cover rounded"
                />
            );
        }
        const IconComponent = Icons[iconValue] || Icons.Server;
        return <IconComponent size={20} />;
    };

    if (loading) {
        return <div className="text-center py-16 text-slate-400">Loading tabs...</div>;
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold mb-2 text-white">
                        Tabs Management
                    </h2>
                    <p className="text-slate-400 text-sm">
                        Manage sidebar tabs and iframe services
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                    <Plus size={18} />
                    <span>Add Tab</span>
                </button>
            </div>

            {/* Tabs List */}
            <div className="space-y-3">
                {tabs.map((tab, index) => (
                    <div
                        key={tab.id}
                        className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50 flex items-center justify-between gap-4"
                    >
                        {/* Tab Info */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center text-slate-300">
                                {renderIcon(tab.icon)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-white truncate">{tab.name}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tab.groupId === 'admin' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700/50 text-slate-300'
                                        }`}>
                                        {groups.find(g => g.id === tab.groupId)?.name || tab.groupId}
                                    </span>
                                    {tab.enabled === false && (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                                            Disabled
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-400 truncate">{tab.url}</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            {/* Reorder buttons */}
                            <div className="hidden sm:flex flex-col gap-1">
                                <button
                                    onClick={() => moveTab(index, 'up')}
                                    disabled={index === 0}
                                    className="p-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Move up"
                                >
                                    <ChevronUp size={14} />
                                </button>
                                <button
                                    onClick={() => moveTab(index, 'down')}
                                    disabled={index === tabs.length - 1}
                                    className="p-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Move down"
                                >
                                    <ChevronDown size={14} />
                                </button>
                            </div>

                            {/* Edit/Delete buttons */}
                            <button
                                onClick={() => handleEdit(tab)}
                                className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                                title="Edit tab"
                            >
                                <Edit size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete(tab.id, tab.name)}
                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                title="Delete tab"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {tabs.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <Layout size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No tabs yet. Create your first tab to get started.</p>
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
                                {modalMode === 'create' ? 'Create Tab' : 'Edit Tab'}
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
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="Radarr"
                                />
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
                                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="http://radarr:7878"
                                />
                            </div>

                            <div>
                                <label className="block mb-2 font-medium text-slate-300 text-sm">
                                    Icon
                                </label>
                                <IconPicker
                                    value={formData.icon}
                                    onChange={(val) => setFormData({ ...formData, icon: val })}
                                />
                            </div>

                            <div>
                                <label className="block mb-2 font-medium text-slate-300 text-sm">
                                    Group
                                </label>
                                <select
                                    value={formData.groupId}
                                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                                >
                                    {groups.map(group => (
                                        <option key={group.id} value={group.id}>
                                            {group.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                                <div>
                                    <label className="font-medium text-slate-300">Enabled</label>
                                    <p className="text-xs text-slate-500">Show this tab in sidebar</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${formData.enabled ? 'bg-blue-600' : 'bg-slate-600'
                                        }`}
                                >
                                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${formData.enabled ? 'translate-x-6' : 'translate-x-0'
                                        }`} />
                                </button>
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
                                    {modalMode === 'create' ? 'Create Tab' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TabsSettings;
