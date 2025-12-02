import { useEffect } from 'react';
import axios from 'axios';

/**
 * AppTitle Component
 * Dynamically updates the browser tab title based on the customizable app name
 * Falls back to "Framerr" if no custom name is set
 */
const AppTitle = () => {
    useEffect(() => {
        const updateTitle = async () => {
            try {
                const response = await axios.get('/api/config/app-name');
                const appName = response.data?.name || 'Framerr';
                document.title = appName;
            } catch (error) {
                // Fallback to default if API fails
                document.title = 'Framerr';
            }
        };

        updateTitle();

        // Listen for custom events when app name is updated in settings
        const handleAppNameUpdate = (event) => {
            document.title = event.detail.appName || 'Framerr';
        };

        window.addEventListener('appNameUpdated', handleAppNameUpdate);

        return () => {
            window.removeEventListener('appNameUpdated', handleAppNameUpdate);
        };
    }, []);

    return null; // This component doesn't render anything
};

export default AppTitle;
