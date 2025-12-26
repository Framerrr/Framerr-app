/**
 * ConfirmDialog - Reusable confirmation modal
 * 
 * Replaces browser confirm() with styled in-system dialog.
 */

import React from 'react';
import Modal from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'danger';
    isLoading?: boolean;
}

/**
 * ConfirmDialog - Modal-based confirmation dialog
 * 
 * Usage:
 * ```tsx
 * <ConfirmDialog
 *   isOpen={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   onConfirm={handleConfirm}
 *   title="Apply Template"
 *   message="Your current dashboard will be backed up."
 *   confirmLabel="Apply"
 * />
 * ```
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    isLoading = false,
}) => {
    const handleConfirm = () => {
        onConfirm();
        // Note: Caller should close the dialog after async operation if needed
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
        >
            <div className="space-y-4">
                {variant === 'danger' && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-error/10 border border-error/30">
                        <AlertTriangle size={20} className="text-error flex-shrink-0" />
                        <p className="text-sm text-error">This action cannot be undone.</p>
                    </div>
                )}

                <p className="text-sm text-theme-secondary whitespace-pre-line">
                    {message}
                </p>

                <div className="flex gap-3 justify-end pt-2">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant === 'danger' ? 'danger' : 'primary'}
                        onClick={handleConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Loading...' : confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmDialog;
