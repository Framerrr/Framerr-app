import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Film, Network, Info, ExternalLink, StopCircle, X, Loader2 } from 'lucide-react';
import PlaybackDataModal from './modals/PlaybackDataModal';
import MediaInfoModal from './modals/MediaInfoModal';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../utils/permissions';
import IntegrationDisabledMessage from '../common/IntegrationDisabledMessage';
import IntegrationNoAccessMessage from '../common/IntegrationNoAccessMessage';

const PlexWidget = ({ config, editMode = false, widgetId, onVisibilityChange }) => {
    // Get auth state to determine admin status
    const { user } = useAuth();
    const userIsAdmin = isAdmin(user);

    // Get integrations state from context - ONLY source of truth for access
    const { integrations } = useAppData();

    // ONLY use context integration - no fallback to config (ensures actual revocation)
    const integration = integrations?.plex || { enabled: false };

    // Check if integration is enabled (from context only)
    const isIntegrationEnabled = integration?.enabled && integration?.url && integration?.token;

    const { hideWhenEmpty = true } = config || {};
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hoveredSession, setHoveredSession] = useState(null);
    const [showPlaybackData, setShowPlaybackData] = useState(null);
    const [showMediaInfo, setShowMediaInfo] = useState(null);
    const [confirmStop, setConfirmStop] = useState(null);
    const [plexMachineId, setPlexMachineId] = useState(null);
    const [localHideWhenEmpty, setLocalHideWhenEmpty] = useState(hideWhenEmpty);
    const [stoppingSession, setStoppingSession] = useState(null);
    const previousVisibilityRef = useRef(null);

    // Sync local state with config prop
    useEffect(() => {
        setLocalHideWhenEmpty(hideWhenEmpty);
    }, [hideWhenEmpty]);

    useEffect(() => {
        if (!isIntegrationEnabled) {
            setLoading(false);
            return;
        }

        const fetchSessions = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/plex/sessions?url=${encodeURIComponent(integration.url)}&token=${encodeURIComponent(integration.token)}`);
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

        fetchSessions();
        const interval = setInterval(fetchSessions, 10000);
        return () => clearInterval(interval);
    }, [isIntegrationEnabled, integration]);

    // Fetch Plex machine ID on mount
    useEffect(() => {
        if (!isIntegrationEnabled) return;

        const fetchMachineId = async () => {
            try {
                const response = await fetch(`/api/plex/proxy?path=/&url=${encodeURIComponent(integration.url)}&token=${encodeURIComponent(integration.token)}`);
                if (response.ok) {
                    const xml = await response.text();
                    const match = xml.match(/machineIdentifier="([^"]+)"/);
                    if (match) setPlexMachineId(match[1]);
                }
            } catch (err) {
                logger.error('Error fetching Plex machine ID', { error: err.message, widget: 'Plex' });
            }
        };

        fetchMachineId();
    }, [isIntegrationEnabled, integration]);

    // Notify dashboard when visibility changes (for hideWhenEmpty)
    useEffect(() => {
        if (!onVisibilityChange || !enabled) return;

        const sessions = data?.sessions || [];
        const shouldBeVisible = sessions.length > 0 || editMode;

        // Only hide if hideWhenEmpty is enabled and there are no sessions
        const isVisible = !localHideWhenEmpty || shouldBeVisible;

        // Only call onVisibilityChange if visibility actually changed
        if (previousVisibilityRef.current !== isVisible) {
            previousVisibilityRef.current = isVisible;
            onVisibilityChange(widgetId, isVisible);
        }
    }, [data, localHideWhenEmpty, editMode, widgetId, onVisibilityChange, enabled]);

    const handleStopPlayback = async (session) => {
        if (stoppingSession === session.sessionKey) return;

        setStoppingSession(session.sessionKey);

        try {
            const response = await fetch('/api/plex/terminate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: integration.url,
                    token: integration.token,
                    sessionKey: session.Session?.id || session.sessionKey
                })
            });

            if (!response.ok) throw new Error('Failed to stop playback');

            setConfirmStop(null);
            // Refresh sessions immediately
            const refreshResponse = await fetch(`/api/plex/sessions?url=${encodeURIComponent(integration.url)}&token=${encodeURIComponent(integration.token)}`);
            if (refreshResponse.ok) {
                const result = await refreshResponse.json();
                setData(result);
            }
        } catch (err) {
            logger.error('Error stopping playback', { error: err.message, widget: 'Plex' });
            setError('Failed to stop playback: ' + err.message);
            setConfirmStop(null);
        } finally {
            setTimeout(() => setStoppingSession(null), 2000);
        }
    };

    const getPlexUrl = (session) => {
        const ratingKey = session.Media?.ratingKey;
        if (!ratingKey || !plexMachineId) return integration.url;
        return `${integration.url}/web/index.html#!/server/${plexMachineId}/details?key=/library/metadata/${ratingKey}`;
    };

    const handleToggleHideWhenEmpty = async (newValue) => {
        setLocalHideWhenEmpty(newValue);

        try {
            const response = await fetch('/api/widgets');
            if (!response.ok) throw new Error('Failed to fetch widgets');
            const data = await response.json();
            const widgets = data.widgets || [];

            const updatedWidgets = widgets.map(widget => {
                if (widget.id === widgetId) {
                    return {
                        ...widget,
                        config: {
                            ...widget.config,
                            hideWhenEmpty: newValue
                        }
                    };
                }
                return widget;
            });

            const saveResponse = await fetch('/api/widgets', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ widgets: updatedWidgets })
            });

            if (!saveResponse.ok) throw new Error('Failed to save widget config');
        } catch (err) {
            setLocalHideWhenEmpty(!newValue);
            logger.error('Error updating hideWhenEmpty', { error: err.message, widget: 'Plex' });
            setError('Failed to update hide when empty setting');
        }
    };

    // Show appropriate message based on user role
    if (!isIntegrationEnabled) {
        // Admins see "disabled" (can fix it), non-admins see "no access"
        return userIsAdmin
            ? <IntegrationDisabledMessage serviceName="Plex" />
            : <IntegrationNoAccessMessage serviceName="Plex" />;
    }

    if (loading && !data) return <div className="text-secondary">Loading Plex...</div>;
    if (error) return <div className="text-error">Error: {error}</div>;

    const sessions = data?.sessions || [];

    // Hide widget if no sessions and hideWhenEmpty is enabled (not in edit mode)
    if (localHideWhenEmpty && sessions.length === 0 && !editMode) {
        return null;
    }

    if (sessions.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', position: 'relative' }}>
                <Film size={48} style={{ opacity: 0.3 }} />
                <div className="text-secondary">No active streams</div>

                {/* Hide When Empty Toggle - Edit Mode Only */}
                {editMode && (
                    <div className="no-drag" style={{
                        position: 'absolute',
                        bottom: '1rem',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        background: 'var(--bg-hover)',
                        borderRadius: '8px',
                        border: '1px dashed var(--border)'
                    }}>
                        <input
                            type="checkbox"
                            id="hideWhenEmpty"
                            checked={localHideWhenEmpty}
                            onChange={(e) => handleToggleHideWhenEmpty(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                        />
                        <label
                            htmlFor="hideWhenEmpty"
                            style={{
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                color: 'var(--text-secondary)',
                                userSelect: 'none'
                            }}
                        >
                            Hide widget when no streams
                        </label>
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
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

                    let subtitle = '';
                    if (session.type === 'episode' && session.parentIndex && session.index) {
                        subtitle = `S${session.parentIndex} • E${session.index}`;
                    } else if (session.type === 'movie') {
                        subtitle = 'Movie';
                    }

                    const imageUrl = session.art
                        ? `/api/plex/image?path=${encodeURIComponent(session.art)}&url=${encodeURIComponent(integration.url)}&token=${encodeURIComponent(integration.token)}`
                        : session.thumb
                            ? `/api/plex/image?path=${encodeURIComponent(session.thumb)}&url=${encodeURIComponent(integration.url)}&token=${encodeURIComponent(integration.token)}`
                            : null;

                    const isHovered = hoveredSession === session.sessionKey;

                    return (
                        <div
                            key={session.sessionKey}
                            onMouseEnter={() => setHoveredSession(session.sessionKey)}
                            onMouseLeave={() => setHoveredSession(null)}
                            style={{
                                background: 'var(--bg-hover)',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                position: 'relative',
                                transition: 'transform 0.2s',
                                transform: isHovered ? 'translateY(-2px)' : 'none'
                            }}
                        >
                            {/* Image Container */}
                            <div style={{
                                flex: '0 0 70%',
                                position: 'relative',
                                background: 'var(--bg-tertiary)'
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

                                {/* Hover Overlay with Action Buttons */}
                                {isHovered && (
                                    <div className="no-drag" style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'rgba(0, 0, 0, 0.7)',
                                        backdropFilter: 'blur(4px)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        transition: 'opacity 0.2s',
                                        zIndex: 10
                                    }}>
                                        {/* Network/Playback Data Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowPlaybackData(session);
                                            }}
                                            style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '8px',
                                                background: 'var(--bg-hover)',
                                                border: '1px solid var(--border)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                color: 'var(--text-primary)'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                            title="Playback Data"
                                        >
                                            <Network size={20} />
                                        </button>

                                        {/* Media Info Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowMediaInfo(session);
                                            }}
                                            style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '8px',
                                                background: 'var(--bg-hover)',
                                                border: '1px solid var(--border)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                color: 'var(--text-primary)'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                            title="Media Info"
                                        >
                                            <Info size={20} />
                                        </button>

                                        {/* Open in Plex Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(getPlexUrl(session), '_blank');
                                            }}
                                            style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '8px',
                                                background: 'var(--bg-hover)',
                                                border: '1px solid var(--border)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                color: 'var(--text-primary)'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                            title="Open in Plex"
                                        >
                                            <ExternalLink size={20} />
                                        </button>

                                        {/* Stop Playback Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmStop(session);
                                            }}
                                            style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '8px',
                                                background: 'rgba(239, 68, 68, 0.2)',
                                                border: '1px solid var(--error)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                color: 'var(--error)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                            }}
                                            title="Stop Playback"
                                        >
                                            <StopCircle size={20} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Progress Bar */}
                            <div style={{
                                height: '6px',
                                background: 'var(--bg-tertiary)'
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
                                    textOverflow: 'ellipsis',
                                    color: 'var(--text-primary)'
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

            {/* Confirmation Dialog for Stop Playback */}
            {confirmStop && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }} onClick={() => setConfirmStop(null)}>
                    <div style={{
                        background: 'var(--bg-secondary)',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        maxWidth: '400px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        border: '1px solid var(--border)'
                    }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Stop Playback?</h3>
                        <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)' }}>
                            Stop playback for <strong style={{ color: 'var(--text-primary)' }}>{confirmStop.user?.title}</strong>?
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setConfirmStop(null)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    background: 'var(--bg-hover)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleStopPlayback(confirmStop)}
                                disabled={stoppingSession === confirmStop?.sessionKey}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    background: stoppingSession === confirmStop?.sessionKey ? '#991b1b' : 'var(--error)',
                                    border: 'none',
                                    color: 'white',
                                    cursor: stoppingSession === confirmStop?.sessionKey ? 'not-allowed' : 'pointer',
                                    opacity: stoppingSession === confirmStop?.sessionKey ? 0.6 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {stoppingSession === confirmStop?.sessionKey ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Stopping...
                                    </>
                                ) : (
                                    'Stop Playback'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Playback Data Modal */}
            {showPlaybackData && (
                <PlaybackDataModal
                    session={showPlaybackData}
                    onClose={() => setShowPlaybackData(null)}
                />
            )}

            {/* Media Info Modal */}
            {showMediaInfo && (
                <MediaInfoModal
                    session={showMediaInfo}
                    url={integration.url}
                    token={integration.token}
                    onClose={() => setShowMediaInfo(null)}
                />
            )}
        </>
    );
};

export default PlexWidget;
