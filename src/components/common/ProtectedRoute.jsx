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
        return <div className="flex items-center justify-center h-screen text-slate-400">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check specific permission if required
    if (requiredPermission && systemConfig) {
        const allowed = hasPermission(user, requiredPermission, systemConfig);
        if (!allowed) {
            // Redirect to dashboard with access denied message
            return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
