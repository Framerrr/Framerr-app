import React, { useState, useEffect } from 'react';
import { Tv } from 'lucide-react';

const SonarrWidget = ({ config }) => {
    const { enabled = false, url = '', apiKey = '' } = config || {};
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!enabled || !url || !apiKey) {
            setLoading(false);
            return;
        }

        const fetchCalendar = async () => {
            try {
                setLoading(true);
                const startDate = new Date().toISOString().split('T')[0];
                const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                const response = await fetch(`/api/sonarr/calendar?start=${startDate}&end=${endDate}&url=${encodeURIComponent(url)}&apiKey=${encodeURIComponent(apiKey)}`);
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
    }, [enabled, url, apiKey]);

    if (!enabled) return <div className="text-secondary">Sonarr not configured.</div>;
    if (loading && !data) return <div className="text-secondary">Loading Calendar...</div>;
    if (error) return <div className="text-error">Error: {error}</div>;

    const episodes = Array.isArray(data) ? data.slice(0, 5) : [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>Upcoming Episodes</span>
            </div>
            {episodes.length === 0 ? <div className="text-secondary">No upcoming episodes.</div> :
                episodes.map(ep => {
                    const seriesTitle = ep.series?.title || ep.seriesTitle || 'Unknown Series';
                    const episodeTitle = ep.title || 'TBA';
                    const seasonNum = ep.seasonNumber ?? '?';
                    const episodeNum = ep.episodeNumber ?? '?';
                    const airDate = ep.airDate || ep.airDateUtc;

                    const displayTitle = episodeTitle !== 'TBA'
                        ? `${seriesTitle} - ${episodeTitle}`
                        : seriesTitle;

                    return (
                        <div
                            key={ep.id}
                            style={{
                                padding: '0.5rem',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '0.5rem',
                                fontSize: '0.85rem'
                            }}
                        >
                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{displayTitle}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                S{seasonNum}E{episodeNum} • {airDate ? new Date(airDate).toLocaleDateString() : 'TBA'}
                            </div>
                        </div>
                    );
                })
            }
        </div>
    );
};

export default SonarrWidget;
