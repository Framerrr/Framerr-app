import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import logger from '../utils/logger';

// Import all theme CSS files
import '../styles/themes/dark-pro.css';
import '../styles/themes/nord.css';
// import '../styles/themes/catppuccin.css'; // Not recovered
import '../styles/themes/dracula.css';
import '../styles/themes/light.css';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [theme, setTheme] = useState('dark-pro');
    const [loading, setLoading] = useState(true);

    // Available themes
    const themes = [
        { id: 'dark-pro', name: 'Dark Pro', description: 'Professional dark with blue accents' },
        { id: 'nord', name: 'Nord', description: 'Nature-inspired teal & green' },
        { id: 'catppuccin', name: 'Catppuccin Mocha', description: 'Cozy pastel colors' },
        { id: 'dracula', name: 'Dracula', description: 'Vibrant purple theme' },
        { id: 'light', name: 'Light Modern', description: 'Clean white & sky blue' }
    ];

    // Load theme from user config on mount
    useEffect(() => {
        if (isAuthenticated) {
            loadTheme();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated]);

    // Apply theme to document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const loadTheme = async () => {
        try {
            const response = await axios.get('/api/theme');
            if (response.data.theme?.preset) {
                setTheme(response.data.theme.preset);
            }
        } catch (error) {
            logger.error('Failed to load theme:', error);
        } finally {
            setLoading(false);
        }
    };

    const changeTheme = async (newTheme) => {
        try {
            // Optimistically update UI
            setTheme(newTheme);

            // Save to backend
            if (isAuthenticated) {
                await axios.put('/api/theme', {
                    theme: {
                        preset: newTheme,
                        mode: 'dark' // TODO: Make this configurable
                    }
                });
            }
        } catch (error) {
            logger.error('Failed to save theme:', error);
            // Revert on error
            loadTheme();
        }
    };

    return (
        <ThemeContext.Provider value={{
            theme,
            themes,
            changeTheme,
            loading
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};