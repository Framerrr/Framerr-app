import React, { useState, useEffect } from 'react';
import './ClockWidget.css';

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
 * Uses CSS Container Queries for responsive scaling
 * Edit controls are rendered via WidgetWrapper extraEditControls
 */
const ClockWidget = ({ config }: ClockWidgetProps): React.JSX.Element => {
    const [time, setTime] = useState<Date>(new Date());

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
        <div className="clock-widget">
            <div className="clock-widget__content">
                {/* Time Display */}
                <div className="clock-widget__time">
                    {formatTime(time)}
                </div>

                {/* Date and Timezone Display */}
                <div className="clock-widget__info">
                    {showDate && (
                        <div className="clock-widget__date">
                            {formatDate(time)}
                        </div>
                    )}
                    {timezone && (
                        <div className="clock-widget__timezone">
                            {timezone}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClockWidget;
