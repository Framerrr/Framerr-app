import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Palette, RotateCcw, Save, Image as ImageIcon, Settings as SettingsIcon, ChevronDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { isAdmin } from '../../utils/permissions';
import ColorPicker from '../common/ColorPicker';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import FaviconSettings from './FaviconSettings';
import IconPicker from '../IconPicker';
import logger from '../../utils/logger';

const CustomizationSettings = () => {
    const [activeSubTab, setActiveSubTab] = useState('general');
    const { theme, themes, changeTheme } = useTheme();
    const { user } = useAuth();
    const { error: showError, success: showSuccess } = useNotifications();
    const userIsAdmin = isAdmin(user);

    // Refs for auto-scrolling sub-tab buttons into view
    const subTabRefs = useRef({});

    // Scroll active sub-tab into view when it changes
    useEffect(() => {
        const tabButton = subTabRefs.current[activeSubTab];
        if (tabButton) {
            tabButton.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        }
    }, [activeSubTab]);

    // Default color values matching dark-pro.css - 21 customizable variables
    const defaultColors = {
        // Tier 1: Essentials (10)
        'bg-primary': '#0a0e1a',
        'bg-secondary': '#151922',
        'bg-tertiary': '#1f2937',
        'accent': '#3b82f6',
        'accent-secondary': '#06b6d4',
        'text-primary': '#f1f5f9',
        'text-secondary': '#94a3b8',
        'text-tertiary': '#64748b',
        'border': '#374151',
        'border-light': '#1f2937',

        // Tier 2: Status Colors (4)
        'success': '#10b981',
        'warning': '#f59e0b',
        'error': '#ef4444',
        'info': '#3b82f6',

        // Tier 3: Advanced (7)
        'bg-hover': '#374151',
        'accent-hover': '#2563eb',
        'accent-light': '#60a5fa',
        'border-accent': 'rgba(59, 130, 246, 0.3)',
    };

    // Custom colors state - using kebab-case to match CSS variables
    const [customColors, setCustomColors] = useState(defaultColors);
    const [useCustomColors, setUseCustomColors] = useState(false);
    const [customColorsEnabled, setCustomColorsEnabled] = useState(false); // Toggle state
    const [lastSelectedTheme, setLastSelectedTheme] = useState('dark-pro'); // For reverting
    const [autoSaving, setAutoSaving] = useState(false); // Auto-save indicator
    const saveTimerRef = useRef(null); // Debounce timer
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    // Application name state
    const [applicationName, setApplicationName] = useState('Framerr');
    const [applicationIcon, setApplicationIcon] = useState('Server');
    const [savingAppName, setSavingAppName] = useState(false);

    // Flatten UI state
    const [flattenUI, setFlattenUI] = useState(false);
    const [savingFlattenUI, setSavingFlattenUI] = useState(false);

    // Dashboard greeting state
    const [greetingEnabled, setGreetingEnabled] = useState(true);
    const [greetingText, setGreetingText] = useState('Your personal dashboard');
    const [savingGreeting, setSavingGreeting] = useState(false);

    // Collapsible sections state for Custom Colors
    const [statusColorsExpanded, setStatusColorsExpanded] = useState(false);
    const [advancedExpanded, setAdvancedExpanded] = useState(false);



    // Change tracking for save buttons
    const [originalAppName, setOriginalAppName] = useState('Framerr');
    const [originalAppIcon, setOriginalAppIcon] = useState('Server');
    const [originalGreeting, setOriginalGreeting] = useState({ enabled: true, text: 'Your personal dashboard' });
    const [hasAppNameChanges, setHasAppNameChanges] = useState(false);
    const [hasGreetingChanges, setHasGreetingChanges] = useState(false);

    // Function to get current theme colors from CSS variables
    const getCurrentThemeColors = () => {
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);

        return {
            // Tier 1: Essentials
            'bg-primary': computedStyle.getPropertyValue('--bg-primary').trim(),
            'bg-secondary': computedStyle.getPropertyValue('--bg-secondary').trim(),
            'bg-tertiary': computedStyle.getPropertyValue('--bg-tertiary').trim(),
            'accent': computedStyle.getPropertyValue('--accent').trim(),
            'accent-secondary': computedStyle.getPropertyValue('--accent-secondary').trim(),
            'text-primary': computedStyle.getPropertyValue('--text-primary').trim(),
            'text-secondary': computedStyle.getPropertyValue('--text-secondary').trim(),
            'text-tertiary': computedStyle.getPropertyValue('--text-tertiary').trim(),
            'border': computedStyle.getPropertyValue('--border').trim(),
            'border-light': computedStyle.getPropertyValue('--border-light').trim(),

            // Tier 2: Status Colors
            'success': computedStyle.getPropertyValue('--success').trim(),
            'warning': computedStyle.getPropertyValue('--warning').trim(),
            'error': computedStyle.getPropertyValue('--error').trim(),
            'info': computedStyle.getPropertyValue('--info').trim(),

            // Tier 3: Advanced
            'bg-hover': computedStyle.getPropertyValue('--bg-hover').trim(),
            'accent-hover': computedStyle.getPropertyValue('--accent-hover').trim(),
            'accent-light': computedStyle.getPropertyValue('--accent-light').trim(),
            'border-accent': computedStyle.getPropertyValue('--border-accent').trim(),
        };
    };

    // Update color pickers when theme changes (if custom colors are disabled)
    useEffect(() => {
        if (!customColorsEnabled && !loading) {
            // Small delay to ensure CSS variables are applied
            const timer = setTimeout(() => {
                const themeColors = getCurrentThemeColors();
                setCustomColors(themeColors);
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [theme, customColorsEnabled, loading]);

    // Load custom colors and application name from backend on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                // Load user colors
                const userResponse = await axios.get('/api/config/user', {
                    withCredentials: true
                });

                if (userResponse.data?.theme?.customColors) {
                    // Merge saved colors with defaults to ensure all 21 variables exist
                    // This handles migration from old 7-variable structure to new 21-variable structure
                    const mergedColors = {
                        ...defaultColors,
                        ...userResponse.data.theme.customColors
                    };

                    // If user has custom theme mode set, enable toggle and apply colors
                    if (userResponse.data.theme.mode === 'custom') {
                        setCustomColorsEnabled(true);
                        setCustomColors(mergedColors);
                        setUseCustomColors(true);
                        applyColorsToDOM(mergedColors);

                        // Load last selected theme for revert functionality
                        if (userResponse.data.theme.lastSelectedTheme) {
                            setLastSelectedTheme(userResponse.data.theme.lastSelectedTheme);
                        }
                    } else {
                        // Custom colors off - using a theme
                        setCustomColorsEnabled(false);
                        setLastSelectedTheme(userResponse.data.theme.mode);
                        // Load theme colors into pickers for display
                        const themeColors = getCurrentThemeColors();
                        setCustomColors(themeColors);
                    }
                } else {
                    // No custom colors saved - load current theme colors for display
                    setCustomColorsEnabled(false);
                    const themeColors = getCurrentThemeColors();
                    setCustomColors(themeColors);
                }

                // Load system config for application name and icon (admin only)
                if (isAdmin(user)) {
                    try {
                        const systemResponse = await axios.get('/api/config/system', {
                            withCredentials: true
                        });

                        if (systemResponse.data?.server?.name) {
                            const name = systemResponse.data.server.name;
                            setApplicationName(name);
                            setOriginalAppName(name);
                        }

                        if (systemResponse.data?.server?.icon) {
                            const icon = systemResponse.data.server.icon;
                            setApplicationIcon(icon);
                            setOriginalAppIcon(icon);
                        }

                        // Load iframe auth settings from system config
                        if (systemResponse.data?.iframeAuth) {
                            const authConfig = systemResponse.data.iframeAuth;
                            setIframeAuthEnabled(authConfig.enabled !== false); // Default true
                            setAuthSensitivity(authConfig.sensitivity || 'balanced');
                            setCustomAuthPatterns(authConfig.customPatterns || []);
                        }
                    } catch (error) {
                        // Silently handle 403 (expected for non-admins after race condition)
                        if (error.response?.status !== 403) {
                            logger.error('Failed to load system config:', error);
                        }
                    }
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
                    const enabled = greeting.enabled ?? true;
                    const text = greeting.text || 'Your personal dashboard';
                    setGreetingEnabled(enabled);
                    setGreetingText(text);
                    setOriginalGreeting({ enabled, text });
                }
            } catch (error) {
                logger.error('Failed to load settings:', error);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, []);

    // Track changes for Application Name & Icon
    useEffect(() => {
        setHasAppNameChanges(
            applicationName !== originalAppName ||
            applicationIcon !== originalAppIcon
        );
    }, [applicationName, applicationIcon, originalAppName, originalAppIcon]);

    // Track changes for Greeting
    useEffect(() => {
        setHasGreetingChanges(
            greetingEnabled !== originalGreeting.enabled ||
            greetingText !== originalGreeting.text
        );
    }, [greetingEnabled, greetingText, originalGreeting]);

    const applyColorsToDOM = (colors) => {
        Object.entries(colors).forEach(([key, value]) => {
            document.documentElement.style.setProperty(`--${key}`, value);
        });
    };

    const removeColorsFromDOM = () => {
        // Remove all custom color CSS variables to let theme CSS take over
        Object.keys(defaultColors).forEach(key => {
            document.documentElement.style.removeProperty(`--${key}`);
        });
    };

    const resetToThemeColors = async (themeId) => {
        // Smart reset: remove custom colors, switch theme, wait, then read and apply theme colors
        removeColorsFromDOM();

        // Await theme change to ensure it completes
        await changeTheme(themeId);

        // Force a reflow to ensure CSS changes are applied
        document.documentElement.offsetHeight;

        // Wait for theme CSS to fully load and apply (increased to 500ms)
        await new Promise(resolve => setTimeout(resolve, 500));

        // Read theme colors from DOM
        const themeColors = getCurrentThemeColors();

        // Update state for color pickers
        setCustomColors(themeColors);

        return themeColors;
    };


    const handleColorChange = (key, value) => {
        if (!customColorsEnabled) return; // Only allow changes when enabled

        setCustomColors(prev => {
            const updated = { ...prev, [key]: value };

            // Clear existing timer
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }

            // Set auto-saving indicator
            setAutoSaving(true);

            // Debounce auto-save (500ms after last change)
            saveTimerRef.current = setTimeout(async () => {
                try {
                    // Apply colors to DOM immediately
                    applyColorsToDOM(updated);

                    // Save to backend
                    await axios.put('/api/config/user', {
                        theme: {
                            mode: 'custom',
                            customColors: updated,
                            lastSelectedTheme: lastSelectedTheme
                        }
                    }, {
                        withCredentials: true
                    });

                    setUseCustomColors(true);
                } catch (error) {
                    logger.error('Failed to auto-save custom colors:', error);
                } finally {
                    setAutoSaving(false);
                }
            }, 500);

            return updated;
        });
    };

    const handleToggleCustomColors = async (enabled) => {
        if (enabled) {
            // Turn ON custom colors
            setCustomColorsEnabled(true);
            setLastSelectedTheme(theme); // Save current theme
            setUseCustomColors(false); // Deselect theme in preset picker
            // customColors already contains theme colors from load, user can now edit
        } else {
            // Turn OFF custom colors - revert to last selected theme
            setCustomColorsEnabled(false);
            setUseCustomColors(false);

            // Smart reset to theme (removes custom colors, applies theme, waits, updates pickers)
            await resetToThemeColors(lastSelectedTheme);

            // Save to backend
            try {
                await axios.put('/api/config/user', {
                    theme: { mode: lastSelectedTheme }
                }, {
                    withCredentials: true
                });
            } catch (error) {
                logger.error('Failed to revert to theme:', error);
            }
        }
    };

    const handleSaveCustomColors = async () => {
        if (!customColorsEnabled) return; // Can't save when disabled

        setSaving(true);
        try {
            // Save to backend
            await axios.put('/api/config/user', {
                theme: {
                    mode: 'custom',
                    customColors: customColors,
                    lastSelectedTheme: lastSelectedTheme // Save for revert
                }
            }, {
                withCredentials: true
            });

            setUseCustomColors(true);
            applyColorsToDOM(customColors);
        } catch (error) {
            logger.error('Failed to save custom colors:', error);
            showError('Save Failed', 'Failed to save custom colors. Please try again.');
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
            showError('Reset Failed', 'Failed to reset colors. Please try again.');
        }
    };

    const handleSaveApplicationName = async () => {
        setSavingAppName(true);
        try {
            await axios.put('/api/config/system', {
                server: {
                    name: applicationName,
                    icon: applicationIcon
                }
            }, {
                withCredentials: true
            });

            // Dispatch event to update browser tab title immediately
            window.dispatchEvent(new CustomEvent('appNameUpdated', {
                detail: { appName: applicationName }
            }));

            // Dispatch event to refresh sidebar/mobile menu with new icon
            window.dispatchEvent(new Event('systemConfigUpdated'));

            // Update original values after successful save
            setOriginalAppName(applicationName);
            setOriginalAppIcon(applicationIcon);

            logger.info('Application name and icon saved successfully');
            showSuccess('Settings Saved', 'Application name and icon updated');
        } catch (error) {
            logger.error('Failed to save application name:', error);
            showError('Save Failed', 'Failed to save application name. Please try again.');
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
            showError('Save Failed', 'Failed to save flatten UI preference.');
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

            // Update original values after successful save
            setOriginalGreeting({ enabled: greetingEnabled, text: greetingText });

            // Dispatch event to notify Dashboard to update immediately
            window.dispatchEvent(new CustomEvent('greetingUpdated', {
                detail: { enabled: greetingEnabled, text: greetingText }
            }));

            logger.info('Greeting saved successfully');
            showSuccess('Greeting Saved', 'Dashboard greeting updated');
        } catch (error) {
            logger.error('Failed to save greeting:', error);
            showError('Save Failed', 'Failed to save greeting. Please try again.');
        } finally {
            setSavingGreeting(false);
        }
    };

    const handleResetGreeting = () => {
        setGreetingEnabled(true);
        setGreetingText('Your personal dashboard');
    };

    return (
        <div className="space-y-6 fade-in scroll-contain-x">
            {/* Header */}
            <div className="mb-6 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-theme-primary">
                    Customization
                </h2>
                <p className="text-theme-secondary text-sm">
                    Personalize your dashboard appearance with colors and branding
                </p>
            </div>

            {/* Sub-Tabs */}
            <div className="flex gap-2 overflow-x-auto scroll-contain-x pb-2 border-b border-theme relative">
                <button
                    ref={(el) => { subTabRefs.current['general'] = el; }}
                    onClick={() => setActiveSubTab('general')}
                    className="relative px-4 py-2 font-medium transition-colors text-theme-secondary hover:text-theme-primary"
                >
                    <div className="flex items-center gap-2 relative z-10">
                        <SettingsIcon size={18} className={activeSubTab === 'general' ? 'text-accent' : ''} />
                        <span className={activeSubTab === 'general' ? 'text-accent' : ''}>General</span>
                    </div>
                    {activeSubTab === 'general' && (
                        <motion.div
                            layoutId="customizationSubTabIndicator"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                        />
                    )}
                </button>
                <button
                    ref={(el) => { subTabRefs.current['colors'] = el; }}
                    onClick={() => setActiveSubTab('colors')}
                    className="relative px-4 py-2 font-medium transition-colors text-theme-secondary hover:text-theme-primary"
                >
                    <div className="flex items-center gap-2 relative z-10">
                        <Palette size={18} className={activeSubTab === 'colors' ? 'text-accent' : ''} />
                        <span className={activeSubTab === 'colors' ? 'text-accent' : ''}>Colors</span>
                    </div>
                    {activeSubTab === 'colors' && (
                        <motion.div
                            layoutId="customizationSubTabIndicator"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                        />
                    )}
                </button>
                {userIsAdmin && (
                    <button
                        ref={(el) => { subTabRefs.current['favicon'] = el; }}
                        onClick={() => setActiveSubTab('favicon')}
                        className="relative px-4 py-2 font-medium transition-colors text-theme-secondary hover:text-theme-primary"
                    >
                        <div className="flex items-center gap-2 relative z-10">
                            <ImageIcon size={18} className={activeSubTab === 'favicon' ? 'text-accent' : ''} />
                            <span className={activeSubTab === 'favicon' ? 'text-accent' : ''}>Favicon</span>
                        </div>
                        {activeSubTab === 'favicon' && (
                            <motion.div
                                layoutId="customizationSubTabIndicator"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                                transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                            />
                        )}
                    </button>
                )}
            </div>

            {/* Content - CrossFade between tabs */}
            <div style={{ position: 'relative', overflow: 'hidden' }}>
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
                        {/* Application Branding Section - Admin Only */}
                        {userIsAdmin && (
                            <div className="glass-subtle rounded-xl shadow-medium p-6 border border-theme">
                                <h3 className="text-lg font-semibold text-theme-primary mb-4">
                                    Application Branding
                                </h3>
                                <p className="text-sm text-theme-secondary mb-4">
                                    Customize the application name and icon displayed throughout the dashboard.
                                </p>
                                <div className="space-y-4">
                                    <Input
                                        label="Application Name"
                                        value={applicationName}
                                        onChange={(e) => setApplicationName(e.target.value)}
                                        maxLength={50}
                                        placeholder="Framerr"
                                        helperText={`${applicationName.length}/50 characters`}
                                    />
                                    <div>
                                        <label className="block mb-2 font-medium text-theme-secondary text-sm">
                                            Application Icon
                                        </label>
                                        <IconPicker
                                            value={applicationIcon}
                                            onChange={(icon) => setApplicationIcon(icon)}
                                        />
                                    </div>
                                    <Button
                                        onClick={handleSaveApplicationName}
                                        disabled={!hasAppNameChanges || savingAppName}
                                        icon={Save}
                                    >
                                        {savingAppName ? 'Saving...' : 'Save Application Name & Icon'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Dashboard Greeting Section */}
                        <div className="glass-subtle rounded-xl shadow-medium p-6 border border-theme">
                            <h3 className="text-lg font-semibold text-theme-primary mb-4">
                                Dashboard Greeting
                            </h3>
                            <p className="text-sm text-theme-secondary mb-6">
                                Customize the welcome message displayed on your dashboard.
                            </p>
                            <div className="space-y-6">
                                {/* Enable/Disable Toggle */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-sm font-medium text-theme-primary">
                                            Show Welcome Message
                                        </label>
                                        <p className="text-xs text-theme-tertiary mt-1">
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
                                        <div className="w-11 h-6 bg-theme-primary border border-theme peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-theme after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-checked:border-accent"></div>
                                    </label>
                                </div>

                                {/* Greeting Text Input */}
                                <Input
                                    label="Custom Greeting Text"
                                    value={greetingText}
                                    onChange={(e) => setGreetingText(e.target.value)}
                                    disabled={!greetingEnabled}
                                    maxLength={100}
                                    placeholder="Your personal dashboard"
                                    helperText={`${greetingText.length}/100 characters`}
                                />

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <Button
                                        onClick={handleSaveGreeting}
                                        disabled={!hasGreetingChanges || savingGreeting}
                                        icon={Save}
                                    >
                                        {savingGreeting ? 'Saving...' : 'Save Greeting'}
                                    </Button>
                                    <Button
                                        onClick={handleResetGreeting}
                                        variant="secondary"
                                        icon={RotateCcw}
                                        title="Reset to default"
                                    >
                                        <span className="hidden sm:inline">Reset</span>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Flatten UI Section */}
                        <div className="glass-subtle rounded-xl shadow-medium p-6 border border-theme">
                            <h3 className="text-lg font-semibold text-theme-primary mb-4">
                                Flatten UI Design
                            </h3>
                            <p className="text-sm text-theme-secondary mb-6">
                                Remove glassmorphism effects, shadows, and backdrop blur for a minimal flat design aesthetic. This affects all cards and panels throughout the application.
                            </p>
                            <div className="flex items-center justify-between p-4 bg-theme-tertiary rounded-lg border border-theme">
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-theme-primary mb-1">Flatten UI Design</div>
                                    <div className="text-xs text-theme-tertiary">
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
                                    <div className="w-11 h-6 bg-theme-primary border border-theme peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-theme after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-checked:border-accent"></div>
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
                            <h3 className="text-lg font-semibold text-theme-primary mb-4">Preset Themes</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {themes.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={async () => {
                                            // Only reset if coming from custom colors OR switching themes
                                            if (customColorsEnabled || theme !== t.id) {
                                                setUseCustomColors(false);
                                                setCustomColorsEnabled(false);
                                                setLastSelectedTheme(t.id);
                                                // Smart reset to theme (removes custom colors, applies theme, waits, updates pickers)
                                                await resetToThemeColors(t.id);
                                            }
                                        }}
                                        className={`p-4 rounded-lg border-2 transition-all text-left ${theme === t.id && !useCustomColors
                                            ? 'border-accent bg-accent/10'
                                            : 'border-theme hover:border-theme-light bg-theme-secondary hover:bg-theme-hover transition-all'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Palette size={20} className={theme === t.id && !useCustomColors ? 'text-accent' : 'text-theme-secondary'} />
                                                <span className="font-semibold text-theme-primary">
                                                    {t.name}
                                                </span>
                                            </div>
                                            {theme === t.id && !useCustomColors && (
                                                <span className="text-xs px-2 py-1 rounded bg-accent text-white">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-theme-secondary">
                                            {t.description}
                                        </p>
                                        {/* Color Preview */}
                                        <div className="flex gap-2 mt-3">
                                            {/* Background Color */}
                                            <div className="w-8 h-8 rounded border border-theme" style={{
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
                        <div className="border-t border-theme pt-8">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-theme-primary">Custom Colors</h3>
                                    <p className="text-sm text-theme-secondary mt-1">Create your own color scheme</p>
                                </div>
                                {useCustomColors && (
                                    <span className="text-xs px-3 py-1.5 rounded bg-accent text-white font-medium">
                                        Custom Theme Active
                                    </span>
                                )}
                            </div>

                            {/* Enable Custom Colors Toggle */}
                            <div className="flex items-center justify-between p-4 bg-theme-tertiary rounded-lg border border-theme mb-6">
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-theme-primary mb-1">
                                        Enable Custom Colors
                                    </div>
                                    <div className="text-xs text-theme-tertiary">
                                        {customColorsEnabled
                                            ? 'Custom colors active - changes save automatically'
                                            : 'Using theme colors - toggle to customize'}
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={customColorsEnabled}
                                        onChange={(e) => handleToggleCustomColors(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-theme-primary border border-theme peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-theme after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-checked:border-accent"></div>
                                </label>
                            </div>

                            {/* Tier 1: Essentials (Always Visible) */}
                            <div className="mb-8">
                                <h4 className="text-sm font-bold text-theme-secondary uppercase tracking-wider mb-4">
                                    Essentials
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Backgrounds Column */}
                                    <div className="space-y-4">
                                        <h5 className="text-xs font-semibold text-theme-tertiary uppercase tracking-wider">Backgrounds</h5>
                                        <ColorPicker
                                            label="Primary Background"
                                            value={customColors['bg-primary']}
                                            onChange={(val) => handleColorChange('bg-primary', val)}
                                            description="Main page background"
                                            disabled={!customColorsEnabled}
                                        />
                                        <ColorPicker
                                            label="Card Background"
                                            value={customColors['bg-secondary']}
                                            onChange={(val) => handleColorChange('bg-secondary', val)}
                                            description="Cards and panels"
                                            disabled={!customColorsEnabled}
                                        />
                                        <ColorPicker
                                            label="Button Background"
                                            value={customColors['bg-tertiary']}
                                            onChange={(val) => handleColorChange('bg-tertiary', val)}
                                            description="Buttons and inputs"
                                            disabled={!customColorsEnabled}
                                        />
                                    </div>

                                    {/* Accents Column */}
                                    <div className="space-y-4">
                                        <h5 className="text-xs font-semibold text-theme-tertiary uppercase tracking-wider">Accents</h5>
                                        <ColorPicker
                                            label="Primary Accent"
                                            value={customColors['accent']}
                                            onChange={(val) => handleColorChange('accent', val)}
                                            description="Buttons and highlights"
                                            disabled={!customColorsEnabled}
                                        />
                                        <ColorPicker
                                            label="Secondary Accent"
                                            value={customColors['accent-secondary']}
                                            onChange={(val) => handleColorChange('accent-secondary', val)}
                                            description="Links and secondary actions"
                                            disabled={!customColorsEnabled}
                                        />
                                    </div>

                                    {/* Text Column */}
                                    <div className="space-y-4">
                                        <h5 className="text-xs font-semibold text-theme-tertiary uppercase tracking-wider">Text</h5>
                                        <ColorPicker
                                            label="Primary Text"
                                            value={customColors['text-primary']}
                                            onChange={(val) => handleColorChange('text-primary', val)}
                                            description="Main text color"
                                            disabled={!customColorsEnabled}
                                        />
                                        <ColorPicker
                                            label="Secondary Text"
                                            value={customColors['text-secondary']}
                                            onChange={(val) => handleColorChange('text-secondary', val)}
                                            description="Labels and descriptions"
                                            disabled={!customColorsEnabled}
                                        />
                                        <ColorPicker
                                            label="Muted Text"
                                            value={customColors['text-tertiary']}
                                            onChange={(val) => handleColorChange('text-tertiary', val)}
                                            description="Hints and timestamps"
                                            disabled={!customColorsEnabled}
                                        />
                                    </div>

                                    {/* Borders Column */}
                                    <div className="space-y-4">
                                        <h5 className="text-xs font-semibold text-theme-tertiary uppercase tracking-wider">Borders</h5>
                                        <ColorPicker
                                            label="Primary Border"
                                            value={customColors['border']}
                                            onChange={(val) => handleColorChange('border', val)}
                                            description="Dividers and outlines"
                                            disabled={!customColorsEnabled}
                                        />
                                        <ColorPicker
                                            label="Light Border"
                                            value={customColors['border-light']}
                                            onChange={(val) => handleColorChange('border-light', val)}
                                            description="Subtle separators"
                                            disabled={!customColorsEnabled}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tier 2: Status Colors (Collapsible) */}
                            <div className="mb-8">
                                <button
                                    onClick={() => setStatusColorsExpanded(!statusColorsExpanded)}
                                    className="w-full flex items-center justify-between p-4 bg-theme-secondary hover:bg-theme-hover rounded-lg border border-theme transition-all mb-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <h4 className="text-sm font-bold text-theme-secondary uppercase tracking-wider">
                                            Status Colors
                                        </h4>
                                        <span className="text-xs text-theme-tertiary">(4 colors)</span>
                                    </div>
                                    <ChevronDown
                                        size={18}
                                        className={`text-theme-tertiary transition-transform ${statusColorsExpanded ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                {statusColorsExpanded && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pl-4">
                                        <ColorPicker
                                            label="Success"
                                            value={customColors['success']}
                                            onChange={(val) => handleColorChange('success', val)}
                                            description="Completed actions"
                                            disabled={!customColorsEnabled}
                                        />
                                        <ColorPicker
                                            label="Warning"
                                            value={customColors['warning']}
                                            onChange={(val) => handleColorChange('warning', val)}
                                            description="Cautions"
                                            disabled={!customColorsEnabled}
                                        />
                                        <ColorPicker
                                            label="Error"
                                            value={customColors['error']}
                                            onChange={(val) => handleColorChange('error', val)}
                                            description="Errors"
                                            disabled={!customColorsEnabled}
                                        />
                                        <ColorPicker
                                            label="Info"
                                            value={customColors['info']}
                                            onChange={(val) => handleColorChange('info', val)}
                                            description="Information"
                                            disabled={!customColorsEnabled}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Tier 3: Advanced (Collapsible) */}
                            <div className="mb-8">
                                <button
                                    onClick={() => setAdvancedExpanded(!advancedExpanded)}
                                    className="w-full flex items-center justify-between p-4 bg-theme-secondary hover:bg-theme-hover rounded-lg border border-theme transition-all mb-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <h4 className="text-sm font-bold text-theme-secondary uppercase tracking-wider">
                                            Advanced
                                        </h4>
                                        <span className="text-xs text-theme-tertiary">(7 colors)</span>
                                    </div>
                                    <ChevronDown
                                        size={18}
                                        className={`text-theme-tertiary transition-transform ${advancedExpanded ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                {advancedExpanded && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4">
                                        {/* Interactive States */}
                                        <div className="space-y-4">
                                            <h5 className="text-xs font-semibold text-theme-tertiary uppercase tracking-wider">Interactive States</h5>
                                            <ColorPicker
                                                label="Hover Background"
                                                value={customColors['bg-hover']}
                                                onChange={(val) => handleColorChange('bg-hover', val)}
                                                description="Background on hover"
                                                disabled={!customColorsEnabled}
                                            />
                                            <ColorPicker
                                                label="Accent Hover"
                                                value={customColors['accent-hover']}
                                                onChange={(val) => handleColorChange('accent-hover', val)}
                                                description="Accent color on hover"
                                                disabled={!customColorsEnabled}
                                            />
                                            <ColorPicker
                                                label="Light Accent"
                                                value={customColors['accent-light']}
                                                onChange={(val) => handleColorChange('accent-light', val)}
                                                description="Light accent variant"
                                                disabled={!customColorsEnabled}
                                            />
                                        </div>

                                        {/* Special Borders */}
                                        <div className="space-y-4">
                                            <h5 className="text-xs font-semibold text-theme-tertiary uppercase tracking-wider">Special Borders</h5>
                                            <ColorPicker
                                                label="Accent Border"
                                                value={customColors['border-accent']}
                                                onChange={(val) => handleColorChange('border-accent', val)}
                                                description="Highlighted borders"
                                                disabled={!customColorsEnabled}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Auto-save Indicator */}
                            {autoSaving && (
                                <div className="text-xs text-theme-tertiary flex items-center gap-2 mt-3">
                                    <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                                    Saving...
                                </div>
                            )}
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

