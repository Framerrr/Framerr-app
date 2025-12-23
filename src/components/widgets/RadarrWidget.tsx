import React, { useState, useEffect } from 'react';
import { Film } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../utils/permissions';
import { useEditModeAware } from '../../hooks/useEditModeAware';
import IntegrationDisabledMessage from '../common/IntegrationDisabledMessage';
import IntegrationNoAccessMessage from '../common/IntegrationNoAccessMessage';
import IntegrationConnectionError from '../common/IntegrationConnectionError';
import LoadingSpinner from '../common/LoadingSpinner';

interface Movie {
    id: number;
    title?: string;
    year?: number;
    physicalRelease?: string;
    digitalRelease?: string;
    inCinemas?: string;
    overview?: string;
}

interface MoviePopoverProps {
    movie: Movie;
}

// Movie Detail Popover Component
const MoviePopover = ({ movie }: MoviePopoverProps): React.JSX.Element => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const { editMode } = useEditModeAware();

    const title = movie.title || 'Unknown Movie';
    const year = movie.year;
    const releaseDate = movie.physicalRelease || movie.inCinemas || movie.digitalRelease;
    const overview = movie.overview || 'No description available.';

    // Determine release type
    let releaseType = 'Release';
    if (movie.physicalRelease) releaseType = 'Physical Release';
    else if (movie.digitalRelease) releaseType = 'Digital Release';
    else if (movie.inCinemas) releaseType = 'In Cinemas';

    // Block popover from opening when in edit mode
    const handleOpenChange = (open: boolean) => {
        if (editMode && open) return;
        setIsOpen(open);
    };

    return (
        <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
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
                            sideOffset={4}
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
                                {/* Improved Arrow */}
                                <Popover.Arrow
                                    width={16}
                                    height={8}
                                    style={{
                                        fill: 'url(#glass-gradient-radarr)',
                                        filter: 'drop-shadow(0 -1px 2px rgba(0, 0, 0, 0.3))'
                                    }}
                                />
                                {/* SVG Gradient Definition */}
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

interface RadarrConfig {
    [key: string]: unknown;
}

export interface RadarrWidgetProps {
    config?: RadarrConfig;
}

const RadarrWidget = ({ config }: RadarrWidgetProps): React.JSX.Element => {
    // Get auth state to determine admin status
    const { user } = useAuth();
    const userIsAdmin = isAdmin(user);

    // Get integrations state from context
    const { integrations, integrationsLoaded, integrationsError } = useAppData();

    // Wait for integrations to load before checking status
    if (!integrationsLoaded) {
        return <LoadingSpinner size="sm" />;
    }

    // Show connection error if integrations failed to load
    if (integrationsError) {
        return <IntegrationConnectionError serviceName="Radarr" />;
    }

    // ONLY use context integration
    const integration = integrations?.radarr || { enabled: false };

    // Check if integration is enabled
    const isIntegrationEnabled = integration?.enabled && integration?.url && integration?.apiKey;

    const [data, setData] = useState<Movie[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isIntegrationEnabled) {
            setLoading(false);
            return;
        }

        const fetchWithRetry = async (retriesLeft: number = 3): Promise<void> => {
            try {
                const startDate = new Date().toISOString().split('T')[0];
                const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                const response = await fetch(`/api/radarr/calendar?start=${startDate}&end=${endDate}&url=${encodeURIComponent(integration.url as string)}&apiKey=${encodeURIComponent(integration.apiKey as string)}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();
                setData(result);
                setError(null); // Clear any previous error on success
                setLoading(false);
            } catch (err) {
                if (retriesLeft > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return fetchWithRetry(retriesLeft - 1);
                }
                setError((err as Error).message);
                setLoading(false);
            }
        };

        setLoading(true);
        fetchWithRetry();

        const interval = setInterval(() => fetchWithRetry(), 60000);
        return () => clearInterval(interval);
    }, [isIntegrationEnabled, integration]);

    // Show appropriate message based on user role
    if (!isIntegrationEnabled) {
        return userIsAdmin
            ? <IntegrationDisabledMessage serviceName="Radarr" />
            : <IntegrationNoAccessMessage serviceName="Radarr" />;
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
