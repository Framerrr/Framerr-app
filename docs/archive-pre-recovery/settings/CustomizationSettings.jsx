import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Palette, RotateCcw, Save, Image as ImageIcon, Settings as SettingsIcon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

import { isAdmin } from '../../utils/permissions';
import ColorPicker from '../common/ColorPicker';
import FaviconSettings from './FaviconSettings';
import logger from '../../utils/logger';

const CustomizationSettings = () => {
    const [activeSubTab, setActiveSubTab] = useState('general');
    const { theme, themes, changeTheme } = useTheme();
    const { user } = useAuth();
    const userIsAdmin = isAdmin(user);

    // Default color values matching dark-pro.css
    const defaultColors = {
        'bg-primary': '#0a0e1a',
        'bg-secondary': '#151922',
        'accent': '#3b82f6',
        'accent-secondary': '#06b6d4',
        'text-primary': '#f1f5f9',
        'text-secondary': '#94a3b8',
        'border': '#374151',
    };

    // Custom colors state - using kebab-case to match CSS variables
    const [customColors, setCustomColors] = useState(defaultColors);
    const [useCustomColors, setUseCustomColors] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    // Application name state
    const [applicationName, setApplicationName] = useState('Homelab Dashboard');
    const [savingAppName, setSavingAppName] = useState(false);

    // Flatten UI state
    const [flattenUI, setFlattenUI] = useState(false);
    const [savingFlattenUI, setSavingFlattenUI] = useState(false);

    // Dashboard greeting state
    const [greetingEnabled, setGreetingEnabled] = useState(true);
    const [greetingText, setGreetingText] = useState('Your personal dashboard');
    const [savingGreeting, setSavingGreeting] = useState(false);

    // Load custom colors and application name from backend on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                // Load user colors
                const userResponse = await axios.get('/api/config/user', {
                    withCredentials: true
                });

                if (userResponse.data?.theme?.customColors) {
                    setCustomColors(userResponse.data.theme.customColors);

                    // If user has custom theme mode set, apply colors
                    if (userResponse.data.theme.mode === 'custom') {
                        setUseCustomColors(true);
                        applyColorsToDOM(userResponse.data.theme.customColors);
                    }
                }

                // Load system config for application name
                const systemResponse = await axios.get('/api/config/system', {
                    withCredentials: true
                });

                if (systemResponse.data?.server?.name) {
                    setApplicationName(systemResponse.data.server.name);
                }

                // Load flatten UI preference
                if (userResponse.data?.ui?.flattenUI !== undefined) {
                    const shouldFlatten = userResponse.data.ui.flattenUI;
                    setFlattenUI(shouldFlatten);
                    // Apply to document
                    if (shouldFlatten) {
                        document.documentElement.classList.add('flatten-ui');
                    }
                }

                // Load greeting preferences
                if (userResponse.data?.preferences?.dashboardGreeting) {
                    const greeting = userResponse.data.preferences.dashboardGreeting;
                    setGreetingEnabled(greeting.enabled ?? true);
                    setGreetingText(greeting.text || 'Your personal dashboard');
                }
            } catch (error) {
                logger.error('Failed to load settings:', error);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, []);

    const applyColorsToDOM = (colors) => {
        Object.entries(colors).forEach(([key, value]) => {
            document.documentElement.style.setProperty(`--${key}`, value);
        });
    };

    const handleColorChange = (key, value) => {
        setCustomColors(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveCustomColors = async () => {
        setSaving(true);
        try {
            // Save to backend
            await axios.put('/api/config/user', {
                theme: {
                    mode: 'custom',
                    customColors: customColors
                }
            }, {
                withCredentials: true
            });

            setUseCustomColors(true);
            applyColorsToDOM(customColors);
        } catch (error) {
            logger.error('Failed to save custom colors:', error);
            alert('Failed to save custom colors. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleResetColors = async () => {
        try {
            // Reset to default colors
            setCustomColors(defaultColors);
            setUseCustomColors(false);

            // Save default theme mode to backend
            await axios.put('/api/config/user', {
                theme: {
                    mode: 'dark-pro',
                    customColors: defaultColors
                }
            }, {
                withCredentials: true
            });

            // Remove custom CSS variables (will fall back to theme defaults)
            Object.keys(customColors).forEach(key => {
                document.documentElement.style.removeProperty(`--${key}`);
            });
        } catch (error) {
            logger.error('Failed to reset colors:', error);
            alert('Failed to reset colors. Please try again.');
        }
    };

    const handleSaveApplicationName = async () => {
        setSavingAppName(true);
        try {
            await axios.put('/api/config/system', {
                server: {
                    name: applicationName
                }
            }, {
                withCredentials: true
            });

            // Dispatch event to update browser tab title immediately
            window.dispatchEvent(new CustomEvent('appNameUpdated', {
                detail: { appName: applicationName }
            }));

            logger.info('Application name saved successfully');
        } catch (error) {
            logger.error('Failed to save application name:', error);
            alert('Failed to save application name. Please try again.');
        } finally {
            setSavingAppName(false);
        }
    };

    const handleToggleFlattenUI = async (value) => {
        setSavingFlattenUI(true);
        try {
            await axios.put('/api/config/user', {
                ui: { flattenUI: value }
            }, { withCredentials: true });

            setFlattenUI(value);

            // Toggle class on document element
            if (value) {
                document.documentElement.classList.add('flatten-ui');
            } else {
                document.documentElement.classList.remove('flatten-ui');
            }

            logger.info('Flatten UI preference saved');
        } catch (error) {
            logger.error('Failed to save flatten UI preference:', error);
            alert('Failed to save flatten UI preference.');
        } finally {
            setSavingFlattenUI(false);
        }
    };

    const handleSaveGreeting = async () => {
        setSavingGreeting(true);
        try {
            await axios.put('/api/config/user', {
                preferences: {
                    dashboardGreeting: {
                        enabled: greetingEnabled,
                        text: greetingText
                    }
                }
            }, {
                withCredentials: true
            });

            logger.info('Greeting saved successfully');
        } catch (error) {
            logger.error('Failed to save greeting:', error);
            alert('Failed to save greeting. Please try again.');
        } finally {
            setSavingGreeting(false);
        }
    };

    const handleResetGreeting = () => {
        setGreetingEnabled(true);
        setGreetingText('Your personal dashboard');
    };


    return (
        <div className="space-y-6 fade-in">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold mb-2 text-white">
                    Customization
                </h2>
                <p className="text-sm text-slate-400">
                    Personalize your dashboard appearance with colors and branding
                </p>
            </div>

            {/* Sub-Tabs */}
            <div className="flex gap-2 border-b border-slate-700">
                <button
                    onClick={() => setActiveSubTab('general')}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeSubTab === 'general'
                        ? 'border-accent text-accent'
                        : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                >
                    <SettingsIcon size={18} className="inline mr-2" />
                    General
                </button>
                <button
                    onClick={() => setActiveSubTab('colors')}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeSubTab === 'colors'
                        ? 'border-accent text-accent'
                        : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                >
                    <Palette size={18} className="inline mr-2" />
                    Colors
                </button>
                <button
                    onClick={() => setActiveSubTab('favicon')}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeSubTab === 'favicon'
                        ? 'border-accent text-accent'
                        : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                >
                    <ImageIcon size={18} className="inline mr-2" />
                    Favicon
                </button>
            </div>

            {/* Content - CrossFade between tabs */}
            <div style={{ position: 'relative' }}>
                <div
                    style={{
                        opacity: activeSubTab === 'general' ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                        position: activeSubTab === 'general' ? 'relative' : 'absolute',
                        visibility: activeSubTab === 'general' ? 'visible' : 'hidden',
                        width: '100%',
                        top: 0
                    }}
                >
                    <div className="space-y-6">
                        {/* Application Name Section */}
                        <div className="rounded-xl p-6 border border-slate-700/50 bg-slate-900/30" style={{ transition: 'all 0.3s ease' }}>
                            <h3 className="text-lg font-semibold text-white mb-4">
                                Application Name
                            </h3>
                            <p className="text-sm text-slate-400 mb-4">
                                Customize the application name displayed in the sidebar and throughout the dashboard.
                                {!userIsAdmin && (
                                    <span className="block mt-2 text-amber-400">
                                        ⚠️ This setting requires admin privileges
                                    </span>
                                )}
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Application Name
                                    </label>
                                    <input
                                        type="text"
                                        value={applicationName}
                                        onChange={(e) => setApplicationName(e.target.value)}
                                        disabled={!userIsAdmin}
                                        maxLength={50}
                                        placeholder="Homelab Dashboard"
                                        className={`input-glow w-full px-4 py-3 bg-slate-900 border rounded-lg text-white placeholder-slate-500 transition-all ${userIsAdmin
                                            ? 'border-slate-700 focus:outline-none focus:border-accent'
                                            : 'border-slate-800 opacity-50 cursor-not-allowed'
                                            }`}
                                    />
                                    <p className="text-xs text-slate-500 mt-2">
                                        {applicationName.length}/50 characters
                                    </p>
                                </div>

                                {userIsAdmin && (
                                    <button
                                        onClick={handleSaveApplicationName}
                                        disabled={savingAppName}
                                        className="button-elevated px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white rounded-lg flex items-center gap-2 transition-all font-medium"
                                    >
                                        <Save size={18} />
                                        {savingAppName ? 'Saving...' : 'Save Application Name'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Dashboard Greeting Section */}
                        <div className="rounded-xl p-6 border border-slate-700/50 bg-slate-900/30" style={{ transition: 'all 0.3s ease' }}>
                            <h3 className="text-lg font-semibold text-white mb-4">
                                Dashboard Greeting
                            </h3>
                            <p className="text-sm text-slate-400 mb-6">
                                Customize the welcome message displayed on your dashboard.
                            </p>

                            <div className="space-y-6">
                                {/* Enable/Disable Toggle */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-sm font-medium text-slate-300">
                                            Show Welcome Message
                                        </label>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Display a custom greeting under your dashboard header
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={greetingEnabled}
                                            onChange={(e) => setGreetingEnabled(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                                    </label>
                                </div>

                                {/* Greeting Text Input */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Custom Greeting Text
                                    </label>
                                    <input
                                        type="text"
                                        value={greetingText}
                                        onChange={(e) => setGreetingText(e.target.value)}
                                        disabled={!greetingEnabled}
                                        maxLength={100}
                                        placeholder="Your personal dashboard"
                                        className={`input-glow w-full px-4 py-3 bg-slate-900 border rounded-lg text-white placeholder-slate-500 transition-all ${greetingEnabled
                                            ? 'border-slate-700 focus:outline-none focus:border-accent'
                                            : 'border-slate-800 opacity-50 cursor-not-allowed'
                                            }`}
                                    />
                                    <p className="text-xs text-slate-500 mt-2">
                                        {greetingText.length}/100 characters
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleSaveGreeting}
                                        disabled={savingGreeting}
                                        className="button-elevated px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white rounded-lg flex items-center gap-2 transition-all font-medium"
                                    >
                                        <Save size={18} />
                                        {savingGreeting ? 'Saving...' : 'Save Greeting'}
                                    </button>
                                    <button
                                        onClick={handleResetGreeting}
                                        className="button-elevated px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-all font-medium"
                                        title="Reset to default"
                                    >
                                        <RotateCcw size={18} />
                                        <span className="hidden sm:inline">Reset</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Flatten UI Section */}
                        <div className="rounded-xl p-6 border border-slate-700/50 bg-slate-900/30" style={{ transition: 'all 0.3s ease' }}>
                            <h3 className="text-lg font-semibold text-white mb-4">
                                Flatten UI Design
                            </h3>
                            <p className="text-sm text-slate-400 mb-6">
                                Remove glassmorphism effects, shadows, and backdrop blur for a minimal flat design aesthetic. This affects all cards and panels throughout the application.
                            </p>

                            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-white mb-1">Flatten UI Design</div>
                                    <div className="text-xs text-slate-400">
                                        {flattenUI ? 'Flat design enabled' : '3D glassmorphism enabled'}
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={flattenUI}
                                        onChange={(e) => handleToggleFlattenUI(e.target.checked)}
                                        disabled={savingFlattenUI}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        opacity: activeSubTab === 'colors' ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                        position: activeSubTab === 'colors' ? 'relative' : 'absolute',
                        visibility: activeSubTab === 'colors' ? 'visible' : 'hidden',
                        width: '100%',
                        top: 0
                    }}
                >
                    <div className="space-y-8">
                        {/* Preset Themes Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">Preset Themes</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {themes.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => {
                                            changeTheme(t.id);
                                            setUseCustomColors(false);
                                        }}
                                        className={`p-4 rounded-lg border-2 transition-all text-left ${theme === t.id && !useCustomColors
                                            ? 'border-accent bg-accent/10'
                                            : 'border-slate-700 hover:border-slate-600 bg-slate-900/30 hover:bg-slate-900/50 transition-all'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Palette size={20} className={theme === t.id && !useCustomColors ? 'text-accent' : 'text-slate-400'} />
                                                <span className="font-semibold text-white">
                                                    {t.name}
                                                </span>
                                            </div>
                                            {theme === t.id && !useCustomColors && (
                                                <span className="text-xs px-2 py-1 rounded bg-accent text-white">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-400">
                                            {t.description}
                                        </p>

                                        {/* Color Preview */}
                                        <div className="flex gap-2 mt-3">
                                            {/* Background Color */}
                                            <div className="w-8 h-8 rounded border border-slate-600" style={{
                                                backgroundColor:
                                                    t.id === 'light' ? '#ffffff' :
                                                        t.id === 'dracula' ? '#282a36' :
                                                            t.id === 'catppuccin' ? '#1e1e2e' :
                                                                t.id === 'nord' ? '#2e3440' : '#0a0e1a'
                                            }} />
                                            {/* Primary Accent */}
                                            <div className="w-8 h-8 rounded" style={{
                                                backgroundColor:
                                                    t.id === 'dark-pro' ? '#3b82f6' :
                                                        t.id === 'dracula' ? '#bd93f9' :
                                                            t.id === 'catppuccin' ? '#89b4fa' :
                                                                t.id === 'nord' ? '#88c0d0' : '#0ea5e9'
                                            }} />
                                            {/* Secondary Accent / Text */}
                                            <div className="w-8 h-8 rounded" style={{
                                                backgroundColor:
                                                    t.id === 'dark-pro' ? '#06b6d4' :
                                                        t.id === 'dracula' ? '#ff79c6' :
                                                            t.id === 'catppuccin' ? '#74c7ec' :
                                                                t.id === 'nord' ? '#81a1c1' : '#38bdf8'
                                            }} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Colors Section */}
                        <div className="border-t border-slate-700 pt-8">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Custom Colors</h3>
                                    <p className="text-sm text-slate-400 mt-1">Create your own color scheme</p>
                                </div>
                                {useCustomColors && (
                                    <span className="text-xs px-3 py-1.5 rounded bg-accent text-white">
                                        Custom Theme Active
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                {/* Background Colors */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Background</h4>
                                    <ColorPicker
                                        label="Primary Background"
                                        value={customColors['bg-primary']}
                                        onChange={(val) => handleColorChange('bg-primary', val)}
                                        description="Main background color"
                                    />
                                    <ColorPicker
                                        label="Secondary Background"
                                        value={customColors['bg-secondary']}
                                        onChange={(val) => handleColorChange('bg-secondary', val)}
                                        description="Cards and panels"
                                    />
                                </div>

                                {/* Accent Colors */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Accent</h4>
                                    <ColorPicker
                                        label="Primary Accent"
                                        value={customColors['accent']}
                                        onChange={(val) => handleColorChange('accent', val)}
                                        description="Buttons and highlights"
                                    />
                                    <ColorPicker
                                        label="Secondary Accent"
                                        value={customColors['accent-secondary']}
                                        onChange={(val) => handleColorChange('accent-secondary', val)}
                                        description="Links and secondary actions"
                                    />
                                </div>

                                {/* Text Colors */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Text</h4>
                                    <ColorPicker
                                        label="Primary Text"
                                        value={customColors['text-primary']}
                                        onChange={(val) => handleColorChange('text-primary', val)}
                                        description="Main text color"
                                    />
                                    <ColorPicker
                                        label="Secondary Text"
                                        value={customColors['text-secondary']}
                                        onChange={(val) => handleColorChange('text-secondary', val)}
                                        description="Muted text and labels"
                                    />
                                </div>

                                {/* Border Colors */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Borders</h4>
                                    <ColorPicker
                                        label="Border Color"
                                        value={customColors['border']}
                                        onChange={(val) => handleColorChange('border', val)}
                                        description="Dividers and outlines"
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleSaveCustomColors}
                                    disabled={saving}
                                    className="button-elevated px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white rounded-lg flex items-center gap-2 transition-all font-medium"
                                >
                                    <Save size={18} />
                                    {saving ? 'Saving...' : 'Apply Custom Colors'}
                                </button>
                                <button
                                    onClick={handleResetColors}
                                    className="button-elevated px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-all font-medium"
                                >
                                    <RotateCcw size={18} />
                                    Reset to Default
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        opacity: activeSubTab === 'favicon' ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                        position: activeSubTab === 'favicon' ? 'relative' : 'absolute',
                        visibility: activeSubTab === 'favicon' ? 'visible' : 'hidden',
                        width: '100%',
                        top: 0
                    }}
                >
                    <FaviconSettings />
                </div>
            </div>
        </div>
    );
};

export default CustomizationSettings;
