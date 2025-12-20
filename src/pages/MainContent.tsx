import React, { useState, useEffect } from 'react';
import DashboardOrTabs from './DashboardOrTabs';
import UserSettings from './UserSettings';

const MainContent = (): React.JSX.Element => {
    const [currentHash, setCurrentHash] = useState<string>('');

    useEffect(() => {
        const updateHash = (): void => {
            const hash = window.location.hash.slice(1); // Remove '#'
            setCurrentHash(hash);
        };

        // Initial check
        updateHash();

        // Listen for hash changes
        window.addEventListener('hashchange', updateHash);
        return () => window.removeEventListener('hashchange', updateHash);
    }, []);

    // Check if we're on settings (including query params like ?tab=profile)
    const isSettings = currentHash === 'settings' || currentHash.startsWith('settings?');

    // Always render both components, toggle visibility with display
    // This prevents TabContainer from unmounting when navigating to settings
    // Each page is its own isolated scroll container (iOS Safari pattern)
    return (
        <>
            <div style={{
                display: isSettings ? 'none' : 'flex',
                height: '100%',
                width: '100%',
                minWidth: 0,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch', // iOS momentum scroll
                // NOTE: overscrollBehavior removed - NOT SUPPORTED in Safari
            }}>
                <DashboardOrTabs />
            </div>
            <div style={{
                display: isSettings ? 'flex' : 'none',
                height: '100%',
                width: '100%',
                minWidth: 0,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch', // iOS momentum scroll
            }}>
                <UserSettings />
            </div>
        </>
    );
};

export default MainContent;
