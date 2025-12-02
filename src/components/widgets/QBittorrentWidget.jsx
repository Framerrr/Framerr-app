import React, { useState, useEffect } from 'react';
import { Download, ArrowDown, ArrowUp } from 'lucide-react';

const QBittorrentWidget = ({ config }) => {
    const { enabled = false, url = '', username = '', password = '' } = config || {};
    const [torrents, setTorrents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sortBy, setSortBy] = useState('added_on');
    const [sortDesc, setSortDesc] = useState(true);
    const [limit, setLimit] = useState(20);

    useEffect(() => {
        if (!enabled || !url) {
            return;
        }

        const fetchTorrents = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/qbittorrent/torrents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url,
                        username,
                        password
                    })
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                setTorrents(Array.isArray(data) ? data : []);
                setError(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTorrents();
        const interval = setInterval(fetchTorrents, 5000); // Refresh every 5s
        return () => clearInterval(interval);
    }, [enabled, url, username, password]);

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const formatSpeed = (bytesPerSec) => formatBytes(bytesPerSec) + '/s';

    if (!enabled || !url) {
        return <div className="text-secondary">qBittorrent not configured.</div>;
    }

    if (loading && torrents.length === 0) {
        return <div className="text-secondary">Loading torrents...</div>;
    }

    if (error) {
        return <div className="text-error">Error: {error}</div>;
    }

    // Sort torrents
    const sortedTorrents = [...torrents].sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        return sortDesc ? (bVal - aVal) : (aVal - bVal);
    }).slice(0, limit);

    const activeTorrents = torrents.filter(t => ['downloading', 'uploading'].includes(t.state));
    const totalDown = activeTorrents.reduce((sum, t) => sum + (t.dlspeed || 0), 0);
    const totalUp = activeTorrents.reduce((sum, t) => sum + (t.upspeed || 0), 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
                <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
                    <div className="text-secondary">Total</div>
                    <div style={{ fontWeight: 600 }}>{torrents.length}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(74,222,128,0.1)', borderRadius: '0.5rem' }}>
                    <div className="text-secondary">↓ {formatSpeed(totalDown)}</div>
                    <div style={{ fontWeight: 600, color: '#4ade80' }}>{activeTorrents.filter(t => t.state === 'downloading').length} DL</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(96,165,250,0.1)', borderRadius: '0.5rem' }}>
                    <div className="text-secondary">↑ {formatSpeed(totalUp)}</div>
                    <div style={{ fontWeight: 600, color: '#60a5fa' }}>{activeTorrents.filter(t => t.state === 'uploading').length} UP</div>
                </div>
            </div>

            {/* Torrent List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {sortedTorrents.length === 0 ? (
                    <div className="text-secondary">No active torrents</div>
                ) : (
                    sortedTorrents.map(torrent => {
                        const progress = (torrent.progress * 100).toFixed(1);
                        const isActive = ['downloading', 'uploading'].includes(torrent.state);

                        return (
                            <div
                                key={torrent.hash}
                                style={{
                                    padding: '0.5rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.75rem'
                                }}
                            >
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {torrent.name}
                                </div>

                                {/* Progress Bar */}
                                <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginBottom: '0.25rem', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${progress}%`,
                                        height: '100%',
                                        background: isActive ? '#4ade80' : '#6b7280',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                    <span>{progress}% • {formatBytes(torrent.size)}</span>
                                    {isActive && (
                                        <span>
                                            <ArrowDown size={12} style={{ display: 'inline' }} /> {formatSpeed(torrent.dlspeed)}
                                            {' '}
                                            <ArrowUp size={12} style={{ display: 'inline' }} /> {formatSpeed(torrent.upspeed)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default QBittorrentWidget;
