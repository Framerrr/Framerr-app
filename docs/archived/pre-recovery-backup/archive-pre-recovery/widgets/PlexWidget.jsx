import React from 'react';
import { Film } from 'lucide-react';
import { useIntegration, useFetchIntegration } from '../../hooks/useIntegration';

const PlexWidget = () => {
    const config = useIntegration('plex');

    const apiUrl = config.enabled && config.url && config.token
        ? `/api/plex/sessions?url=${encodeURIComponent(config.url)}&token=${encodeURIComponent(config.token)}`
        : null;

    const { data, loading, error } = useFetchIntegration(
        apiUrl,
        config.enabled && !!apiUrl
    );

    if (!config.enabled) return <div className="text-secondary">Plex not configured.</div>;
    if (loading && !data) return <div className="text-secondary">Loading Plex...</div>;
    if (error) return <div className="text-error">Error: {error}</div>;

    const sessions = data?.sessions || [];

    if (sessions.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem' }}>
                <Film size={48} style={{ opacity: 0.3 }} />
                <div className="text-secondary">No active streams</div>
            </div>
        );
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '1rem',
            height: '100%',
            overflowY: 'auto',
            padding: '0.25rem'
        }}>
            {sessions.map(session => {
                const user = session.user?.title || 'Unknown User';
                const grandparent = session.grandparentTitle || '';
                const title = session.title || 'Unknown';
                const duration = session.duration || 0;
                const viewOffset = session.viewOffset || 0;
                const percent = duration > 0 ? (viewOffset / duration) * 100 : 0;

                // Build subtitle (e.g., "S1 • E3" or just the title for movies)
                let subtitle = '';
                if (session.type === 'episode' && session.parentIndex && session.index) {
                    subtitle = `S${session.parentIndex} • E${session.index}`;
                } else if (session.type === 'movie') {
                    subtitle = 'Movie';
                }

                // Use art (backdrop) if available, else thumb (poster)
                const imageUrl = session.art
                    ? `/api/plex/image?path=${encodeURIComponent(session.art)}&url=${encodeURIComponent(config.url)}&token=${encodeURIComponent(config.token)}`
                    : session.thumb
                        ? `/api/plex/image?path=${encodeURIComponent(session.thumb)}&url=${encodeURIComponent(config.url)}&token=${encodeURIComponent(config.token)}`
                        : null;

                return (
                    <div
                        key={session.sessionKey}
                        style={{
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}
                    >
                        {/* Image Container */}
                        <div style={{
                            aspectRatio: '16/9',
                            position: 'relative',
                            background: 'rgba(255,255,255,0.05)'
                        }}>
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt={title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Film size={32} className="text-secondary" style={{ opacity: 0.3 }} />
                                </div>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div style={{
                            height: '6px',
                            background: 'rgba(255,255,255,0.1)'
                        }}>
                            <div style={{
                                width: `${percent}%`,
                                background: 'var(--accent)',
                                height: '100%',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>

                        {/* Info Section */}
                        <div style={{ padding: '0.75rem 0.5rem' }}>
                            <div style={{
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                marginBottom: '0.25rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }} title={grandparent || title}>
                                {grandparent || title}
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.7rem',
                                color: 'var(--text-secondary)'
                            }}>
                                <span>{subtitle}</span>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                }}>
                                    <span style={{
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '80px'
                                    }} title={user}>{user}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default PlexWidget;
