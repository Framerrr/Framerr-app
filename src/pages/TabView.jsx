import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import logger from '../utils/logger';

const TabView = () => {
    const { slug } = useParams();  // Use slug instead of id
    const navigate = useNavigate();
    const [tab, setTab] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [iframeLoading, setIframeLoading] = useState(true);
    const [key, setKey] = useState(0); // For iframe reloading

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
                {iframeLoading && (
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
                    onLoad={handleIframeLoad}
                    allow="clipboard-read; clipboard-write; fullscreen"
                />
            </div>
        </div>
    );
};

export default TabView;
