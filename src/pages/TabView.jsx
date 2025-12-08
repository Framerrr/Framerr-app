import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExternalLink, RefreshCw, AlertCircle, Lock, X } from 'lucide-react';
import logger from '../utils/logger';
import { detectAuthNeed, isAuthDetectionEnabled, getSensitivity, getUserAuthPatterns } from '../utils/authDetection';
import { useSystemConfig } from '../context/SystemConfigContext';

const TabView = () => {
    const { slug } = useParams();  // Use slug instead of id
    const navigate = useNavigate();
    const { systemConfig } = useSystemConfig();
    const [tab, setTab] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [iframeLoading, setIframeLoading] = useState(true);
    const [key, setKey] = useState(0); // For iframe reloading

    // Auth detection state
    const [needsAuth, setNeedsAuth] = useState(false);
    const [authDetectionInfo, setAuthDetectionInfo] = useState(null);
    const [isReloading, setIsReloading] = useState(false);
    const iframeRef = useRef(null);
    const authWindowRef = useRef(null);
    const detectionIntervalRef = useRef(null);

    useEffect(() => {
        fetchTab();
    }, [slug]);  // Depend on slug

    const fetchTab = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch all user tabs
            const response = await fetch('/api/tabs', {
                credentials: 'include'
            });

            if (!response.ok) {
                setError('Failed to load tabs');
                setLoading(false);
                return;
            }

            const data = await response.json();
            const tabs = data.tabs || [];

            // Find tab by slug
            const foundTab = tabs.find(t => t.slug === slug);

            if (!foundTab) {
                setError(`Tab "${slug}" not found`);
                setTab(null);
                setLoading(false);
                return;
            }

            setTab(foundTab);
            setError(null);
        } catch (err) {
            logger.error('Error fetching tab:', err);
            setError('Failed to load tab');
        } finally {
            setLoading(false);
        }
    };

    const handleIframeLoad = () => {
        setIframeLoading(false);
    };

    const reloadTab = () => {
        setIframeLoading(true);
        setKey(prev => prev + 1);
    };

    // Auth detection effect
    useEffect(() => {
        if (!tab || !isAuthDetectionEnabled(systemConfig)) {
            return;
        }

        const sensitivity = getSensitivity(systemConfig);
        const userPatterns = getUserAuthPatterns(systemConfig);

        // Monitor iframe URL changes
        detectionIntervalRef.current = setInterval(() => {
            const iframe = iframeRef.current;
            if (!iframe) return;

            try {
                const currentSrc = iframe.src;

                if (currentSrc && currentSrc !== tab.url) {
                    // Iframe URL changed - check if it's auth
                    const detection = detectAuthNeed(currentSrc, tab.url, userPatterns, sensitivity);

                    if (detection.needsAuth && !needsAuth) {
                        logger.info('Auth detected:', detection);
                        setNeedsAuth(true);
                        setAuthDetectionInfo(detection);
                    }
                }
            } catch (e) {
                // Cross-origin restriction - can't read iframe properties
                // This is expected and not an error
            }
        }, 1000);

        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
        };
    }, [tab, systemConfig, needsAuth]);

    const handleOpenAuth = () => {
        if (!tab) return;

        const iframe = iframeRef.current;
        const authUrl = iframe?.src || tab.url;

        logger.info('Opening auth in new tab:', authUrl);

        // Open iframe's current URL in new tab
        authWindowRef.current = window.open(authUrl, '_blank');

        // Poll for window close
        const pollInterval = setInterval(() => {
            if (authWindowRef.current?.closed) {
                clearInterval(pollInterval);
                handleAuthComplete();
            }
        }, 500);
    };

    const handleAuthComplete = () => {
        logger.info('Auth window closed, reloading iframe');

        setIsReloading(true);
        setNeedsAuth(false);

        // Wait for cookies to settle
        setTimeout(() => {
            reloadTab();

            // Check if reload was successful after a delay
            setTimeout(() => {
                setIsReloading(false);

                // If iframe is still on auth page, keep overlay visible
                const iframe = iframeRef.current;
                if (iframe) {
                    const currentSrc = iframe.src;
                    const sensitivity = getSensitivity(systemConfig);
                    const userPatterns = getUserAuthPatterns(systemConfig);
                    const detection = detectAuthNeed(currentSrc, tab.url, userPatterns, sensitivity);

                    if (detection.needsAuth) {
                        setNeedsAuth(true);
                    }
                }
            }, 2000);
        }, 500);
    };

    const handleManualAuth = () => {
        setNeedsAuth(true);
        setAuthDetectionInfo({
            confidence: 10,
            reasons: ['Manually triggered by user'],
            needsAuth: true
        });
    };

    const handleDismissOverlay = () => {
        setNeedsAuth(false);
        setAuthDetectionInfo(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-400">
                    <div className="w-12 h-12 border-4 border-slate-700 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
                    <p>Loading tab...</p>
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
                        onClick={() => navigate('/')}
                        className="mt-4 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (!tab) return null;

    return (
        <div className="w-full h-full flex flex-col">
            {/* Toolbar */}
            <div className="h-12 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{tab.name}</h3>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleManualAuth}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Re-authenticate"
                    >
                        <Lock size={18} />
                    </button>
                    <button
                        onClick={reloadTab}
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
                {/* Auth Required Overlay */}
                {(needsAuth || isReloading) && (
                    <div className="absolute inset-0 bg-theme-primary/95 flex items-center justify-center z-20">
                        <div className="text-center space-y-6 p-8 max-w-md">
                            {isReloading ? (
                                <>
                                    <div className="w-16 h-16 border-4 border-theme-tertiary border-t-accent rounded-full animate-spin mx-auto"></div>
                                    <h3 className="text-xl font-semibold text-theme-primary">
                                        Verifying Authentication...
                                    </h3>
                                    <p className="text-sm text-theme-secondary">
                                        Please wait while we check your session
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-warning/10 border-2 border-warning mx-auto">
                                        <Lock size={40} className="text-warning" />
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold text-theme-primary mb-2">
                                            Authentication Required
                                        </h3>
                                        <p className="text-sm text-theme-secondary">
                                            This page needs you to login to continue.
                                        </p>
                                        {authDetectionInfo?.reasons && (
                                            <p className="text-xs text-theme-tertiary mt-2 italic">
                                                Detected: {authDetectionInfo.reasons[0]}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleOpenAuth}
                                        className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-all inline-flex items-center gap-2 shadow-lg"
                                    >
                                        <ExternalLink size={18} />
                                        Open Login in New Tab
                                    </button>

                                    <div className="flex items-center justify-center gap-4 text-sm">
                                        <button
                                            onClick={() => {
                                                handleDismissOverlay();
                                                reloadTab();
                                            }}
                                            className="text-theme-secondary hover:text-theme-primary transition-colors"
                                        >
                                            Already logged in? Reload
                                        </button>
                                        <span className="text-theme-tertiary">·</span>
                                        <a
                                            href={tab.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-theme-secondary hover:text-theme-primary transition-colors"
                                            onClick={handleDismissOverlay}
                                        >
                                            Open in New Tab Instead
                                        </a>
                                    </div>

                                    <button
                                        onClick={handleDismissOverlay}
                                        className="absolute top-4 right-4 text-theme-tertiary hover:text-theme-primary transition-colors"
                                        title="Dismiss"
                                    >
                                        <X size={24} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {iframeLoading && (
                    <div className="absolute inset-0 bg-slate-900 flex items-center justify-center z-10">
                        <div className="text-center text-slate-400">
                            <div className="w-12 h-12 border-4 border-slate-700 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
                            <p>Loading {tab.name}...</p>
                        </div>
                    </div>
                )}

                <iframe
                    ref={iframeRef}
                    key={key}
                    src={tab.url}
                    title={tab.name}
                    className="w-full h-full border-none"
                    onLoad={handleIframeLoad}
                    allow="clipboard-read; clipboard-write; fullscreen"
                />
            </div>
        </div>
    );
};

export default TabView;
