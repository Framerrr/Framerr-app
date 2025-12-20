import React, { useEffect, ReactNode } from 'react';
import { Routes, Route } from 'react-router-dom';
import axios from 'axios';
import logger from './utils/logger';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SystemConfigProvider } from './context/SystemConfigContext';
import { AppDataProvider } from './context/AppDataContext';
import { NotificationProvider } from './context/NotificationContext';
import { LayoutProvider, useLayout } from './context/LayoutContext';
import { LAYOUT } from './constants/layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import Sidebar from './components/Sidebar';
import FaviconInjector from './components/FaviconInjector';
import AppTitle from './components/AppTitle';
import ToastContainer from './components/notifications/ToastContainer';

import Login from './pages/Login';
import Setup from './pages/Setup';
import MainContent from './pages/MainContent';
import AnimationTest from './pages/AnimationTest';

interface CustomColorLoaderProps {
    children: ReactNode;
}

interface UserConfigResponse {
    theme?: {
        mode?: string;
        customColors?: Record<string, string>;
    };
}

// Component to load and apply custom colors after user authentication
const CustomColorLoader: React.FC<CustomColorLoaderProps> = ({ children }) => {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return; // Only load if user is authenticated

        const loadCustomColors = async (): Promise<void> => {
            try {
                const response = await axios.get<UserConfigResponse>('/api/config/user', {
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

    return <>{children}</>;
};

// Main layout component that uses LayoutContext for responsive behavior
// NOTE: html/body is position:fixed, so this wrapper fills the viewport
const MainLayout: React.FC = () => {
    const { isMobile } = useLayout();

    return (
        // Outer wrapper: fills fixed viewport, applies safe-area padding
        <div
            className="flex flex-col w-full h-full"
            style={{
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                // Safe-area padding at wrapper level (not body)
                paddingTop: 'env(safe-area-inset-top)',
                paddingLeft: 'env(safe-area-inset-left)',
                paddingRight: 'env(safe-area-inset-right)',
            }}
        >
            <ProtectedRoute>
                {/* Main flex container - sidebar + content */}
                <div className="flex w-full flex-1 min-h-0">
                    <Sidebar />
                    <main
                        className="flex-1 min-w-0 min-h-0 h-full"
                        style={{
                            paddingLeft: isMobile ? 0 : `${LAYOUT.SIDEBAR_WIDTH}px`,
                            backgroundColor: 'var(--bg-primary)'
                        }}
                    >
                        <Routes>
                            <Route path="/*" element={<MainContent />} />
                        </Routes>
                    </main>
                </div>
            </ProtectedRoute>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <FaviconInjector />
            <AppTitle />
            <CustomColorLoader>
                <ThemeProvider>
                    <SystemConfigProvider>
                        <AppDataProvider>
                            <NotificationProvider>
                                <LayoutProvider>
                                    <ToastContainer />
                                    <Routes>
                                        <Route path="/login" element={<Login />} />
                                        <Route path="/setup" element={<Setup />} />
                                        <Route path="/animation-test" element={<AnimationTest />} />

                                        {/* Protected Routes with Layout-aware Wrapper */}
                                        <Route path="/*" element={<MainLayout />} />
                                    </Routes>
                                </LayoutProvider>
                            </NotificationProvider>
                        </AppDataProvider>
                    </SystemConfigProvider>
                </ThemeProvider>
            </CustomColorLoader>
        </AuthProvider>
    );
};

export default App;
