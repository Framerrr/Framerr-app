import React, { useState, useEffect } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { motion, AnimatePresence } from 'framer-motion';
import logger from '../../utils/logger';
import { Filter, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

// Event Popover Component
const EventPopover = ({ event }) => {
    const [isOpen, setIsOpen] = useState(false);

    const displayTitle = event.type === 'sonarr'
        ? (event.series?.title || event.seriesTitle || 'Unknown Show')
        : (event.title || 'Unknown Movie');

    return (
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
            <Popover.Trigger asChild>
                <button
                    className={`
                        text-[9px] px-1 py-[1px] rounded-[2px] whitespace-nowrap overflow-hidden text-ellipsis font-medium cursor-pointer text-white transition-all
                        ${event.type === 'sonarr' ? 'bg-info hover:bg-info/80' : 'bg-success hover:bg-success/80'}
                    `}
                    title={displayTitle}
                >
                    {displayTitle}
                </button>
            </Popover.Trigger>

            <AnimatePresence>
                {isOpen && (
                    <Popover.Portal forceMount>
                        <Popover.Content
                            side="bottom"
                            align="start"
                            sideOffset={8}
                            collisionPadding={24}
                            asChild
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{ type: 'spring', stiffness: 220, damping: 30 }}
                                className="glass-card border-theme rounded-xl shadow-2xl p-4 z-[9999]"
                                style={{ minWidth: '180px', maxWidth: '200px' }}
                            >
                                <Popover.Arrow
                                    className="fill-[var(--background-secondary)]"
                                    width={16}
                                    height={8}
                                    style={{
                                        filter: 'drop-shadow(0 -1px 1px var(--border-theme))'
                                    }}
                                />

                                {/* Title */}
                                <div className="text-sm font-semibold mb-2 text-theme-primary">
                                    {displayTitle}
                                </div>

                                {/* Episode info for TV shows */}
                                {event.type === 'sonarr' && (
                                    <div className="text-xs text-info mb-2 font-medium">
                                        Season {event.seasonNumber} Episode {event.episodeNumber}
                                        {event.title && ` - ${event.title}`}
                                    </div>
                                )}

                                {/* Release date */}
                                <div className="text-xs text-theme-secondary mb-2">
                                    {event.type === 'sonarr'
                                        ? `Airs: ${new Date(event.airDate).toLocaleDateString()}`
                                        : `Release: ${new Date(
                                            event.physicalRelease ||
                                            event.digitalRelease ||
                                            event.inCinemas
                                        ).toLocaleDateString()}`
                                    }
                                </div>

                                {/* Overview */}
                                {event.overview && (
                                    <div className="text-xs text-theme-secondary leading-relaxed max-h-[120px] overflow-auto custom-scrollbar">
                                        {event.overview}
                                    </div>
                                )}
                            </motion.div>
                        </Popover.Content>
                    </Popover.Portal>
                )}
            </AnimatePresence>
        </Popover.Root>
    );
};

