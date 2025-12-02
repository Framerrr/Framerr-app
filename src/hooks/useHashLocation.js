import { useState, useEffect } from 'react';

export const useHashLocation = () => {
    const [hash, setHash] = useState(window.location.hash);

    useEffect(() => {
        const handleHashChange = () => {
            setHash(window.location.hash);
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Parse the hash to get the route
    // #dashboard -> dashboard
    // #settings -> settings
    // #radarr -> radarr
    // # -> ''
    const route = hash.replace(/^#/, '') || 'dashboard';

    return { hash, route };
};
