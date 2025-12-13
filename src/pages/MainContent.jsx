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

    // Always render both components, toggle visibility (not display)
    // This prevents TabContainer from unmounting when navigating to settings
    // Using visibility instead of display prevents react-grid-layout from re-measuring
    return (
        <>
            <div style={{
                visibility: isSettings ? 'hidden' : 'visible',
                position: isSettings ? 'absolute' : 'relative',
                height: '100%',
                width: '100%',
                overflowY: 'auto'
            }}>
                <DashboardOrTabs />
            </div>
            <div style={{
                visibility: isSettings ? 'visible' : 'hidden',
                position: isSettings ? 'relative' : 'absolute',
                height: '100%',
                width: '100%',
                overflowY: 'auto'
            }}>
                <UserSettings />
            </div>
        </>
    );
};

export default MainContent;
