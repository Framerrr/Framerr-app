import { useEffect, useState } from 'react';
import axios from 'axios';
import logger from '../utils/logger';

const FaviconInjector = () => {
    const [triggerReload, setTriggerReload] = useState(0);

    useEffect(() => {
        const loadFavicon = async () => {
            try {
                const response = await axios.get('/api/config/favicon', {
                    withCredentials: true
                });

                const { htmlSnippet, enabled } = response.data;

                // Cache-busting timestamp
                const cacheBuster = `?v=${Date.now()}`;

                // Only inject custom favicons if user has uploaded them AND enabled them
                // htmlSnippet will be null if deleted or never uploaded
                if (htmlSnippet && htmlSnippet.trim() && enabled !== false) {
                    // Remove any existing custom favicon elements (data-favicon-injected)
                    const existingElements = document.querySelectorAll('[data-favicon-injected]');
                    existingElements.forEach(el => el.remove());

                    // Remove default Framerr favicon elements (will be replaced with custom)
                    const defaultFavicons = document.querySelectorAll('link[href^="/favicon-default/"]');
                    defaultFavicons.forEach(el => el.remove());

                    // Create a temporary container to parse HTML
                    const temp = document.createElement('div');
                    // Add cache-busting to all favicon URLs
                    const htmlWithCacheBust = htmlSnippet.replace(/href="([^"]+)"/g, (match, url) => {
                        return `href="${url}${cacheBuster}"`;
                    });
                    temp.innerHTML = htmlWithCacheBust;

                    // Extract and inject each element into head
                    Array.from(temp.children).forEach(child => {
                        // Mark as injected for easy removal later
                        child.setAttribute('data-favicon-injected', 'true');
                        document.head.appendChild(child);
                    });

                    logger.info('Custom favicon loaded successfully with cache-bust');
                } else {
                    // No custom favicon - remove any injected and restore defaults with cache-bust
                    const existingElements = document.querySelectorAll('[data-favicon-injected]');
                    existingElements.forEach(el => el.remove());

                    // Add cache-busting to default favicons too
                    const defaultFavicons = document.querySelectorAll('link[href^="/favicon-default/"]');
                    defaultFavicons.forEach(link => {
                        const url = new URL(link.href);
                        url.searchParams.set('v', Date.now().toString());
                        link.href = url.toString();
                    });

                    logger.info('Using default Framerr favicon with cache-bust');
                }
            } catch (error) {
                logger.error('Failed to load favicon:', error);
                // Fail silently - default Framerr favicon will be used
            }
        };

        loadFavicon();

        // Listen for favicon update events
        const handleFaviconUpdate = () => setTriggerReload(prev => prev + 1);
        window.addEventListener('faviconUpdated', handleFaviconUpdate);

        return () => window.removeEventListener('faviconUpdated', handleFaviconUpdate);
    }, [triggerReload]);

    // This component doesn't render anything
    return null;
};

export default FaviconInjector;
