import React, { useState, useEffect } from 'react';
import { X, Search, Upload } from 'lucide-react';
import * as Icons from 'lucide-react';
import logger from '../utils/logger';

// Popular icons for quick selection - 126 validated icons
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

const IconPicker = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('icons'); // 'icons' or 'upload'
    const [uploadedIcons, setUploadedIcons] = useState([]);
    const [loadingIcons, setLoadingIcons] = useState(false);

    // Fetch uploaded icons when component mounts
    useEffect(() => {
        fetchUploadedIcons();
    }, []);

    const fetchUploadedIcons = async () => {
        try {
            setLoadingIcons(true);
            const response = await fetch('/api/custom-icons', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setUploadedIcons(data.icons || []);
            }
        } catch (error) {
            logger.error('Failed to fetch uploaded icons:', error);
        } finally {
            setLoadingIcons(false);
        }
    };

    // Get current icon component
    const getCurrentIcon = () => {
        // Handle custom uploaded icons
        if (value && value.startsWith('custom:')) {
            const iconId = value.replace('custom:', '');
            return () => (
                <img
                    src={`/api/custom-icons/${iconId}/file`}
                    alt="custom icon"
                    className="w-5 h-5 object-cover rounded"
                />
            );
        }
        // Handle legacy base64 images
        if (value && value.startsWith('data:image')) {
            return () => (
                <img
                    src={value}
                    alt="icon"
                    className="w-5 h-5 object-cover rounded"
                />
            );
        }
        // Handle Lucide icons
        return Icons[value] || Icons.Server;
    };

    // Get friendly display name for current icon
    const getIconDisplayName = () => {
        if (!value) return 'Server';

        // Handle custom uploaded icons - show original filename
        if (value.startsWith('custom:')) {
            const iconId = value.replace('custom:', '');
            const customIcon = uploadedIcons.find(icon => icon.id === iconId);
            if (customIcon) {
                // Remove file extension and return clean name
                return customIcon.originalName.replace(/\.[^/.]+$/, '');
            }
            return 'Custom Icon';
        }

        // Handle legacy base64 - show generic name
        if (value.startsWith('data:image')) {
            return 'Uploaded Image';
        }

        // Lucide icon - show icon name with spaces
        return value.replace(/([A-Z])/g, ' $1').trim();
    };

    const CurrentIcon = getCurrentIcon();

    // Filter icons based on search
    const filteredIcons = POPULAR_ICONS.filter(icon =>
        icon.toLowerCase().includes(search.toLowerCase())
    );

    const handleIconSelect = (iconName) => {
        onChange(iconName);
        setIsOpen(false);
        setSearch('');
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('icon', file);

        try {
            const response = await fetch('/api/custom-icons', {
                method: 'POST',
                credentials: 'include',
                body: formData
                // Don't set Content-Type - browser will set it with boundary for multipart/form-data
            });

            if (response.ok) {
                const data = await response.json();
                // Set the newly uploaded icon as selected
                onChange(`custom:${data.icon.id}`);
                // Refresh the icons list
                await fetchUploadedIcons();
                setIsOpen(false);
            } else {
                alert('Failed to upload icon');
            }
        } catch (error) {
            logger.error('Failed to upload icon:', error);
            alert('Failed to upload icon');
        }

        // Reset the input
        e.target.value = '';
    };

    const handleDeleteIcon = async (iconId) => {
        if (!confirm('Delete this custom icon? This cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/custom-icons/${iconId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                // Refresh the icon list
                await fetchUploadedIcons();
                // If the deleted icon was selected, clear selection
                if (value === `custom:${iconId}`) {
                    onChange('Server');
                }
            } else {
                alert('Failed to delete icon');
            }
        } catch (error) {
            logger.error('Failed to delete icon:', error);
            alert('Failed to delete icon');
        }
    };

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white hover:border-blue-500 transition-colors w-full"
                title={getIconDisplayName()} // Tooltip shows icon name
            >
                <CurrentIcon size={20} />
                <span className="flex-1 text-left truncate">{getIconDisplayName()}</span>
                <Search size={16} className="text-slate-400" />
            </button>

            {/* Modal */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setIsOpen(false);
                            }
                        }}
                    />

                    {/* Picker Modal */}
                    <div className="absolute top-full left-0 mt-2 w-full md:w-96 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <h3 className="font-semibold text-white">Select Icon</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-700">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab('icons');
                                }}
                                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'icons'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                Icons
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab('upload');
                                }}
                                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'upload'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                Upload
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 max-h-96 overflow-y-auto">
                            {activeTab === 'icons' ? (
                                <>
                                    {/* Search */}
                                    <div className="mb-4">
                                        <div className="relative">
                                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                placeholder="Search icons..."
                                                className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* Icon Grid */}
                                    <div className="grid grid-cols-6 gap-2">
                                        {filteredIcons.map(iconName => {
                                            const IconComponent = Icons[iconName] || Icons.Server;
                                            const isSelected = value === iconName;

                                            return (
                                                <button
                                                    key={iconName}
                                                    type="button"
                                                    onClick={() => handleIconSelect(iconName)}
                                                    className={`p-3 rounded-lg transition-colors ${isSelected
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white'
                                                        }`}
                                                    title={iconName}
                                                >
                                                    <IconComponent size={20} />
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {filteredIcons.length === 0 && (
                                        <div className="text-center py-8 text-slate-400">
                                            No icons found matching "{search}"
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* Upload Tab */
                                <div className="space-y-4">
                                    {/* Upload Button */}
                                    <label className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors w-full">
                                        <Upload size={18} />
                                        <span>Upload New Icon</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                    </label>
                                    <p className="text-xs text-slate-500 text-center">
                                        Recommended: 512x512px, PNG or SVG (max 5MB)
                                    </p>

                                    {/* Uploaded Icons Grid */}
                                    {loadingIcons ? (
                                        <div className="text-center py-8 text-slate-400">
                                            Loading uploaded icons...
                                        </div>
                                    ) : uploadedIcons.length > 0 ? (
                                        <>
                                            <h4 className="text-sm font-medium text-slate-300 mt-4">Uploaded Icons</h4>
                                            <div className="grid grid-cols-4 gap-2">
                                                {uploadedIcons.map((icon) => {
                                                    const isSelected = value === `custom:${icon.id}`;
                                                    return (
                                                        <div
                                                            key={icon.id}
                                                            className="relative group"
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => handleIconSelect(`custom:${icon.id}`)}
                                                                className={`w-full aspect-square p-2 rounded-lg transition-colors ${isSelected
                                                                    ? 'bg-blue-600 ring-2 ring-blue-400'
                                                                    : 'bg-slate-700/50 hover:bg-slate-700'
                                                                    }`}
                                                                title={icon.originalName}
                                                            >
                                                                <img
                                                                    src={`/api/custom-icons/${icon.id}/file`}
                                                                    alt={icon.originalName}
                                                                    className="w-full h-full object-contain"
                                                                />
                                                            </button>
                                                            {/* Delete Button - Shows on hover */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteIcon(icon.id)}
                                                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                                title="Delete icon"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-8 text-slate-400">
                                            <Upload size={48} className="mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No uploaded icons yet</p>
                                            <p className="text-xs mt-1">Upload your first custom icon above!</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default IconPicker;
