import React, { useState, useEffect } from 'react';
import { Download, ArrowDown, ArrowUp } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { motion, AnimatePresence } from 'framer-motion';

const QBittorrentWidget = ({ config }) => {
    const { enabled = false, url = '', username = '', password = '' } = config || {};
    const [torrents, setTorrents] = useState([]);
    const [transferInfo, setTransferInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sortBy, setSortBy] = useState('added_on');
    const [sortDesc, setSortDesc] = useState(true);
    const [limit, setLimit] = useState(20);
    const [dlPopoverOpen, setDlPopoverOpen] = useState(false);
    const [ulPopoverOpen, setUlPopoverOpen] = useState(false);

    useEffect(() => {
        if (!enabled || !url) {
            return;
        }

        const fetchData = async () => {
            try {
                setLoading(true);

                // Fetch torrents
                const torrentsResponse = await fetch('/api/qbittorrent/torrents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, username, password })
                });

                if (!torrentsResponse.ok) throw new Error(`HTTP ${torrentsResponse.status}`);
                const torrentsData = await torrentsResponse.json();
                setTorrents(Array.isArray(torrentsData) ? torrentsData : []);

                // Fetch transfer info
                const transferResponse = await fetch('/api/qbittorrent/transfer-info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, username, password })
                });

                if (transferResponse.ok) {
                    const transferData = await transferResponse.json();
                    setTransferInfo(transferData);
                }

                setError(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000); // Refresh every 5s
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
        return <div className="text-theme-secondary">qBittorrent not configured.</div>;
    }

    if (loading && torrents.length === 0) {
        return <div className="text-theme-secondary">Loading torrents...</div>;
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
                {/* Total */}
                <div className="bg-theme-tertiary text-center p-2 rounded-lg">
                    <div className="text-theme-secondary">Total</div>
                    <div style={{ fontWeight: 600 }} className="text-theme-primary">{torrents.length}</div>
                </div>

                {/* Download Stats - Popover */}
                <Popover.Root open={dlPopoverOpen} onOpenChange={setDlPopoverOpen}>
                    <Popover.Trigger asChild>
                        <button
                            className="bg-success/10 text-center p-2 rounded-lg transition-all hover:bg-success/20 cursor-pointer focus:outline-none focus:ring-2 focus:ring-success/50"
                            aria-label="Download statistics"
                        >
                            <div className="text-theme-secondary">↓ {formatSpeed(totalDown)}</div>
                            <div style={{ fontWeight: 600 }} className="text-success">
                                {activeTorrents.filter(t => t.state === 'downloading').length} DL
                            </div>
                        </button>
                    </Popover.Trigger>

                    <AnimatePresence>
                        {dlPopoverOpen && (
                            <Popover.Portal forceMount>
                                <Popover.Content
                                    side="bottom"
                                    align="center"
                                    sideOffset={8}
                                    collisionPadding={24}
                                    asChild
                                >
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.96 }}
                                        transition={{ type: 'spring', stiffness: 220, damping: 30 }}
                                        className="glass-card border-theme rounded-xl shadow-2xl p-4 z-50"
                                        style={{ minWidth: 'max-content' }}
                                    >
                                        <Popover.Arrow className="fill-current text-theme-secondary" />
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between gap-4">
                                                <span className="text-theme-secondary">Download Speed:</span>
                                                <span className="text-success font-semibold">
                                                    {formatSpeed(transferInfo?.dl_info_speed || totalDown)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <span className="text-theme-secondary">Session Total:</span>
                                                <span className="text-theme-primary font-medium">
                                                    {formatBytes(transferInfo?.dl_info_data || 0)}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                </Popover.Content>
                            </Popover.Portal>
                        )}
                    </AnimatePresence>
                </Popover.Root>

                {/* Upload Stats - Popover */}
                <Popover.Root open={ulPopoverOpen} onOpenChange={setUlPopoverOpen}>
                    <Popover.Trigger asChild>
                        <button
                            className="bg-info/10 text-center p-2 rounded-lg transition-all hover:bg-info/20 cursor-pointer focus:outline-none focus:ring-2 focus:ring-info/50"
                            aria-label="Upload statistics"
                        >
                            <div className="text-theme-secondary">↑ {formatSpeed(totalUp)}</div>
                            <div style={{ fontWeight: 600 }} className="text-info">
                                {activeTorrents.filter(t => t.state === 'uploading').length} UP
                            </div>
                        </button>
                    </Popover.Trigger>

                    <AnimatePresence>
                        {ulPopoverOpen && (
                            <Popover.Portal forceMount>
                                <Popover.Content
                                    side="bottom"
                                    align="center"
                                    sideOffset={8}
                                    collisionPadding={24}
                                    asChild
                                >
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.96 }}
                                        transition={{ type: 'spring', stiffness: 220, damping: 30 }}
                                        className="glass-card border-theme rounded-xl shadow-2xl p-4 z-50"
                                        style={{ minWidth: 'max-content' }}
                                    >
                                        <Popover.Arrow className="fill-current text-theme-secondary" />
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between gap-4">
                                                <span className="text-theme-secondary">Upload Speed:</span>
                                                <span className="text-info font-semibold">
                                                    {formatSpeed(transferInfo?.up_info_speed || totalUp)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <span className="text-theme-secondary">Session Total:</span>
                                                <span className="text-theme-primary font-medium">
                                                    {formatBytes(transferInfo?.up_info_data || 0)}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                </Popover.Content>
                            </Popover.Portal>
                        )}
                    </AnimatePresence>
                </Popover.Root>
            </div>

            {/* Torrent List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {sortedTorrents.length === 0 ? (
                    <div className="text-theme-secondary">No active torrents</div>
                ) : (
                    sortedTorrents.map(torrent => {
                        const progress = (torrent.progress * 100).toFixed(1);
                        const isActive = ['downloading', 'uploading'].includes(torrent.state);

                        return (
                            <div
                                key={torrent.hash}
                                className="bg-theme-tertiary p-2 rounded-lg"
                                style={{ fontSize: '0.75rem' }}
                            >
                                <div className="font-semibold mb-1 text-theme-primary" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {torrent.name}
                                </div>

                                {/* Progress Bar */}
                                <div className="bg-theme-hover h-1 rounded-full mb-1 overflow-hidden">
                                    <div style={{
                                        width: `${progress}%`,
                                        height: '100%',
                                        transition: 'width 0.3s ease'
                                    }} className={isActive ? 'bg-success' : 'bg-theme-secondary'} />
                                </div>

                                <div className="flex justify-between text-theme-secondary">
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
