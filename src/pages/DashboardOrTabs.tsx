import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Dashboard from './Dashboard';
import DevDashboard from './DevDashboard';
import TabContainer from './TabContainer';
import { useLayout } from '../context/LayoutContext';
import { LAYOUT } from '../constants/layout';

const DashboardOrTabs = (): React.JSX.Element => {
    const location = useLocation();
    const { isMobile } = useLayout();
    const [showTabs, setShowTabs] = useState<boolean>(false);
    const [showDevDashboard, setShowDevDashboard] = useState<boolean>(false);

    useEffect(() => {
        const checkHash = (): void => {
            const hash = window.location.hash.slice(1); // Remove '#'

            // Check for dev dashboard
            if (hash === 'dev/dashboard' || hash.startsWith('dev/dashboard?')) {
                setShowDevDashboard(true);
                setShowTabs(false);
                return;
            }
            setShowDevDashboard(false);

            // Auto-redirect root with no hash to /#dashboard
            if (!hash && location.pathname === '/') {
                window.location.hash = 'dashboard';
                return;
            }

            // Show tabs ONLY if hash exists AND it's not 'dashboard' or 'settings'
            // This excludes #dashboard, #dashboard?..., #settings, #settings?...
            const isTabHash = !!(hash &&
                hash !== 'dashboard' &&
                !hash.startsWith('dashboard?') &&
                hash !== 'settings' &&
                !hash.startsWith('settings?'));

            setShowTabs(isTabHash);
        };

        // Check on mount and hash changes
        checkHash();
        window.addEventListener('hashchange', checkHash);
        return () => window.removeEventListener('hashchange', checkHash);
    }, [location]);

    // Always render both components, use display to toggle visibility
    // This keeps TabContainer (and its iframes) mounted when navigating to dashboard
    // Dashboard has its own scroll, TabContainer iframes have internal scroll
    return (
        <>
            {/* Dev Dashboard - Beta testing */}
            {showDevDashboard && (
                <div style={{
                    display: 'flex',
                    height: '100%',
                    width: '100%',
                }}>
                    <DevDashboard />
                </div>
            )}
            <div style={{
                display: showTabs || showDevDashboard ? 'none' : 'flex',
                height: '100%',
                width: '100%',
                // NOTE: No overflow here - MainContent handles scrolling
                // This allows Dashboard loading state h-full to work correctly
            }}>
                <Dashboard />
            </div>
            <div style={{
                display: showTabs ? 'flex' : 'none',
                // On mobile: subtract tab bar + padding so embedded app tab bars aren't cut off
                height: isMobile ? `calc(100% - ${LAYOUT.TABBAR_HEIGHT + LAYOUT.PAGE_MARGIN}px)` : '100%',
                width: '100%',
                // NO overflow here - iframes handle their own scroll
            }}>
                <TabContainer />
            </div>
        </>
    );
};

export default DashboardOrTabs;
