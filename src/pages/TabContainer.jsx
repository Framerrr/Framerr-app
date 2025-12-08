import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ExternalLink, AlertCircle, Lock, X } from 'lucide-react';
import logger from '../utils/logger';
import { useSystemConfig } from '../context/SystemConfigContext';
import { detectAuthNeed, isAuthDetectionEnabled, getSensitivity, getUserAuthPatterns } from '../utils/authDetection';

const TabContainer = () => {
    const navigate = useNavigate();
    const { systemConfig } = useSystemConfig();
    const [tabs, setTabs] = useState([]);
    const [loadedTabs, setLoadedTabs] = useState(new Set()); // Track which tabs have been loaded
    const [activeSlug, setActiveSlug] = useState(null); // Current visible tab
    const [reloadKeys, setReloadKeys] = useState({}); // Per-tab reload triggers
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [iframeLoadingStates, setIframeLoadingStates] = useState({}); // Track loading per iframe

    // Auth detection state (per tab)
    const [needsAuth, setNeedsAuth] = useState({}); // { slug: boolean }
    const [authDetectionInfo, setAuthDetectionInfo] = useState({}); // { slug: detection info }
    const [isReloading, setIsReloading] = useState({}); // { slug: boolean }
    const iframeRefs = useRef({}); // { slug: iframe ref }
    const authWindowRefs = useRef({}); // { slug: window ref }
    const detectionIntervalRefs = useRef({}); // { slug: interval id }

    // Fetch all tabs on mount
    useEffect(() => {
        fetchTabs();
    }, []);

    // Handle hash changes
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.slice(1); // Remove '#'
            if (hash && hash !== 'dashboard' && hash !== 'settings') {
                logger.debug('Hash changed to:', hash);
                setActiveSlug(hash);
                // Mark this tab as loaded (lazy loading)
                setLoadedTabs(prev => new Set([...prev, hash]));
            }
        };

        // Run on mount and hash changes
        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [tabs]);

    const fetchTabs = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/tabs', {
                credentials: 'include'
            });

            if (!response.ok) {
                setError('Failed to load tabs');
                setLoading(false);
                return;
            }

            const data = await response.json();
            const fetchedTabs = data.tabs || [];
            setTabs(fetchedTabs);
            setError(null);
        } catch (err) {
            logger.error('Error fetching tabs:', err);
            setError('Failed to load tabs');
        } finally {
            setLoading(false);
        }
    };

    const handleIframeLoad = (slug) => {
        logger.debug('Iframe loaded:', slug);
        setIframeLoadingStates(prev => ({ ...prev, [slug]: false }));
    };

    const reloadTab = (slug) => {
        logger.info('Reloading tab:', slug);
        setIframeLoadingStates(prev => ({ ...prev, [slug]: true }));
        setReloadKeys(prev => ({ ...prev, [slug]: (prev[slug] || 0) + 1 }));
    };

    // Auth detection handlers
    const handleOpenAuth = (slug, authUrl) => {
        logger.info(`Opening auth in new tab for ${slug}:`, authUrl);
        const authWindow = window.open(authUrl, '_blank');
        authWindowRefs.current[slug] = authWindow;

        const pollInterval = setInterval(() => {
            if (authWindowRefs.current[slug]?.closed) {
                clearInterval(pollInterval);
                handleAuthComplete(slug);
            }
        }, 500);
    };

    const handleAuthComplete = (slug) => {
        logger.info(`Auth window closed for ${slug}, reloading iframe`);
        setIsReloading(prev => ({ ...prev, [slug]: true }));
        setNeedsAuth(prev => ({ ...prev, [slug]: false }));

        setTimeout(() => {
            reloadTab(slug);
            setTimeout(() => {
                setIsReloading(prev => ({ ...prev, [slug]: false }));

                // Check if still on auth page after reload
                const iframe = iframeRefs.current[slug];
                if (iframe) {
                    try {
                        const currentSrc = iframe.src;
                        const tab = tabs.find(t => t.slug === slug);
                        if (tab) {
                            const sensitivity = getSensitivity(systemConfig);
                            const userPatterns = getUserAuthPatterns(systemConfig);
                            const detection = detectAuthNeed(currentSrc, tab.url, userPatterns, sensitivity);
                            if (detection.needsAuth) {
                                setNeedsAuth(prev => ({ ...prev, [slug]: true }));
                                setAuthDetectionInfo(prev => ({ ...prev, [slug]: detection }));
                            }
                        }
                    } catch (e) {
                        // Cross-origin - can't read src
                    }
                }
            }, 500);
        }, 500);
    };

    const handleManualAuth = (slug) => {
        const tab = tabs.find(t => t.slug === slug);
        if (!tab) return;

        const iframe = iframeRefs.current[slug];
        const authUrl = iframe?.src || tab.url;

        logger.info(`Manual auth triggered for ${slug}`);
        setNeedsAuth(prev => ({ ...prev, [slug]: true }));
        setAuthDetectionInfo(prev => ({
            ...prev,
            [slug]: {
                needsAuth: true,
                confidence: 10,
                reasons: ['Manual auth trigger'],
                threshold: 0
            }
        }));
    };

    const handleDismissOverlay = (slug) => {
        setNeedsAuth(prev => ({ ...prev, [slug]: false }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-400">
                    <div className="w-12 h-12 border-4 border-slate-700 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
                    <p>Loading tabs...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-400">
                    <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
                    <h2 className="text-xl font-bold text-white mb-2">Error</h2>
                    <p>{error}</p>
                    <button
                        onClick={() => window.location.hash = 'dashboard'}
                        className="mt-4 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (tabs.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-400">
                    <AlertCircle size={48} className="mx-auto mb-4 text-yellow-400" />
                    <h2 className="text-xl font-bold text-white mb-2">No Tabs Found</h2>
                    <p>You don't have any tabs configured yet.</p>
                    <button
                        onClick={() => window.location.hash = 'settings'}
                        className="mt-4 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
                    >
                        Go to Settings
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Render iframes for all LOADED tabs */}
            {Array.from(loadedTabs).map(slug => {
                const tab = tabs.find(t => t.slug === slug);
                if (!tab) return null; // Tab was deleted

                const isActive = slug === activeSlug;
                const isLoading = iframeLoadingStates[slug] !== false;

                return (
                    <div
                        key={slug}
                        style={{ display: isActive ? 'flex' : 'none' }}
                        className="w-full h-full flex flex-col"
                    >
                        {/* Toolbar */}
                        <div className="h-12 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between px-4 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-white">{tab.name}</h3>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleManualAuth(slug)}
                                    className="text-slate-400 hover:text-white transition-colors"
                                    title="Re-authenticate"
                                >
                                    <Lock size={18} />
                                </button>
                                <button
                                    onClick={() => reloadTab(slug)}
                                    className="text-slate-400 hover:text-white transition-colors"
                                    title="Reload"
                                >
                                    <RefreshCw size={18} />
                                </button>
                                <a
                                    href={tab.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-slate-400 hover:text-white transition-colors"
                                    title="Open in new tab"
                                >
                                    <ExternalLink size={18} />
                                </a>
                            </div>
                        </div>

                        {/* Iframe Container */}
                        <div className="flex-1 relative bg-white">
                            {isLoading && (
                                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center z-10">
                                    <div className="text-center text-slate-400">
                                        <div className="w-12 h-12 border-4 border-slate-700 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
                                        <p>Loading {tab.name}...</p>
                                    </div>
                                </div>
                            )}

                            <iframe
                                ref={el => iframeRefs.current[slug] = el}
                                key={reloadKeys[slug] || 0}
                                src={tab.url}
                                title={tab.name}
                                className="w-full h-full border-none"
                                onLoad={() => handleIframeLoad(slug)}
                                allow="clipboard-read; clipboard-write; fullscreen"
                            />

                            {/* Auth Required Overlay */}
                            {(needsAuth[slug] || isReloading[slug]) && (
                                <div className="absolute inset-0 glass-card flex items-center justify-center z-20" style={{ backgroundColor: 'var(--bg-tertiary-transparent)' }}>
                                    <div className="glass-card max-w-md w-full mx-4 p-8 text-center border border-theme">
                                        {isReloading[slug] ? (
                                            <>
                                                <div className="w-16 h-16 border-4 mx-auto mb-6 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}></div>
                                                <h3 className="text-xl font-semibold mb-2 text-theme-primary">Verifying Authentication...</h3>
                                                <p className="text-theme-secondary text-sm">Please wait while we reload the page</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'var(--accent-transparent)' }}>
                                                    <Lock size={32} style={{ color: 'var(--accent)' }} />
                                                </div>
                                                <h3 className="text-xl font-semibold mb-4 text-theme-primary">Authentication Required</h3>
                                                <p className="text-theme-secondary mb-2 text-sm">This page requires you to log in.</p>
                                                {authDetectionInfo[slug]?.reasons?.[0] && (
                                                    <p className="text-theme-tertiary text-xs mb-6">({authDetectionInfo[slug].reasons[0]})</p>
                                                )}
                                                <div className="space-y-3">
                                                    <button
                                                        onClick={() => handleOpenAuth(slug, iframeRefs.current[slug]?.src || tab.url)}
                                                        className="w-full px-4 py-3 rounded-lg font-medium text-white transition-all"
                                                        style={{ backgroundColor: 'var(--accent)' }}
                                                    >
                                                        <ExternalLink className="inline mr-2" size={18} />
                                                        Open Login in New Tab
                                                    </button>
                                                    <button
                                                        onClick={() => { handleDismissOverlay(slug); reloadTab(slug); }}
                                                        className="w-full px-4 py-3 border rounded-lg font-medium transition-all text-theme-secondary border-theme hover:border-theme-light"
                                                    >
                                                        Already logged in? Reload
                                                    </button>
                                                    <button
                                                        onClick={() => window.open(tab.url, '_blank')}
                                                        className="w-full px-4 py-2 text-sm transition-all text-theme-tertiary hover:text-theme-secondary"
                                                    >
                                                        Open in New Tab Instead
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => handleDismissOverlay(slug)}
                                                    className="absolute top-4 right-4 transition-all text-theme-tertiary hover:text-theme-primary"
                                                    title="Dismiss"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </>
    );
};

export default TabContainer;
