import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import logger from '../utils/logger';
import type { ThemeContextValue, ThemeOption } from '../types/context/theme';

// Import all theme CSS files
import '../styles/themes/dark-pro.css';
import '../styles/themes/nord.css';
import '../styles/themes/catppuccin.css';
import '../styles/themes/dracula.css';
import '../styles/themes/light.css';
import '../styles/themes/noir.css';
import '../styles/themes/nebula.css';

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
    children: ReactNode;
}

interface ThemeApiResponse {
    theme?: {
        preset?: string;
        mode?: string;
    };
}

export const ThemeProvider = ({ children }: ThemeProviderProps): React.JSX.Element => {
    const { isAuthenticated } = useAuth();
    const [theme, setTheme] = useState<string>('dark-pro');
    const [loading, setLoading] = useState<boolean>(true);

    // Available themes
    const themes: ThemeOption[] = [
        { id: 'dark-pro', name: 'Dark Pro', description: 'Professional dark with blue accents' },
        { id: 'nord', name: 'Nord', description: 'Nature-inspired teal & green' },
        { id: 'catppuccin', name: 'Catppuccin Mocha', description: 'Cozy pastel colors' },
        { id: 'dracula', name: 'Dracula', description: 'Vibrant purple theme' },
        { id: 'light', name: 'Light Modern', description: 'Clean white & sky blue' },
        { id: 'noir', name: 'Noir', description: 'Premium black with silver accents' },
        { id: 'nebula', name: 'Nebula', description: 'Cosmic purple with cyan glow' }
    ];

    const loadTheme = async (): Promise<void> => {
        try {
            const response = await axios.get<ThemeApiResponse>('/api/theme');
            if (response.data.theme?.preset) {
                setTheme(response.data.theme.preset);
            }
        } catch (error) {
            logger.error('Failed to load theme', { error });
        } finally {
            setLoading(false);
        }
    };

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

    const changeTheme = async (newTheme: string): Promise<void> => {
        try {
            // Optimistically update UI
            setTheme(newTheme);

            // Save to localStorage for instant theme on next page load
            localStorage.setItem('framerr-theme', newTheme);

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
            logger.error('Failed to save theme', { error });
            // Revert on error
            loadTheme();
        }
    };

    const value: ThemeContextValue = {
        theme,
        themes,
        changeTheme,
        loading
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextValue => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
