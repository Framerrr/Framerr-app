import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Dashboard from './Dashboard';
import TabContainer from './TabContainer';

const DashboardOrTabs = () => {
    const location = useLocation();
    const [showTabs, setShowTabs] = useState(false);

    useEffect(() => {
        const checkHash = () => {
            const hash = window.location.hash.slice(1); // Remove '#'

            // Auto-redirect root with no hash to /#dashboard
            if (!hash && location.pathname === '/') {
                window.location.hash = 'dashboard';
                return;
            }

            // Show tabs ONLY if hash exists AND it's not 'dashboard' or 'settings'
            // This excludes #dashboard, #dashboard?..., #settings, #settings?...
            const isTabHash = hash &&
                hash !== 'dashboard' &&
                !hash.startsWith('dashboard?') &&
                hash !== 'settings' &&
                !hash.startsWith('settings?');

            setShowTabs(isTabHash);
        };

        // Check on mount and hash changes
        checkHash();
        window.addEventListener('hashchange', checkHash);
        return () => window.removeEventListener('hashchange', checkHash);
    }, [location]);

    // Always render both components, use visibility to toggle
    // This keeps TabContainer (and its iframes) mounted when navigating to dashboard
    // Using visibility instead of display prevents react-grid-layout from re-measuring
    return (
        <>
            <div style={{
                visibility: showTabs ? 'hidden' : 'visible',
                position: showTabs ? 'absolute' : 'relative',
                height: '100%',
                width: '100%',
                overflowY: 'auto'
            }}>
                <Dashboard />
            </div>
            <div style={{
                visibility: showTabs ? 'visible' : 'hidden',
                position: showTabs ? 'relative' : 'absolute',
                height: '100%',
                width: '100%',
                overflowY: 'auto'
            }}>
                <TabContainer />
            </div>
        </>
    );
};

export default DashboardOrTabs;