const CombinedCalendarWidget = ({ config }) => {
    // Get integration configs from props (passed by Dashboard)
    const sonarrConfig = config?.sonarr || {};
    const radarrConfig = config?.radarr || {};
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all', 'tv', 'movies'

    // Calculate month bounds
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDateStr = startOfMonth.toISOString().split('T')[0];
    const endDateStr = endOfMonth.toISOString().split('T')[0];

    useEffect(() => {
        const fetchEvents = async () => {
            // Check integrations FIRST before doing anything async
            const hasSonarr = sonarrConfig.enabled && sonarrConfig.url && sonarrConfig.apiKey;
            const hasRadarr = radarrConfig.enabled && radarrConfig.url && radarrConfig.apiKey;

            if (!hasSonarr && !hasRadarr) {
                setError('No calendar services enabled. Please configure Sonarr or Radarr in Integrations.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            const newEvents = {};

            const fetchService = async (config, type, endpoint) => {
                if (!config.enabled || !config.url || !config.apiKey) {
                    return;
                }

                try {
                    const url = `${endpoint}?start=${startDateStr}&end=${endDateStr}&url=${encodeURIComponent(config.url)}&apiKey=${encodeURIComponent(config.apiKey)}`;
                    const res = await fetch(url);

                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                    }

                    const data = await res.json();

                    if (!Array.isArray(data)) {
                        logger.error(`${type} calendar returned non-array`);
                        return;
                    }

                    data.forEach(item => {
                        const date = item.airDate || item.physicalRelease || item.digitalRelease || item.inCinemas;
                        if (date) {
                            const dateStr = date.split('T')[0];
                            if (!newEvents[dateStr]) newEvents[dateStr] = [];
                            newEvents[dateStr].push({ ...item, type });
                        }
                    });
                } catch (e) {
                    logger.error(`Error fetching ${type} calendar:`, e.message);
                    // Don't call setError here - it triggers re-render loop
                }
            };

            await Promise.all([
                fetchService(sonarrConfig, 'sonarr', '/api/sonarr/calendar'),
                fetchService(radarrConfig, 'radarr', '/api/radarr/calendar')
            ]);

            setEvents(newEvents);
            setLoading(false);
        };

        fetchEvents();
    }, [
        currentDate,
        sonarrConfig.enabled, sonarrConfig.url, sonarrConfig.apiKey,
        radarrConfig.enabled, radarrConfig.url, radarrConfig.apiKey,
        startDateStr, endDateStr
    ]); // Primitive dependencies - stable!

    const daysInMonth = endOfMonth.getDate();
    const startDay = startOfMonth.getDay(); // 0 = Sunday

    const changeMonth = (offset) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // Filter events based on selected filter
    const getFilteredEvents = (dayEvents) => {
        if (filter === 'all') return dayEvents;
        if (filter === 'tv') return dayEvents.filter(ev => ev.type === 'sonarr');
        if (filter === 'movies') return dayEvents.filter(ev => ev.type === 'radarr');
        return dayEvents;
    };

    return (
        <div className="flex flex-col h-full gap-2 relative">
            {/* Header with month navigation and filter */}
            <div className="flex justify-between items-center gap-2">
                <button
                    className="p-1 rounded-lg hover:bg-theme-tertiary text-theme-secondary hover:text-theme-primary transition-colors"
                    onClick={() => changeMonth(-1)}
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="font-semibold text-sm flex-1 text-center text-theme-primary">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button
                    className="text-xs px-2 py-1 rounded-md bg-theme-tertiary hover:bg-theme-hover text-theme-primary transition-colors"
                    onClick={goToToday}
                    title="Go to today"
                >
                    Today
                </button>
                <button
                    className="p-1 rounded-lg hover:bg-theme-tertiary text-theme-secondary hover:text-theme-primary transition-colors"
                    onClick={() => changeMonth(1)}
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-1 justify-center items-center">
                <Filter size={14} className="text-theme-secondary opacity-60" />
                <button
                    onClick={() => setFilter('all')}
                    className={`text-[10px] px-2 py-0.5 rounded transition-all ${filter === 'all'
                        ? 'bg-accent text-white'
                        : 'bg-theme-tertiary text-theme-secondary hover:text-theme-primary'
                        }`}
                >
                    All
                </button>
                <button
                    onClick={() => setFilter('tv')}
                    className={`text-[10px] px-2 py-0.5 rounded transition-all ${filter === 'tv'
                        ? 'bg-info text-white'
                        : 'bg-info/10 text-info hover:bg-info/20'
                        }`}
                >
                    TV
                </button>
                <button
                    onClick={() => setFilter('movies')}
                    className={`text-[10px] px-2 py-0.5 rounded transition-all ${filter === 'movies'
                        ? 'bg-success text-white'
                        : 'bg-success/10 text-success hover:bg-success/20'
                        }`}
                >
                    Movies
                </button>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="flex-1 flex items-center justify-center opacity-60 text-theme-secondary text-sm">
                    <div>Loading calendar...</div>
                </div>
            )}

            {/* Error state */}
            {error && !loading && (
                <div className="flex-1 flex items-center justify-center text-center p-4 text-xs text-error bg-error/10 rounded-lg">
                    {error}
                </div>
            )}

            {/* Calendar grid */}
            {!loading && !error && (
                <div className="grid grid-cols-7 gap-[2px] flex-1 overflow-auto content-start">
                    {/* Day headers */}
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <div key={i} className="text-center text-[10px] text-theme-secondary font-semibold py-1">
                            {d}
                        </div>
                    ))}

                    {/* Empty cells before month starts */}
                    {Array.from({ length: startDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-theme-tertiary/20 rounded-sm" />
                    ))}

                    {/* Calendar days */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
                        const dayEvents = events[dateStr] || [];
                        const filteredEvents = getFilteredEvents(dayEvents);
                        const isToday = dateStr === new Date().toISOString().split('T')[0];

                        return (
                            <div key={day} className={`
                                min-h-[50px] p-[2px] rounded-md overflow-hidden flex flex-col border
                                ${isToday
                                    ? 'bg-accent/10 border-accent'
                                    : 'bg-theme-tertiary/30 border-transparent hover:border-theme-light'}
                            `}>
                                <div className={`text-[10px] text-right mb-[1px] ${isToday ? 'font-bold text-accent' : 'text-theme-secondary opacity-60'}`}>
                                    {day}
                                </div>
                                <div className="flex flex-col gap-[1px] flex-1 overflow-hidden">
                                    {filteredEvents.map((ev, idx) => (
                                        <EventPopover key={idx} event={ev} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Empty state */}
            {!loading && !error && Object.keys(events).length === 0 && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center opacity-50">
                    <CalendarIcon size={32} className="mx-auto mb-2 text-theme-tertiary" />
                    <div className="text-xs text-theme-secondary">No upcoming releases</div>
                    <div className="text-[10px] text-theme-tertiary mt-1">
                        Configure Sonarr/Radarr in Integrations
                    </div>
                </div>
            )}
        </div>
    );
};

export default CombinedCalendarWidget;
