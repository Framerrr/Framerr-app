import React, { useState, useEffect } from 'react';
import { Film } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import IntegrationDisabledMessage from '../common/IntegrationDisabledMessage';

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
                movies.map(movie => {
                    const title = movie.title || 'Unknown Movie';
                    const releaseDate = movie.physicalRelease || movie.inCinemas || movie.digitalRelease;
                    const year = movie.year;

                    return (
                        <div
                            key={movie.id}
                            style={{
                                padding: '0.5rem',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '0.5rem',
                                fontSize: '0.85rem'
                            }}
                        >
                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{title}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                {year} • {releaseDate ? new Date(releaseDate).toLocaleDateString() : 'TBA'}
                            </div>
                        </div>
                    );
                })
            }
        </div>
    );
};

export default RadarrWidget;
