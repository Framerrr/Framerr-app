import React, { useState, useEffect, useRef } from 'react';
import { Star, Film, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import IntegrationDisabledMessage from '../common/IntegrationDisabledMessage';

const OverseerrWidget = ({ config }) => {
    // Get integrations state from context (available for admins)
    const { integrations } = useAppData();
    const contextIntegration = integrations?.overseerr;

    // For shared widgets (non-admins), integration config comes from the config prop
    // For admins, it comes from the context
    const integration = contextIntegration?.enabled
        ? contextIntegration
        : { enabled: config?.enabled, url: config?.url, apiKey: config?.apiKey };

    // Check if integration is enabled (from either source)
    const isIntegrationEnabled = integration?.enabled && integration?.url && integration?.apiKey;

    const { enabled = false, url = '', apiKey = '' } = config || {};
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        if (!isIntegrationEnabled) {
            setLoading(false);
            return;
        }

        const fetchRequests = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/overseerr/requests?url=${encodeURIComponent(integration.url)}&apiKey=${encodeURIComponent(integration.apiKey)}`);
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
    }, [isIntegrationEnabled, integration]);

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            const width = scrollContainerRef.current.clientWidth;
            scrollContainerRef.current.scrollBy({ left: -width * 0.8, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            const width = scrollContainerRef.current.clientWidth;
            scrollContainerRef.current.scrollBy({ left: width * 0.8, behavior: 'smooth' });
        }
    };

    // Show integration disabled message if not enabled
    if (!isIntegrationEnabled) {
        return <IntegrationDisabledMessage serviceName="Overseerr" />;
    }

    if (loading && !data) return <div className="text-theme-secondary">Loading Requests...</div>;
    if (error) return <div className="text-error">Error: {error}</div>;

    const requests = data?.results || [];

    if (requests.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-2">
                <Star size={48} className="text-theme-tertiary opacity-30" />
                <div className="text-theme-secondary">No pending requests</div>
            </div>
        );
    }

    const headerHeight = 32;
    const headerGap = 12;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header with Scroll Buttons */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: `${headerHeight}px`,
                marginBottom: `${headerGap}px`,
                flexShrink: 0
            }}>
                <span className="text-sm font-semibold text-theme-primary">
                    Recent Requests
                </span>
                <div className="flex gap-1">
                    <button
                        onClick={scrollLeft}
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-theme-tertiary hover:bg-theme-hover border border-theme text-theme-secondary hover:text-theme-primary transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        onClick={scrollRight}
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-theme-tertiary hover:bg-theme-hover border border-theme text-theme-secondary hover:text-theme-primary transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Horizontal Scrollable Carousel */}
            <div
                ref={scrollContainerRef}
                style={{
                    display: 'flex',
                    gap: '12px',
                    flex: 1,
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    scrollBehavior: 'smooth',
                    scrollbarWidth: 'none', // Firefox
                    msOverflowStyle: 'none', // IE/Edge
                    paddingBottom: '4px'
                }}
                className="hide-scrollbar"
            >
                <style>{`
                    .hide-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>
                {requests.map((req, i) => {
                    const media = req.media;
                    // Use enriched title from backend (works for both TV and movies)
                    const title = media?.title || 'Unknown';
                    const user = req.requestedBy?.displayName || 'User';

                    // Overseerr Status Logic:
                    // req.status: 1=Pending Approval, 2=Approved, 3=Declined
                    // media.status: 1=Unknown, 2=Pending, 3=Processing, 4=Partially Available, 5=Available
                    let status = 'Pending';
                    let statusColor = 'var(--warning)'; // amber

                    // Check if media is available (downloaded)
                    if (media?.status === 5) {
                        status = 'Available';
                        statusColor = 'var(--success)'; // emerald
                    }
                    // Check request status
                    else if (req.status === 2) {
                        status = 'Approved';
                        statusColor = 'var(--success)'; // green
                    } else if (req.status === 3) {
                        status = 'Declined';
                        statusColor = 'var(--error)'; // red
                    }
                    // Default to pending for status 1 or unknown

                    const posterUrl = media?.posterPath
                        ? `https://image.tmdb.org/t/p/w342${media.posterPath}`
                        : null;

                    return (
                        <div
                            key={`${req.id}-${i}`}
                            className="group relative h-full flex-shrink-0 rounded-xl overflow-hidden shadow-medium transition-transform duration-200 hover:-translate-y-1 hover:shadow-deep"
                            style={{
                                height: '100%',
                                aspectRatio: '2/3'
                            }}
                        >
                            {/* Poster Image */}
                            {posterUrl ? (
                                <img
                                    src={posterUrl}
                                    alt={title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-theme-tertiary flex items-center justify-center">
                                    <Film size={32} className="text-theme-secondary opacity-30" />
                                </div>
                            )}

                            {/* Status Badge */}
                            <div
                                className="absolute top-2 right-2 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border"
                                style={{
                                    background: 'rgba(0,0,0,0.8)',
                                    color: statusColor,
                                    borderColor: `${statusColor}40`
                                }}
                            >
                                {status}
                            </div>

                            {/* Gradient Overlay with Text */}
                            <div className="absolute inset-x-0 bottom-0 pt-12 pb-3 px-3 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/70 to-transparent">
                                <div
                                    className="font-semibold text-xs text-white text-center mb-1 line-clamp-2 leading-tight"
                                    title={title}
                                >
                                    {title}
                                </div>
                                <div className="text-[10px] text-white/70 text-center">
                                    {user}
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
