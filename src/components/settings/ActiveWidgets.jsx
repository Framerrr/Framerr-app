import React, { useState, useEffect } from 'react';
import { Trash2, Info, Loader, X, Search } from 'lucide-react';
import * as Icons from 'lucide-react';
import { getWidgetMetadata, getWidgetIconName } from '../../utils/widgetRegistry';
import axios from 'axios';
import IconPicker from '../IconPicker';
import logger from '../../utils/logger';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

// Popular icons for quick selection - 126 validated icons (same as IconPicker)
const POPULAR_ICONS = [
    // Core & System
    'Server', 'Monitor', 'Settings', 'Home', 'Database', 'HardDrive',
    // Media & Entertainment
    'Film', 'Tv', 'Video', 'Music', 'Camera', 'Image', 'Headphones',
    'Radio', 'Clapperboard', 'Play', 'Pause', 'SkipForward', 'SkipBack',
    'Volume', 'Volume2', 'VolumeX', 'Mic', 'MicOff', 'ImagePlus',
    'Disc', 'Library', 'Podcast', 'Airplay', 'Cast',
    // System & Hardware
    'Cpu', 'MemoryStick', 'Network', 'Printer', 'Smartphone', 'Tablet',
    'Watch', 'Laptop', 'MonitorDot', 'MonitorPlay', 'BatteryCharging',
    'Battery', 'Power', 'Zap', 'Plug',
    // Files & Storage
    'Folder', 'FolderOpen', 'File', 'FileText', 'FilePlus', 'Files',
    'Save', 'Download', 'Upload', 'Cloud', 'CloudUpload', 'CloudDownload',
    // Communication & Social
    'Mail', 'Send', 'MessageCircle', 'MessageSquare', 'Phone', 'PhoneCall',
    'Users', 'User', 'UserPlus', 'UserCheck', 'Share2', 'ThumbsUp',
    'Eye', 'EyeOff', 'Bell', 'BellOff',
    // Navigation & Actions
    'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ChevronRight',
    'ChevronLeft', 'ChevronUp', 'ChevronDown', 'Menu', 'MoreVertical',
    'MoreHorizontal', 'ExternalLink', 'Link', 'Unlink', 'Navigation',
    'Navigation2', 'Compass',
    // Status & Alerts
    'CheckCircle', 'CheckCircle2', 'XCircle', 'AlertCircle', 'AlertTriangle',
    'Info', 'HelpCircle', 'AlertOctagon', 'ShieldAlert', 'ShieldCheck',
    // Productivity & Tools
    'Calendar', 'Clock', 'Timer', 'CalendarDays', 'CalendarCheck',
    'Clipboard', 'ClipboardCheck', 'Search', 'Filter', 'SortAsc',
    'SortDesc', 'Wrench', 'Sliders', 'Gauge', 'RefreshCw',
    // Data & Charts
    'BarChart', 'BarChart2', 'PieChart', 'TrendingUp', 'TrendingDown',
    'Activity', 'Target', 'Award', 'Layers', 'Grid',
    // Security
    'Shield', 'Lock', 'Unlock', 'Key', 'ShieldOff',
    // Weather & Nature
    'Sun', 'Moon', 'CloudRain', 'CloudSnow', 'Wind', 'Thermometer',
    'Sunrise', 'Sunset',
    // Actions & Editing
    'Edit', 'Edit2', 'Plus', 'Minus', 'X', 'Trash2', 'Copy',
    'Scissors', 'RotateCw', 'RotateCcw', 'Maximize', 'Minimize',
    'Maximize2', 'Minimize2',
    // Favorites & Bookmarks
    'Heart', 'Star', 'Bookmark', 'Flag', 'Gift', 'Package',
    // Location & Maps  
    'Globe', 'Map', 'MapPin', 'MapPinned',
    // Code & Development
    'Code', 'Code2', 'Terminal', 'Box', 'Layout', 'LayoutGrid'
];

/**
 * Active Widgets - Manage widgets currently on dashboard
 */
