import React from 'react';
import Modal from '../common/Modal';

interface UnlinkConfirmationModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    onDiscard?: () => void;  // Optional - shown when navigating away
}

/**
 * UnlinkConfirmationModal - Shows when saving changes that will unlink mobile from desktop
 * Final confirmation before making mobile dashboard independent
 * When onDiscard is provided, shows a Discard button for navigation scenarios
 */
const UnlinkConfirmationModal: React.FC<UnlinkConfirmationModalProps> = ({
    isOpen,
    onConfirm,
    onCancel,
    onDiscard
}) => {
    const footerContent = (
        <div className="flex gap-3 justify-end">
            <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-theme-secondary hover:text-theme-primary bg-theme-tertiary hover:bg-theme-hover border border-theme rounded-lg transition-colors"
            >
                Cancel
            </button>
            {onDiscard && (
                <button
                    onClick={onDiscard}
                    className="px-4 py-2 text-sm font-medium text-error hover:text-error bg-error/10 hover:bg-error/20 border border-error/30 rounded-lg transition-colors"
                >
                    Discard
                </button>
            )}
            <button
                onClick={onConfirm}
                className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
            >
                Save and Customize
            </button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onCancel} title="Save Custom Mobile Layout?" size="sm" footer={footerContent}>
            <div className="space-y-4">
                <p className="text-theme-secondary">
                    Your mobile layout will become independent from desktop.
                    Changes made at one breakpoint will not affect the other.
                </p>

                <p className="text-sm text-theme-tertiary">
                    You can re-link to desktop anytime from Edit mode.
                </p>
            </div>
        </Modal>
    );
};

export default UnlinkConfirmationModal;

