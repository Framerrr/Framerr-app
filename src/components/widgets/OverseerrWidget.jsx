import React, { useState, useEffect, useRef } from 'react';
import { Star, Film } from 'lucide-react';

const OverseerrWidget = ({ config }) => {
    const { enabled = false, url = '', apiKey = '' } = config || {};
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        if (!enabled || !url || !apiKey) {
            setLoading(false);
            return;
        }

        const fetchRequests = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/overseerr/requests?url=${encodeURIComponent(url)}&apiKey=${encodeURIComponent(apiKey)}`);
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

        fetchRequests();
        const interval = setInterval(fetchRequests, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [enabled, url, apiKey]);

    if (!enabled) return <div className="text-secondary">Overseerr not configured.</div>;
    if (loading && !data) return <div className="text-secondary">Loading Requests...</div>;
    if (error) return <div className="text-error">Error: {error}</div>;

    const requests = data?.results || [];

    if (requests.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem' }}>
                <Star size={48} style={{ opacity: 0.3 }} />
                <div className="text-secondary">No pending requests</div>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Scrollable Carousel */}
            <div
                ref={scrollContainerRef}
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '1rem',
                    overflowY: 'auto',
                    padding: '0.25rem'
                }}
            >
                {requests.slice(0, 10).map(req => {
                    const media = req.media;
                    // Use enriched title from backend (works for both TV and movies)
                    const title = media?.title || 'Unknown';
                    const user = req.requestedBy?.displayName || 'User';
                    const type = media?.mediaType === 'tv' ? 'TV Show' : 'Movie';

                    // Status: 1=Pending, 2=Approved, 3=Declined, 5=Available
                    let status = 'Pending';
                    let statusColor = '#fbbf24'; // yellow
                    if (req.status === 2) {
                        status = 'Approved';
                        statusColor = '#4ade80'; // green
                    } else if (req.status === 3) {
                        status = 'Declined';
                        statusColor = '#f87171'; // red
                    } else if (req.status === 5) {
                        status = 'Available';
                        statusColor = '#34d399'; // emerald
                    }

                    const posterUrl = media?.posterPath
                        ? `https://image.tmdb.org/t/p/w300${media.posterPath}`
                        : null;

                    return (
                        <div
                            key={req.id}
                            style={{
                                background: 'rgba(0,0,0,0.3)',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                            }}
                        >
                            {/* Poster */}
                            <div style={{
                                aspectRatio: '2/3',
                                position: 'relative',
                                background: 'rgba(255,255,255,0.05)'
                            }}>
                                {posterUrl ? (
                                    <img
                                        src={posterUrl}
                                        alt={title}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Film size={32} className="text-secondary" style={{ opacity: 0.3 }} />
                                    </div>
                                )}
                                {/* Status Badge */}
                                <div style={{
                                    position: 'absolute',
                                    top: '0.5rem',
                                    right: '0.5rem',
                                    padding: '0.25rem 0.5rem',
                                    background: statusColor,
                                    color: '#000',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    borderRadius: '4px'
                                }}>
                                    {status}
                                </div>
                            </div>

                            {/* Info */}
                            <div style={{ padding: '0.75rem 0.5rem' }}>
                                <div style={{
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    marginBottom: '0.25rem',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }} title={title}>
                                    {title}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '0.7rem',
                                    color: 'var(--text-secondary)'
                                }}>
                                    <span>{type}</span>
                                    <span title={user} style={{
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '60px'
                                    }}>
                                        {user}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OverseerrWidget;
