import React, { useState, useEffect } from 'react';
import { Film } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppData } from '../../context/AppDataContext';
import IntegrationDisabledMessage from '../common/IntegrationDisabledMessage';

// Movie Detail Popover Component
const MoviePopover = ({ movie }) => {
    const [isOpen, setIsOpen] = useState(false);

    const title = movie.title || 'Unknown Movie';
    const year = movie.year;
    const releaseDate = movie.physicalRelease || movie.inCinemas || movie.digitalRelease;
    const overview = movie.overview || 'No description available.';

    // Determine release type
    let releaseType = 'Release';
    if (movie.physicalRelease) releaseType = 'Physical Release';
    else if (movie.digitalRelease) releaseType = 'Digital Release';
    else if (movie.inCinemas) releaseType = 'In Cinemas';

    return (
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
            <Popover.Trigger asChild>
                <button
                    style={{
                        padding: '0.5rem',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '0.5rem',
                        fontSize: '0.85rem',
                        width: '100%',
                        textAlign: 'left',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                    className="hover:bg-theme-tertiary"
                >
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }} className="text-theme-primary">{title}</div>
                    <div style={{ fontSize: '0.75rem' }} className="text-theme-secondary">
                        {year} • {releaseDate ? new Date(releaseDate).toLocaleDateString() : 'TBA'}
                    </div>
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
                                style={{ minWidth: '200px', maxWidth: '300px' }}
                            >
                                {/* Improved Arrow - matches glass-card with border */}
                                <Popover.Arrow
                                    width={16}
                                    height={8}
                                    style={{
                                        fill: 'url(#glass-gradient-radarr)',
                                        filter: 'drop-shadow(0 -1px 2px rgba(0, 0, 0, 0.3))'
                                    }}
                                />
                                {/* SVG Gradient Definition for Glass Effect */}
                                <svg width="0" height="0" style={{ position: 'absolute' }}>
                                    <defs>
                                        <linearGradient id="glass-gradient-radarr" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" style={{ stopColor: 'var(--glass-start)', stopOpacity: 1 }} />
                                            <stop offset="100%" style={{ stopColor: 'var(--glass-end)', stopOpacity: 1 }} />
                                        </linearGradient>
                                    </defs>
                                </svg>

                                {/* Movie Title */}
                                <div className="text-sm font-semibold mb-2 text-theme-primary">
                                    {title}
                                </div>

                                {/* Year */}
                                {year && (
                                    <div className="text-xs text-success mb-2 font-medium">
                                        {year}
                                    </div>
                                )}

                                {/* Release Date */}
                                <div className="text-xs text-theme-secondary mb-2">
                                    {releaseType}: {releaseDate ? new Date(releaseDate).toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    }) : 'TBA'}
                                </div>

                                {/* Overview */}
                                {overview && (
                                    <div className="text-xs text-theme-secondary leading-relaxed max-h-[150px] overflow-auto custom-scrollbar">
                                        {overview}
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

const RadarrWidget = ({ config }) => {
    // Get integrations state from context
    const { integrations } = useAppData();
    const integration = integrations?.radarr;

    // Check if integration is enabled
    const isIntegrationEnabled = integration?.enabled && integration?.url && integration?.apiKey;

    const { enabled = false, url = '', apiKey = '' } = config || {};
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isIntegrationEnabled) {
            setLoading(false);
            return;
        }

        const fetchCalendar = async () => {
            try {
                setLoading(true);
                const startDate = new Date().toISOString().split('T')[0];
                const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                const response = await fetch(`/api/radarr/calendar?start=${startDate}&end=${endDate}&url=${encodeURIComponent(integration.url)}&apiKey=${encodeURIComponent(integration.apiKey)}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();
                setData(result);
                setError(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCalendar();
        const interval = setInterval(fetchCalendar, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [isIntegrationEnabled, integration]);

    // Show integration disabled message if not enabled
    if (!isIntegrationEnabled) {
        return <IntegrationDisabledMessage serviceName="Radarr" />;
    }

    if (loading && !data) return <div className="text-secondary">Loading Calendar...</div>;
    if (error) return <div className="text-error">Error: {error}</div>;

    const movies = Array.isArray(data) ? data.slice(0, 5) : [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>Upcoming Movies</span>
            </div>
            {movies.length === 0 ? <div className="text-secondary">No upcoming movies.</div> :
                movies.map(movie => (
                    <MoviePopover key={movie.id} movie={movie} />
                ))
            }
        </div>
    );
};

export default RadarrWidget;
