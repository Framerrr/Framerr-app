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
 * Displays current time with timezone support
 * Edit controls are rendered via WidgetWrapper extraEditControls
 */
const ClockWidget = ({ config }: ClockWidgetProps): React.JSX.Element => {
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

    return (
        <div ref={containerRef} className="relative flex items-center justify-center h-full p-4">
            {/* Main Content */}
            <div className={`flex ${isWide ? 'flex-row items-center gap-6' : 'flex-col items-center text-center'}`}>
                {/* Time Display */}
                <div className={`font-bold text-theme-primary leading-none ${isWide ? 'text-4xl' : 'text-5xl'}`}>
                    {formatTime(time)}
                </div>

                {/* Date Display */}
                <div className={`flex flex-col ${isWide ? 'items-start' : 'items-center mt-3'}`}>
                    {showDate && (
                        <div className={`text-theme-secondary ${isWide ? 'text-sm' : 'text-base'}`}>
                            {formatDate(time)}
                        </div>
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
