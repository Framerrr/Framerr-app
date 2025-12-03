import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import logger from './utils/logger';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SystemConfigProvider } from './context/SystemConfigContext';
import { AppDataProvider } from './context/AppDataContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Sidebar from './components/Sidebar';
import FaviconInjector from './components/FaviconInjector';
import AppTitle from './components/AppTitle';
import { useHashLocation } from './hooks/useHashLocation';

import Login from './pages/Login';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import UserSettings from './pages/UserSettings';
import IframeManager from './components/IframeManager';
import TailwindTest from './pages/TailwindTest';

// Component to load and apply custom colors after user authentication
const CustomColorLoader = ({ children }) => {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return; // Only load if user is authenticated

        const loadCustomColors = async () => {
            try {
                const response = await axios.get('/api/config/user', {
                    withCredentials: true
                });

                // If user has custom theme, apply the colors
                if (response.data?.theme?.mode === 'custom' && response.data?.theme?.customColors) {
                    const colors = response.data.theme.customColors;
                    Object.entries(colors).forEach(([key, value]) => {
                        document.documentElement.style.setProperty(`--${key}`, value);
                    });
                }
            } catch (error) {
                logger.error('Could not load custom colors:', error);
            }
        };

        loadCustomColors();
    }, [user]); // Re-run when user changes (login/logout)

    return children;
};

const App = () => {
    return (
        <AuthProvider>
            <FaviconInjector />
            <AppTitle />
            <CustomColorLoader>
                <ThemeProvider>
                    <SystemConfigProvider>
                        <AppDataProvider>
                            <Routes>
                                <Route path="/login" element={<Login />} />
                                <Route path="/setup" element={<Setup />} />

                                {/* Protected Routes with Themed Wrapper */}
                                <Route path="/*" element={
                                    <div className="min-h-screen text-white" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                                        <ProtectedRoute>
                                            <div className="flex w-full h-screen">
                                                <Sidebar />
                                                <main className="flex-1 overflow-y-auto pb-[86px] md:pb-0 md:pl-24">
                                                    <ProtectedContent />
                                                </main>
                                            </div>
                                        </ProtectedRoute>
                                    </div>
                                } />
                            </Routes>
                        </AppDataProvider>
                    </SystemConfigProvider>
                </ThemeProvider>
            </CustomColorLoader>
        </AuthProvider>
    );
};

// Internal component to handle hash-based routing


const ProtectedContent = () => {
    const { route } = useHashLocation();

    // Default to dashboard if route is empty
    if (!route || route === 'dashboard') {
        return <Dashboard />;
    }

    if (route === 'settings') {
        return <UserSettings />;
    }

    if (route === 'test') {
        return <TailwindTest />;
    }

    // Treat anything else as a tab slug
    return <IframeManager slug={route} />;
};


export default App;
