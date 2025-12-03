import React, { useState, useEffect } from 'react';
import DashboardOrTabs from './DashboardOrTabs';
import UserSettings from './UserSettings';

const MainContent = () => {
    const [currentHash, setCurrentHash] = useState('');

    useEffect(() => {
        const updateHash = () => {
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
    return (
        <>
            <div style={{ display: isSettings ? 'none' : 'flex', height: '100%', width: '100%' }}>
                <DashboardOrTabs />
            </div>
            <div style={{ display: isSettings ? 'flex' : 'none', height: '100%', width: '100%' }}>
                <UserSettings />
            </div>
        </>
    );
};

export default MainContent;
