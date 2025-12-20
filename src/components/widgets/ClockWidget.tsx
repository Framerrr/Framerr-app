import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import logger from '../../utils/logger';

interface ClockPreferences {
    format24h: boolean;
    timezone: string;
    showDate: boolean;
    showSeconds: boolean;
}

interface ClockConfig extends Partial<ClockPreferences> {
    [key: string]: unknown;
}

interface UserConfigResponse {
    preferences?: {
        clockWidget?: ClockPreferences;
    };
}

export interface ClockWidgetProps {
    config?: ClockConfig;
    editMode?: boolean;
}

/**
 * Clock Widget
 * Displays current time with timezone support and inline settings
 */
const ClockWidget = ({ config, editMode = false }: ClockWidgetProps): React.JSX.Element => {
    const [time, setTime] = useState<Date>(new Date());
    const [preferences, setPreferences] = useState<ClockPreferences>({
        format24h: true,
        timezone: '',
        showDate: true,
        showSeconds: true
    });
    const [isWide, setIsWide] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Detect container width for responsive layout
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // Switch to horizontal layout if width >= 410px
                setIsWide(entry.contentRect.width >= 410);
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Load preferences on mount
    useEffect(() => {
        loadPreferences();
    }, []);

    // Auto-save when preferences change
    useEffect(() => {
        if (preferences.timezone !== '' || !preferences.format24h || !preferences.showDate || !preferences.showSeconds) {
            savePreferences(preferences);
        }
    }, [preferences.format24h, preferences.showDate, preferences.showSeconds]);

    // Merge config with preferences (config takes priority)
    const activeConfig: ClockPreferences = {
        ...preferences,
        ...(config || {})
    };

    const { format24h, timezone, showDate, showSeconds } = activeConfig;

    useEffect(() => {
        const interval = setInterval(() => setTime(new Date()), showSeconds ? 1000 : 60000);
        return () => clearInterval(interval);
    }, [showSeconds]);

    const loadPreferences = async (): Promise<void> => {
        try {
            const response = await axios.get<UserConfigResponse>('/api/config/user', {
                withCredentials: true
            });
            if (response.data?.preferences?.clockWidget) {
                setPreferences(response.data.preferences.clockWidget);
            }
        } catch (error) {
            logger.error('Failed to load clock preferences:', { error });
        }
    };

    const savePreferences = async (newPrefs: ClockPreferences): Promise<void> => {
        try {
            await axios.put('/api/config/user', {
                preferences: {
                    clockWidget: newPrefs
                }
            }, {
                withCredentials: true
            });
        } catch (error) {
            logger.error('Failed to save clock preferences:', { error });
        }
    };

    const formatTime = (date: Date): string => {
        const options: Intl.DateTimeFormatOptions = {
            hour: '2-digit',
            minute: '2-digit',
            ...(showSeconds && { second: '2-digit' }),
            hour12: !format24h,
            ...(timezone && { timeZone: timezone })
        };
        return date.toLocaleTimeString([], options);
    };

    const formatDate = (date: Date): string => {
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            ...(timezone && { timeZone: timezone })
        };
        return date.toLocaleDateString([], options);
    };

    const toggleButtonClass = "px-3 py-1.5 text-xs font-medium rounded-md border-2 border-dashed transition-all no-drag";
    const activeToggleClass = "border-accent/50 bg-accent/10 text-accent hover:bg-accent/20";
    const inactiveToggleClass = "border-slate-600 bg-slate-800/30 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300";

    return (
        <div ref={containerRef} className="relative flex items-center justify-center h-full p-4">
            {/* Edit Mode Controls */}
            {editMode && (
                <div className="absolute top-2 left-2 right-2 flex justify-between z-10">
                    <button
                        onClick={() => setPreferences({ ...preferences, format24h: !preferences.format24h })}
                        className={`${toggleButtonClass} ${preferences.format24h ? activeToggleClass : inactiveToggleClass}`}
                        title="Toggle time format"
                    >
                        {preferences.format24h ? '24H' : '12H'}
                    </button>
                    <button
                        onClick={() => setPreferences({ ...preferences, showSeconds: !preferences.showSeconds })}
                        className={`${toggleButtonClass} ${preferences.showSeconds ? activeToggleClass : inactiveToggleClass}`}
                        title="Toggle seconds display"
                    >
                        :SS
                    </button>
                </div>
            )}

            {/* Main Content */}
            <div className={`flex ${isWide ? 'flex-row items-center gap-6' : 'flex-col items-center text-center'}`}>
                {/* Time Display */}
                <div className={`font-bold text-theme-primary leading-none ${isWide ? 'text-4xl' : 'text-5xl'}`}>
                    {formatTime(time)}
                </div>

                {/* Date & Edit Controls */}
                <div className={`flex flex-col ${isWide ? 'items-start' : 'items-center mt-3'}`}>
                    {showDate && (
                        <div className={`text-theme-secondary ${isWide ? 'text-sm' : 'text-base'}`}>
                            {formatDate(time)}
                        </div>
                    )}

                    {/* Date Toggle - only in edit mode */}
                    {editMode && (
                        <button
                            onClick={() => setPreferences({ ...preferences, showDate: !preferences.showDate })}
                            className={`mt-2 ${toggleButtonClass} ${preferences.showDate ? activeToggleClass : inactiveToggleClass}`}
                            title="Toggle date display"
                        >
                            {preferences.showDate ? 'Hide Date' : 'Show Date'}
                        </button>
                    )}
                </div>
            </div>

            {/* Timezone Display */}
            {timezone && (
                <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-theme-secondary opacity-60">
                    {timezone}
                </div>
            )}
        </div>
    );
};

export default ClockWidget;
