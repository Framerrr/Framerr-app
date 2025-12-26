/**
 * WidgetConflictModal - Shows when template widgets require unshared integrations
 * 
 * Displays:
 * - List of integrations not shared with selected users
 * - Affected users (e.g., "@john +2")
 * - Option to share integrations or proceed without
 */

import React, { useState } from 'react';
import { AlertTriangle, Share2, X } from 'lucide-react';
import Modal from '../common/Modal';
import { Button } from '../common/Button';

export interface WidgetConflict {
    integration: string;
    integrationDisplayName: string;
    affectedUsers: { id: string; username: string }[];
}

interface WidgetConflictModalProps {
    isOpen: boolean;
    onClose: () => void;
    conflicts: WidgetConflict[];
    templateName: string;
    onShareIntegrations: () => Promise<void>;
    onProceedWithoutSharing: () => void;
}

const WidgetConflictModal: React.FC<WidgetConflictModalProps> = ({
    isOpen,
    onClose,
    conflicts,
    templateName,
    onShareIntegrations,
    onProceedWithoutSharing
}) => {
    const [selectedOption, setSelectedOption] = useState<'share' | 'proceed'>('share');
    const [loading, setLoading] = useState(false);

    const handleContinue = async () => {
        setLoading(true);
        try {
            if (selectedOption === 'share') {
                await onShareIntegrations();
            } else {
                onProceedWithoutSharing();
            }
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const formatAffectedUsers = (users: { username: string }[]): string => {
        if (users.length === 0) return '';
        if (users.length === 1) return `@${users[0].username}`;
        return `@${users[0].username} +${users.length - 1}`;
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Widget Sharing Required"
            size="md"
        >
            <div className="space-y-4">
                {/* Warning message */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
                    <AlertTriangle size={20} className="text-warning flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-theme-primary">
                            Some widgets in <strong>"{templateName}"</strong> require integrations
                            that aren't shared with the selected users.
                        </p>
                    </div>
                </div>

                {/* Conflicts list */}
                <div className="space-y-2">
                    {conflicts.map(conflict => (
                        <div
                            key={conflict.integration}
                            className="flex items-center justify-between p-3 rounded-lg bg-theme-tertiary border border-theme"
                        >
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={14} className="text-warning" />
                                <span className="font-medium text-theme-primary">
                                    {conflict.integrationDisplayName}
                                </span>
                            </div>
                            <span className="text-sm text-theme-secondary">
                                Not shared with {formatAffectedUsers(conflict.affectedUsers)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Options */}
                <div className="space-y-2 pt-2">
                    <p className="text-xs text-theme-secondary font-medium uppercase tracking-wide">Options</p>

                    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedOption === 'share'
                            ? 'bg-accent/10 border-accent'
                            : 'bg-theme-tertiary border-theme hover:bg-theme-hover'
                        }`}>
                        <input
                            type="radio"
                            name="conflict-option"
                            checked={selectedOption === 'share'}
                            onChange={() => setSelectedOption('share')}
                            className="mt-0.5 text-accent focus:ring-accent"
                        />
                        <div>
                            <p className="font-medium text-theme-primary">Share integrations with selected users</p>
                            <p className="text-sm text-theme-secondary">Recommended - widgets will work immediately</p>
                        </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedOption === 'proceed'
                            ? 'bg-accent/10 border-accent'
                            : 'bg-theme-tertiary border-theme hover:bg-theme-hover'
                        }`}>
                        <input
                            type="radio"
                            name="conflict-option"
                            checked={selectedOption === 'proceed'}
                            onChange={() => setSelectedOption('proceed')}
                            className="mt-0.5 text-accent focus:ring-accent"
                        />
                        <div>
                            <p className="font-medium text-theme-primary">Share template only</p>
                            <p className="text-sm text-theme-secondary">Widgets won't function until integrations are shared separately</p>
                        </div>
                    </label>
                </div>

                {/* Info footer */}
                <p className="text-xs text-theme-tertiary flex items-center gap-1.5 pt-2">
                    <Share2 size={12} />
                    Widget sharing can be modified at any time in Settings → Widgets → Service Settings.
                </p>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-4 border-t border-theme">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleContinue} disabled={loading}>
                        {loading ? 'Processing...' : 'Continue'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default WidgetConflictModal;
