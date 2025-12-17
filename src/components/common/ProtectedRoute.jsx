import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSystemConfig } from '../../context/SystemConfigContext';
import { hasPermission } from '../../utils/permissions';

const ProtectedRoute = ({ children, requiredPermission = null }) => {
    const { user, loading: authLoading, isAuthenticated } = useAuth();
    const { systemConfig, loading: configLoading } = useSystemConfig();
    const location = useLocation();

    // Wait for both auth and config to load
    if (authLoading || configLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                    <p className="text-theme-secondary">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check specific permission if required
    if (requiredPermission && systemConfig) {
        const allowed = hasPermission(user, requiredPermission, systemConfig);
        if (!allowed) {
            // Redirect to dashboard with access denied message
            return <Navigate to="dashboard" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
