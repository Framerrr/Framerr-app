import React, { useState, useEffect } from 'react';
import logger from '../../utils/logger';
import { Filter } from 'lucide-react';

const CombinedCalendarWidget = ({ config }) => {
    // Get integration configs from props (passed by Dashboard)
    const sonarrConfig = config?.sonarr || {};
    const radarrConfig = config?.radarr || {};

    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all', 'tv', 'movies'
    const [hoveredEvent, setHoveredEvent] = useState(null); // For tooltip
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

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

    const handleEventHover = (event, e) => {
        if (event) {
            const rect = e.currentTarget.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const tooltipWidth = 300; // max-width from tooltip style

            // Center tooltip horizontally under the item
            let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);

            // Prevent tooltip from going off-screen (left edge)
            if (left < 10) left = 10;

            // Prevent tooltip from going off-screen (right edge)
            if (left + tooltipWidth > viewportWidth - 10) {
                left = viewportWidth - tooltipWidth - 10;
            }

            // Position below the item
            let top = rect.bottom + 5;

            // If tooltip would go off bottom of screen, position it above the item instead
            if (top + 200 > viewportHeight) { // estimate tooltip height as 200px
                top = rect.top - 205; // Position above with some spacing
            }

            setTooltipPosition({ x: left, y: top });
            setHoveredEvent(event);
        } else {
            setHoveredEvent(null);
        }
    };

    // Filter events based on selected filter
    const getFilteredEvents = (dayEvents) => {
        if (filter === 'all') return dayEvents;
        if (filter === 'tv') return dayEvents.filter(ev => ev.type === 'sonarr');
        if (filter === 'movies') return dayEvents.filter(ev => ev.type === 'radarr');
        return dayEvents;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.5rem', position: 'relative' }}>
            {/* Header with month navigation and filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <button className="btn-icon" onClick={() => changeMonth(-1)}>{'<'}</button>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', flex: 1, textAlign: 'center' }}>
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button
                    className="btn-icon"
                    onClick={goToToday}
                    title="Go to today"
                    style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                >
                    Today
                </button>
                <button className="btn-icon" onClick={() => changeMonth(1)}>{'>'}</button>
            </div>

            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                <Filter size={14} style={{ opacity: 0.6 }} />
                <button
                    onClick={() => setFilter('all')}
                    style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        background: filter === 'all' ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                        color: filter === 'all' ? 'white' : 'rgba(255,255,255,0.7)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    All
                </button>
                <button
                    onClick={() => setFilter('tv')}
                    style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        background: filter === 'tv' ? '#3b82f6' : 'rgba(59, 130, 246, 0.2)',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    TV
                </button>
                <button
                    onClick={() => setFilter('movies')}
                    style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        background: filter === 'movies' ? '#10b981' : 'rgba(16, 185, 129, 0.2)',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    Movies
                </button>
            </div>

            {/* Loading state */}
            {loading && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
                    <div>Loading calendar...</div>
                </div>
            )}

            {/* Error state */}
            {error && !loading && (
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '1rem',
                    fontSize: '0.8rem',
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '8px'
                }}>
                    {error}
                </div>
            )}

            {/* Calendar grid */}
            {!loading && !error && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', flex: 1, overflow: 'auto' }}>
                    {/* Day headers */}
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <div key={i} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-secondary)', padding: '2px', fontWeight: 600 }}>
                            {d}
                        </div>
                    ))}

                    {/* Empty cells before month starts */}
                    {Array.from({ length: startDay }).map((_, i) => (
                        <div key={`empty-${i}`} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }} />
                    ))}

                    {/* Calendar days */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
                        const dayEvents = events[dateStr] || [];
                        const filteredEvents = getFilteredEvents(dayEvents);
                        const isToday = dateStr === new Date().toISOString().split('T')[0];

                        return (
                            <div key={day} style={{
                                background: isToday ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                                minHeight: '50px',
                                padding: '3px',
                                border: isToday ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{ fontSize: '0.7rem', textAlign: 'right', marginBottom: '2px', opacity: isToday ? 1 : 0.6, fontWeight: isToday ? 600 : 400 }}>
                                    {day}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1, overflow: 'hidden' }}>
                                    {filteredEvents.map((ev, idx) => {
                                        // For Sonarr (TV shows), use series.title or seriesTitle
                                        // For Radarr (movies), use title
                                        const displayTitle = ev.type === 'sonarr'
                                            ? (ev.series?.title || ev.seriesTitle || 'Unknown Show')
                                            : (ev.title || 'Unknown Movie');

                                        return (
                                            <div
                                                key={idx}
                                                onMouseEnter={(e) => handleEventHover(ev, e)}
                                                onMouseLeave={() => handleEventHover(null, null)}
                                                style={{
                                                    fontSize: '0.55rem',
                                                    background: ev.type === 'sonarr' ? '#3b82f6' : '#10b981',
                                                    color: 'white',
                                                    padding: '2px 3px',
                                                    borderRadius: '2px',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    transition: 'opacity 0.2s',
                                                    opacity: hoveredEvent === ev ? 0.8 : 1
                                                }}
                                            >
                                                {displayTitle}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Empty state */}
            {!loading && !error && Object.keys(events).length === 0 && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    opacity: 0.5,
                    fontSize: '0.8rem'
                }}>
                    <div>No upcoming releases this month</div>
                    <div style={{ fontSize: '0.7rem', marginTop: '4px' }}>
                        Configure Sonarr/Radarr in Integrations
                    </div>
                </div>
            )}

            {/* Hover Tooltip */}
            {hoveredEvent && (
                <div style={{
                    position: 'absolute',
                    left: `${tooltipPosition.x}px`,
                    top: `${tooltipPosition.y}px`,
                    background: 'rgba(0, 0, 0, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    zIndex: 9999,
                    maxWidth: '300px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                    pointerEvents: 'none'
                }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'white' }}>
                        {hoveredEvent.type === 'sonarr'
                            ? (hoveredEvent.series?.title || hoveredEvent.seriesTitle || 'Unknown Show')
                            : (hoveredEvent.title || 'Unknown Movie')
                        }
                    </div>

                    {hoveredEvent.type === 'sonarr' && (
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '4px' }}>
                            Season {hoveredEvent.seasonNumber} Episode {hoveredEvent.episodeNumber}
                            {hoveredEvent.title && ` - ${hoveredEvent.title}`}
                        </div>
                    )}

                    <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                        {hoveredEvent.type === 'sonarr'
                            ? `Airs: ${new Date(hoveredEvent.airDate).toLocaleDateString()}`
                            : `Release: ${new Date(
                                hoveredEvent.physicalRelease ||
                                hoveredEvent.digitalRelease ||
                                hoveredEvent.inCinemas
                            ).toLocaleDateString()}`
                        }
                    </div>

                    {hoveredEvent.overview && (
                        <div style={{
                            fontSize: '0.7rem',
                            color: 'rgba(255, 255, 255, 0.7)',
                            lineHeight: '1.4',
                            maxHeight: '100px',
                            overflow: 'auto'
                        }}>
                            {hoveredEvent.overview}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CombinedCalendarWidget;
