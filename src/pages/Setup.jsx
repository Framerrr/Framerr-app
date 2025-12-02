import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { SystemConfigProvider } from '../context/SystemConfigContext';
import { AppDataProvider } from '../context/AppDataContext';
import ProtectedRoute from '../components/common/ProtectedRoute';
import Sidebar from '../components/Sidebar';
import FaviconInjector from '../components/FaviconInjector';

import Login from './Login';
import Setup from './Setup';
import Dashboard from './Dashboard';
import Settings from '../pages/Settings';
import UserSettings from './UserSettings';
import TabView from './TabView';
import TailwindTest from './TailwindTest';

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
                console.error('Could not load custom colors:', error);
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
                                                <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
                                                    <Routes>
                                                        <Route path="/" element={<Dashboard />} />
                                                        <Route path="/test" element={<TailwindTest />} />
                                                        <Route path="/tab/:slug" element={<TabView />} />

                                                        {/* User-specific settings for ALL users */}
                                                        <Route path="/settings" element={<UserSettings />} />

                                                        {/* Admin panel - only for manage_system permission */}
                                                        <Route path="/admin" element={
                                                            <ProtectedRoute requiredPermission="manage_system">
                                                                <Settings />
                                                            </ProtectedRoute>
                                                        } />
                                                        <Route path="*" element={<Navigate to="/" replace />} />
                                                    </Routes>
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

export default App;
