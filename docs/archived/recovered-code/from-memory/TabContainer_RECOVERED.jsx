import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import logger from '../utils/logger';

const TabContainer = () => {
    const navigate = useNavigate();
    const [tabs, setTabs] = useState([]);
    const [loadedTabs, setLoadedTabs] = useState(new Set()); // Track which tabs have been loaded
    const [activeSlug, setActiveSlug] = useState(null); // Current visible tab
    const [reloadKeys, setReloadKeys] = useState({}); // Per-tab reload triggers
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [iframeLoadingStates, setIframeLoadingStates] = useState({}); // Track loading per iframe

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
                                key={reloadKeys[slug] || 0}
                                src={tab.url}
                                title={tab.name}
                                className="w-full h-full border-none"
                                onLoad={() => handleIframeLoad(slug)}
                                allow="clipboard-read; clipboard-write; fullscreen"
                            />
                        </div>
                    </div>
                );
            })}
        </>
    );
};

export default TabContainer;
