import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';

/**
 * IframeManager - Manages multiple iframes with persistence
 * Once an iframe is loaded, it stays mounted until page refresh
 */
const IframeManager = ({ slug }) => {
    // const { slug } = useParams(); // Removed: passed as prop now
    const navigate = useNavigate();
    const [tabs, setTabs] = useState([]);
    const [loadedTabs, setLoadedTabs] = useState(new Set());
    const [iframeKeys, setIframeKeys] = useState({});
    const [iframeLoading, setIframeLoading] = useState({});
    const [error, setError] = useState(null);

    // Fetch tabs from API
    useEffect(() => {
        const fetchTabs = async () => {
            try {
                const response = await fetch('/api/tabs', {
                    credentials: 'include'
                });

                if (!response.ok) {
                    setError('Failed to load tabs');
                    return;
                }

                const data = await response.json();
                setTabs(data.tabs || []);
            } catch (err) {
                console.error('Error fetching tabs:', err);
                setError('Failed to load tabs');
            }
        };

        fetchTabs();
    }, []);

    // Find active tab
    const activeTab = tabs.find(t => t.slug === slug);

    // Mark tab as loaded when navigated to
    useEffect(() => {
        if (slug && activeTab) {
            setLoadedTabs(prev => {
                const newSet = new Set(prev);
                newSet.add(slug);
                return newSet;
            });

            // Initialize iframe key for reload functionality
            if (!iframeKeys[slug]) {
                setIframeKeys(prev => ({ ...prev, [slug]: 0 }));
            }

            // Set initial loading state
            if (iframeLoading[slug] === undefined) {
                setIframeLoading(prev => ({ ...prev, [slug]: true }));
            }
        }
    }, [slug, activeTab]);

    const handleIframeLoad = useCallback((tabSlug) => {
        setIframeLoading(prev => ({ ...prev, [tabSlug]: false }));
    }, []);

    const reloadTab = useCallback((tabSlug) => {
        setIframeLoading(prev => ({ ...prev, [tabSlug]: true }));
        setIframeKeys(prev => ({ ...prev, [tabSlug]: (prev[tabSlug] || 0) + 1 }));
    }, []);

    // Error: tab not found
    if (slug && !activeTab && tabs.length > 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-400">
                    <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
                    <h2 className="text-xl font-bold text-white mb-2">Tab Not Found</h2>
                    <p>The tab "{slug}" could not be found.</p>
                    <button
                        onClick={() => window.location.hash = '#dashboard'}
                        className="mt-4 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!activeTab) {
        return null; // Loading or no tab selected
    }

    return (
        <div className="w-full h-full flex flex-col">
            {/* Toolbar */}
            <div className="h-12 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{activeTab.name}</h3>
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
                        href={activeTab.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Open in new tab"
                    >
                        <ExternalLink size={18} />
                    </a>
                </div>
            </div>

            {/* Iframe Container - All loaded iframes stay mounted */}
            <div className="flex-1 relative bg-white">
                {Array.from(loadedTabs).map(tabSlug => {
                    const tab = tabs.find(t => t.slug === tabSlug);
                    if (!tab) return null;

                    const isActive = tabSlug === slug;
                    const isLoading = iframeLoading[tabSlug];
                    const key = iframeKeys[tabSlug] || 0;

                    return (
                        <div
                            key={tabSlug}
                            className={`absolute inset-0 ${isActive ? 'block' : 'hidden'}`}
                        >
                            {isLoading && (
                                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center z-10">
                                    <div className="text-center text-slate-400">
                                        <div className="w-12 h-12 border-4 border-slate-700 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
                                        <p>Loading {tab.name}...</p>
                                    </div>
                                </div>
                            )}

                            <iframe
                                key={key}
                                src={tab.url}
                                title={tab.name}
                                className="w-full h-full border-none"
                                onLoad={() => handleIframeLoad(tabSlug)}
                                allow="clipboard-read; clipboard-write; fullscreen"
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default IframeManager;
