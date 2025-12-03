import React, { useState, useEffect } from 'react';
import { Trash2, Info, Loader } from 'lucide-react';
import { getWidgetMetadata } from '../../utils/widgetRegistry';
import axios from 'axios';

/**
 * Active Widgets - Manage widgets currently on dashboard
 */
const ActiveWidgets = () => {
    const [widgets, setWidgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [removingWidget, setRemovingWidget] = useState(null);

    useEffect(() => {
        fetchWidgets();
    }, []);

    const fetchWidgets = async () => {
        try {
            const response = await axios.get('/api/widgets');
            setWidgets(response.data.widgets || []);
        } catch (error) {
            console.error('Failed to fetch widgets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (widgetId) => {
        if (!confirm('Remove this widget from your dashboard?')) return;

        setRemovingWidget(widgetId);

        try {
            const updatedWidgets = widgets.filter(w => w.id !== widgetId);
            await axios.put('/api/widgets', { widgets: updatedWidgets });
            setWidgets(updatedWidgets);
        } catch (error) {
            console.error('Failed to remove widget:', error);
            alert('Failed to remove widget. Please try again.');
        } finally {
            setRemovingWidget(null);
        }
    };

    if (loading) {
        return <div className="text-center py-16 text-slate-400">Loading widgets...</div>;
    }

    if (widgets.length === 0) {
        return (
            <div className="text-center py-16">
                <Info size={48} className="mx-auto mb-4 text-slate-500" />
                <p className="text-lg text-slate-400 mb-2">No widgets on your dashboard yet</p>
                <p className="text-sm text-slate-500">Go to Widget Gallery to add some!</p>
            </div>
        );
    }

    // Calculate stats
    const stats = {
        total: widgets.length,
        byType: widgets.reduce((acc, w) => {
            acc[w.type] = (acc[w.type] || 0) + 1;
            return acc;
        }, {})
    };

    return (
        <div className="fade-in">
            {/* Stats */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-subtle shadow-medium rounded-xl p-4 border border-slate-700/50">
                    <div className="text-2xl font-bold text-white">{stats.total}</div>
                    <div className="text-sm text-slate-400">Total Widgets</div>
                </div>
                <div className="glass-subtle shadow-medium rounded-xl p-4 border border-slate-700/50">
                    <div className="text-2xl font-bold text-white">{Object.keys(stats.byType).length}</div>
                    <div className="text-sm text-slate-400">Widget Types</div>
                </div>
                <div className="glass-subtle shadow-medium rounded-xl p-4 border border-slate-700/50">
                    <div className="text-2xl font-bold text-white">
                        {Math.round(widgets.reduce((sum, w) => sum + (w.w * w.h), 0) / stats.total)}
                    </div>
                    <div className="text-sm text-slate-400">Avg Size (cells)</div>
                </div>
            </div>

            {/* Widget List */}
            <div className="space-y-3">
                {widgets.map(widget => {
                    const metadata = getWidgetMetadata(widget.type);
                    const Icon = metadata.icon;

                    return (
                        <div
                            key={widget.id}
                            className="glass-subtle shadow-medium rounded-xl p-4 border border-slate-700/50 flex items-center gap-4"
                        >
                            {/* Icon */}
                            <div className="p-3 bg-accent/20 rounded-lg">
                                <Icon size={20} className="text-accent" />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-white mb-1">
                                    {widget.config?.title || metadata.name}
                                </h4>
                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                    <span>Type: {metadata.name}</span>
                                    <span>•</span>
                                    <span>Size: {widget.w}x{widget.h}</span>
                                    <span>•</span>
                                    <span>Position: ({widget.x}, {widget.y})</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <button
                                onClick={() => handleRemove(widget.id)}
                                disabled={removingWidget === widget.id}
                                className="p-2.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                title="Remove widget"
                            >
                                {removingWidget === widget.id ? (
                                    <Loader size={18} className="animate-spin" />
                                ) : (
                                    <Trash2 size={18} />
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ActiveWidgets;
