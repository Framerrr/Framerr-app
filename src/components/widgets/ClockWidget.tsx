import React, { useState, useEffect, useRef } from 'react';

interface ClockPreferences {
    format24h: boolean;
    timezone: string;
    showDate: boolean;
    showSeconds: boolean;
}

interface ClockConfig extends Partial<ClockPreferences> {
    [key: string]: unknown;
}

export interface ClockWidgetProps {
    config?: ClockConfig;
    editMode?: boolean;
    widgetId?: string;
}

/**
 * Clock Widget
 * Displays current time with timezone support and inline settings
 * Uses widget-config-changed events for dashboard save flow
 */
const ClockWidget = ({ config, editMode = false, widgetId }: ClockWidgetProps): React.JSX.Element => {
    const [time, setTime] = useState<Date>(new Date());
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

    // Get active config from props (managed by Dashboard)
    const activeConfig: ClockPreferences = {
        format24h: config?.format24h ?? true,
        timezone: config?.timezone ?? '',
        showDate: config?.showDate ?? true,
        showSeconds: config?.showSeconds ?? true
    };

    const { format24h, timezone, showDate, showSeconds } = activeConfig;

    useEffect(() => {
        const interval = setInterval(() => setTime(new Date()), showSeconds ? 1000 : 60000);
        return () => clearInterval(interval);
    }, [showSeconds]);

    // Dispatch config change to Dashboard (enables save button, cancellable)
    const updateConfig = (newConfig: Partial<ClockPreferences>): void => {
        if (!widgetId) return;

        window.dispatchEvent(new CustomEvent('widget-config-changed', {
            detail: {
                widgetId,
                config: { ...config, ...newConfig }
            }
        }));
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
                        onClick={() => updateConfig({ format24h: !format24h })}
                        className={`${toggleButtonClass} ${format24h ? activeToggleClass : inactiveToggleClass}`}
                        title="Toggle time format"
                    >
                        {format24h ? '24H' : '12H'}
                    </button>
                    <button
                        onClick={() => updateConfig({ showSeconds: !showSeconds })}
                        className={`${toggleButtonClass} ${showSeconds ? activeToggleClass : inactiveToggleClass}`}
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
                            onClick={() => updateConfig({ showDate: !showDate })}
                            className={`mt-2 ${toggleButtonClass} ${showDate ? activeToggleClass : inactiveToggleClass}`}
                            title="Toggle date display"
                        >
                            {showDate ? 'Hide Date' : 'Show Date'}
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