const ActiveWidgets = () => {
    const [widgets, setWidgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [removingWidget, setRemovingWidget] = useState(null);
    const [iconPickerOpen, setIconPickerOpen] = useState(null); // Track which widget's picker is open
    const [iconSearch, setIconSearch] = useState('');

    useEffect(() => {
        fetchWidgets();
    }, []);

    const fetchWidgets = async () => {
        try {
            const response = await axios.get('/api/widgets');
            setWidgets(response.data.widgets || []);
        } catch (error) {
            logger.error('Failed to fetch widgets', { error: error.message });
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
            logger.error('Failed to remove widget', { widgetId, error: error.message });
            alert('Failed to remove widget. Please try again.');
        } finally {
            setRemovingWidget(null);
        }
    };

    const handleIconSelect = async (widgetId, iconName) => {
        const updatedWidgets = widgets.map(w =>
            w.id === widgetId
                ? { ...w, config: { ...w.config, customIcon: iconName } }
                : w
        );

        setWidgets(updatedWidgets);

        try {
            await axios.put('/api/widgets', { widgets: updatedWidgets });
            setIconPickerOpen(null);
            setIconSearch('');
        } catch (error) {
            logger.error('Failed to update widget icon', { widgetId, error: error.message });
            fetchWidgets();
        }
    };

    if (loading) {
        return <div className="text-center py-16 text-theme-secondary">Loading widgets...</div>;
    }

    if (widgets.length === 0) {
        return (
            <div className="text-center py-16">
                <Info size={48} className="mx-auto mb-4 text-theme-tertiary" />
                <p className="text-lg text-theme-secondary mb-2">No widgets on your dashboard yet</p>
                <p className="text-sm text-theme-tertiary">Go to Widget Gallery to add some!</p>
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

    const filteredIcons = POPULAR_ICONS.filter(icon =>
        icon.toLowerCase().includes(iconSearch.toLowerCase())
    );

    return (
        <div className="fade-in">
            {/* Stats */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-subtle shadow-medium rounded-xl p-4 border border-theme">
                    <div className="text-2xl font-bold text-theme-primary">{stats.total}</div>
                    <div className="text-sm text-theme-secondary">Total Widgets</div>
                </div>
                <div className="glass-subtle shadow-medium rounded-xl p-4 border border-theme">
                    <div className="text-2xl font-bold text-theme-primary">{Object.keys(stats.byType).length}</div>
                    <div className="text-sm text-theme-secondary">Widget Types</div>
                </div>
                <div className="glass-subtle shadow-medium rounded-xl p-4 border border-theme">
                    <div className="text-2xl font-bold text-theme-primary">
                        {Math.round(widgets.reduce((sum, w) => sum + (w.w * w.h), 0) / stats.total)}
                    </div>
                    <div className="text-sm text-theme-secondary">Avg Size (cells)</div>
                </div>
            </div>

            {/* Widget List */}
            <div className="space-y-4">
                {widgets.map(widget => {
                    const metadata = getWidgetMetadata(widget.type);
                    const customIcon = widget.config?.customIcon;

                    return (
                        <div
                            key={widget.id}
                            className="glass-subtle shadow-medium rounded-xl p-6 border border-theme card-glow"
                        >
                            {/* Header Row */}
                            <div className="flex items-start gap-4 mb-4">
                                {/* Icon - Using Centralized IconPicker */}
                                <div className="flex-shrink-0">
                                    <IconPicker
                                        value={customIcon || getWidgetIconName(widget.type)}
                                        onChange={(iconName) => handleIconSelect(widget.id, iconName)}
                                    />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-theme-primary mb-1">
                                        {widget.config?.title || metadata.name}
                                    </h4>
                                    <div className="flex items-center gap-3 text-xs text-theme-secondary">
                                        <span>Type: {metadata.name}</span>
                                        <span>•</span>
                                        <span>Size: {widget.w}x{widget.h}</span>
                                        <span>•</span>
                                        <span>Position: ({widget.x}, {widget.y})</span>
                                    </div>
                                </div>

                                {/* Delete Button */}
                                <div className="flex-shrink-0">
                                    <Button
                                        onClick={() => handleRemove(widget.id)}
                                        disabled={removingWidget === widget.id}
                                        variant="ghost"
                                        size="sm"
                                        className="text-error hover:bg-error/10"
                                        title="Remove widget"
                                    >
                                        {removingWidget === widget.id ? (
                                            <Loader size={18} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={18} />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Customization Section */}
                            <div className="space-y-3 pt-3 border-t border-theme">
                                {/* Custom Name Input */}
                                <Input
                                    label="Custom Name"
                                    placeholder={metadata.name}
                                    value={widget.config?.customName || ''}
                                    onChange={async (e) => {
                                        const updatedWidgets = widgets.map(w =>
                                            w.id === widget.id
                                                ? { ...w, config: { ...w.config, customName: e.target.value, title: e.target.value || metadata.name } }
                                                : w
                                        );
                                        setWidgets(updatedWidgets);
                                        try {
                                            await axios.put('/api/widgets', { widgets: updatedWidgets });
                                        } catch (error) {
                                            logger.error('Failed to update widget custom name', { widgetId: widget.id, error: error.message });
                                            fetchWidgets();
                                        }
                                    }}
                                />

                                {/* Toggle Options */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Flatten Mode Toggle */}
                                    <div className="flex items-center justify-between p-3 bg-theme-tertiary/30 rounded-lg border border-theme">
                                        <div>
                                            <div className="text-sm font-medium text-theme-primary">Flat Design</div>
                                            <div className="text-xs text-theme-tertiary mt-0.5">Remove glassmorphism</div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={widget.config?.flatten || false}
                                                onChange={async (e) => {
                                                    const updatedWidgets = widgets.map(w =>
                                                        w.id === widget.id
                                                            ? { ...w, config: { ...w.config, flatten: e.target.checked } }
                                                            : w
                                                    );
                                                    setWidgets(updatedWidgets);
                                                    try {
                                                        await axios.put('/api/widgets', { widgets: updatedWidgets });
                                                        // Dispatch event to refresh widget live
                                                        window.dispatchEvent(new CustomEvent('widget-config-updated', {
                                                            detail: { widgetId: widget.id }
                                                        }));
                                                    } catch (error) {
                                                        logger.error('Failed to update widget flatten setting', { widgetId: widget.id, error: error.message });
                                                        alert('Failed to update widget. Please try again.');
                                                        fetchWidgets();
                                                    }
                                                }}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-theme-tertiary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                                        </label>
                                    </div>

                                    {/* Header Toggle - Not available for link-grid */}
                                    {widget.type !== 'link-grid' && (
                                        <div className="flex items-center justify-between p-3 bg-theme-tertiary/30 rounded-lg border border-theme">
                                            <div>
                                                <div className="text-sm font-medium text-theme-primary">Header</div>
                                                <div className="text-xs text-theme-tertiary mt-0.5">Show icon and name</div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={widget.config?.showHeader !== false}
                                                    onChange={async (e) => {
                                                        const updatedWidgets = widgets.map(w =>
                                                            w.id === widget.id
                                                                ? { ...w, config: { ...w.config, showHeader: e.target.checked } }
                                                                : w
                                                        );
                                                        setWidgets(updatedWidgets);
                                                        try {
                                                            await axios.put('/api/widgets', { widgets: updatedWidgets });
                                                            // Dispatch event to refresh widget live
                                                            window.dispatchEvent(new CustomEvent('widget-config-updated', {
                                                                detail: { widgetId: widget.id }
                                                            }));
                                                        } catch (error) {
                                                            logger.error('Failed to update widget header setting', { widgetId: widget.id, error: error.message });
                                                            alert('Failed to update widget. Please try again.');
                                                            fetchWidgets();
                                                        }
                                                    }}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-theme-tertiary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ActiveWidgets;
