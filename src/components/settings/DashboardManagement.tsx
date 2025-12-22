import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '../common/Button';
import Modal from '../common/Modal';
import { useLayout } from '../../context/LayoutContext';
import logger from '../../utils/logger';

type MobileLayoutMode = 'linked' | 'independent';

interface DashboardManagementProps {
    className?: string;
}

/**
 * DashboardManagement - Settings component for managing dashboard layout modes
 * Allows users to:
 * - View current mobile layout mode (synced or custom)
 * - Reconnect mobile to desktop (if independent)
 * - Reset all widgets
 */
const DashboardManagement: React.FC<DashboardManagementProps> = ({ className = '' }) => {
    const { isMobile } = useLayout();
    const [mobileLayoutMode, setMobileLayoutMode] = useState<MobileLayoutMode>('linked');
    const [widgetCount, setWidgetCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showReconnectModal, setShowReconnectModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);

    // Load current state
    const loadDashboardState = async (): Promise<void> => {
        try {
            const response = await axios.get<{ mobileLayoutMode?: MobileLayoutMode; widgets?: unknown[] }>('/api/widgets');
            setMobileLayoutMode(response.data.mobileLayoutMode || 'linked');
            setWidgetCount(response.data.widgets?.length || 0);
        } catch (error) {
            logger.error('Failed to load dashboard state:', { error });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardState();
    }, []);

    // Listen for dashboard updates to refresh state automatically
    useEffect(() => {
        const handleWidgetsUpdate = (): void => {
            loadDashboardState();
        };

        window.addEventListener('widgets-added', handleWidgetsUpdate);
        window.addEventListener('mobile-layout-mode-changed', handleWidgetsUpdate);
        return () => {
            window.removeEventListener('widgets-added', handleWidgetsUpdate);
            window.removeEventListener('mobile-layout-mode-changed', handleWidgetsUpdate);
        };
    }, []);

    const handleReconnect = async (): Promise<void> => {
        try {
            setActionLoading(true);
            await axios.post('/api/widgets/reconnect');
            setMobileLayoutMode('linked');
            setShowReconnectModal(false);
            // Reload dashboard
            window.dispatchEvent(new CustomEvent('widgets-added'));
        } catch (error) {
            logger.error('Failed to reconnect mobile dashboard:', { error });
        } finally {
            setActionLoading(false);
        }
    };

    const handleReset = async (): Promise<void> => {
        try {
            setActionLoading(true);
            await axios.post('/api/widgets/reset');
            setMobileLayoutMode('linked');
            setShowResetModal(false);
            // Reload dashboard
            window.dispatchEvent(new CustomEvent('widgets-added'));
        } catch (error) {
            logger.error('Failed to reset dashboard:', { error });
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={`rounded-xl p-6 border border-theme bg-theme-secondary ${className}`}>
                <div className="flex items-center justify-center py-4">
                    <RefreshCw size={20} className="animate-spin text-theme-secondary" />
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-xl p-6 border border-theme bg-theme-secondary ${className}`}>
            <h3 className="text-lg font-semibold text-theme-primary mb-4">Dashboard Management</h3>

            <div className="space-y-6">
                {/* Mobile Layout Status */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <div className="font-medium text-theme-primary">Mobile Layout</div>
                        <div className="text-sm text-theme-secondary">
                            {mobileLayoutMode === 'linked'
                                ? 'Synced with desktop - changes on desktop automatically update mobile'
                                : 'Custom layout - mobile and desktop are independent'}
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${mobileLayoutMode === 'linked'
                        ? 'bg-success/20 text-success'
                        : 'bg-info/20 text-info'
                        }`}>
                        {mobileLayoutMode === 'linked' ? 'Synced' : 'Custom'}
                    </div>
                </div>

                {/* Reconnect Button (only when independent) */}
                {mobileLayoutMode === 'independent' && (
                    <div className="border-t border-theme pt-4">
                        <div className="flex items-start gap-4">
                            <Link size={20} className="text-accent mt-0.5" />
                            <div className="flex-1">
                                <div className="font-medium text-theme-primary">Reconnect to Desktop</div>
                                <p className="text-sm text-theme-secondary mb-3">
                                    Resync your mobile layout with desktop. Your mobile customizations will be replaced with the desktop layout.
                                </p>
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowReconnectModal(true)}
                                    disabled={actionLoading}
                                >
                                    Reconnect Mobile
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reset All Widgets */}
                <div className="border-t border-theme pt-4">
                    <div className="flex items-start gap-4">
                        <Trash2 size={20} className="text-error mt-0.5" />
                        <div className="flex-1">
                            <div className="font-medium text-theme-primary">Reset Dashboard</div>
                            <p className="text-sm text-theme-secondary mb-3">
                                Remove all widgets from your dashboard. This cannot be undone.
                            </p>
                            <Button
                                variant="danger"
                                onClick={() => setShowResetModal(true)}
                                disabled={actionLoading || widgetCount === 0}
                            >
                                Reset All Widgets
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reconnect Confirmation Modal */}
            <Modal
                isOpen={showReconnectModal}
                onClose={() => setShowReconnectModal(false)}
                title="Reconnect Mobile Layout?"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                        <AlertTriangle size={20} className="text-warning flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-theme-secondary">
                            Your custom mobile layout will be replaced with the current desktop layout.
                            Any mobile-only widgets will be removed.
                        </div>
                    </div>

                    <p className="text-theme-secondary text-sm">
                        After reconnecting, changes made on desktop will automatically update mobile.
                    </p>

                    <div className="flex gap-3 justify-end pt-4 border-t border-theme">
                        <Button
                            variant="secondary"
                            onClick={() => setShowReconnectModal(false)}
                            disabled={actionLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleReconnect}
                            disabled={actionLoading}
                        >
                            {actionLoading ? 'Reconnecting...' : 'Reconnect'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Reset Confirmation Modal */}
            <Modal
                isOpen={showResetModal}
                onClose={() => setShowResetModal(false)}
                title="Reset All Widgets?"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-error/10 border border-error/20">
                        <AlertTriangle size={20} className="text-error flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-theme-secondary">
                            This will permanently delete all widgets from both your desktop and mobile dashboards.
                        </div>
                    </div>

                    <p className="text-theme-secondary text-sm">
                        This action cannot be undone. You will start with an empty dashboard.
                    </p>

                    <div className="flex gap-3 justify-end pt-4 border-t border-theme">
                        <Button
                            variant="secondary"
                            onClick={() => setShowResetModal(false)}
                            disabled={actionLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleReset}
                            disabled={actionLoading}
                        >
                            {actionLoading ? 'Resetting...' : 'Reset Dashboard'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DashboardManagement;
