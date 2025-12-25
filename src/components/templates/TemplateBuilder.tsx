/**
 * TemplateBuilder - Main wizard container for creating/editing templates
 * 
 * A 3-step wizard:
 * 1. Setup - Name, category, description
 * 2. Build - Visual grid editor (Phase 3)
 * 3. Review - Preview and save actions
 */

import React, { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import Modal from '../common/Modal';
import TemplateBuilderStep1 from './TemplateBuilderStep1';
import TemplateBuilderStep2 from './TemplateBuilderStep2';
import TemplateBuilderStep3 from './TemplateBuilderStep3';
import { Button } from '../common/Button';
import logger from '../../utils/logger';

// Types
export interface TemplateWidget {
    type: string;
    layout: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    config?: Record<string, unknown>; // Widget-specific settings (showHeader, flatten, etc.)
}

export interface TemplateData {
    id?: string;
    name: string;
    description: string;
    categoryId: string | null;
    widgets: TemplateWidget[];
    isDraft: boolean;
}

interface TemplateBuilderProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Partial<TemplateData>;
    mode: 'create' | 'edit' | 'duplicate' | 'save-current';
    editingTemplateId?: string;
    onSave?: (template: TemplateData) => void;
    onShare?: (template: TemplateData & { id: string }) => void;
    onDraftSaved?: () => void; // Called when user explicitly saves draft
    isAdmin?: boolean;
}

const STEPS = [
    { id: 1, label: 'Setup' },
    { id: 2, label: 'Build' },
    { id: 3, label: 'Review' },
];

const TemplateBuilder: React.FC<TemplateBuilderProps> = ({
    isOpen,
    onClose,
    initialData,
    mode,
    editingTemplateId,
    onSave,
    onShare,
    onDraftSaved,
    isAdmin = false,
}) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [isDirty, setIsDirty] = useState(false);
    const [showConfirmClose, setShowConfirmClose] = useState(false);

    // Edit mode: no drafts, discard = revert (not delete)
    const isEditMode = mode === 'edit';

    // Draft save state (only used in create/duplicate/save-current modes)
    const [draftId, setDraftId] = useState<string | null>(null);
    const isSavingRef = useRef(false);

    // Template data state
    const [templateData, setTemplateData] = useState<TemplateData>({
        name: initialData?.name || '',
        description: initialData?.description || '',
        categoryId: initialData?.categoryId || null,
        widgets: initialData?.widgets || [],
        isDraft: initialData?.isDraft || false,
        ...(initialData?.id && { id: initialData.id }),
    });

    // Track previous isOpen state to detect open transition
    const prevIsOpenRef = useRef(false);

    // Reset state ONLY when modal opens (transition from false to true)
    // Don't reset on every initialData or editingTemplateId change while open
    React.useEffect(() => {
        const wasOpen = prevIsOpenRef.current;
        prevIsOpenRef.current = isOpen;

        // Only reset when transitioning from closed to open
        if (isOpen && !wasOpen) {
            setCurrentStep(1);
            setIsDirty(false);
            setShowConfirmClose(false);
            // Use existing ID if editing, or initialData.id for drafts
            setDraftId(editingTemplateId || initialData?.id || null);
            setTemplateData({
                name: initialData?.name || '',
                description: initialData?.description || '',
                categoryId: initialData?.categoryId || null,
                widgets: initialData?.widgets || [],
                isDraft: initialData?.isDraft || false,
                ...(initialData?.id && { id: initialData.id }),
            });
        }
    }, [isOpen, initialData, editingTemplateId]);

    // Handle close with confirmation if dirty
    const handleClose = useCallback(() => {
        if (isDirty) {
            setShowConfirmClose(true);
        } else {
            onClose();
        }
    }, [isDirty, onClose]);


    // Update template data and mark as dirty
    const updateTemplateData = useCallback((updates: Partial<TemplateData>) => {
        setTemplateData(prev => ({ ...prev, ...updates }));
        setIsDirty(true);
    }, []);

    // Step navigation
    const canGoNext = () => {
        if (currentStep === 1) {
            return templateData.name.trim().length > 0;
        }
        return true;
    };

    // Save draft to API (skip in edit mode - no drafts when editing existing templates)
    const saveDraft = useCallback(async (widgetsOverride?: TemplateWidget[]) => {
        // In edit mode, we don't create drafts - changes are either saved or discarded
        if (isEditMode) return;

        if (isSavingRef.current) return;
        isSavingRef.current = true;

        try {
            const response = await axios.post<{ template: { id: string } }>('/api/templates/draft', {
                templateId: draftId,
                name: templateData.name || 'Untitled Draft',
                description: templateData.description,
                categoryId: templateData.categoryId,
                widgets: widgetsOverride ?? templateData.widgets,
            });

            // Store draft ID for subsequent saves
            const newDraftId = response.data.template?.id;
            if (!draftId && newDraftId) {
                setDraftId(newDraftId);
                // IMPORTANT: Also update templateData.id so Step3 uses PUT instead of POST
                setTemplateData(prev => ({ ...prev, id: newDraftId }));
            }

            logger.debug('Draft saved', { id: newDraftId });
        } catch (err) {
            logger.error('Failed to save draft', { error: err });
        } finally {
            isSavingRef.current = false;
        }
    }, [isEditMode, draftId, templateData]);

    const handleNext = async () => {
        if (currentStep < 3 && canGoNext()) {
            // Save draft when leaving Step 1
            if (currentStep === 1) {
                await saveDraft();
            }
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleStepClick = (step: number) => {
        if (step <= currentStep || (step === currentStep + 1 && canGoNext())) {
            setCurrentStep(step);
        }
    };

    // Get title based on mode
    const getTitle = () => {
        switch (mode) {
            case 'create':
                return 'Create New Template';
            case 'edit':
                return 'Edit Template';
            case 'duplicate':
                return 'Duplicate Template';
            case 'save-current':
                return 'Save Dashboard as Template';
            default:
                return 'Template Builder';
        }
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={handleClose}
                title={getTitle()}
                size={currentStep === 2 ? 'full' : 'lg'}
            >
                <div className="flex flex-col h-full">

                    {/* Step Content - flex-1 takes remaining space after footer */}
                    <div className="flex-1 min-h-0 py-4">
                        <AnimatePresence mode="wait">
                            {currentStep === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <TemplateBuilderStep1
                                        data={templateData}
                                        onChange={updateTemplateData}
                                        isAdmin={isAdmin}
                                    />
                                </motion.div>
                            )}
                            {currentStep === 2 && (
                                <motion.div
                                    key="step2"
                                    className="h-full"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <TemplateBuilderStep2
                                        data={templateData}
                                        onChange={updateTemplateData}
                                        onDraftSave={saveDraft}
                                    />
                                </motion.div>
                            )}
                            {currentStep === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <TemplateBuilderStep3
                                        data={templateData}
                                        onSave={onSave}
                                        onShare={onShare}
                                        onClose={onClose}
                                        isAdmin={isAdmin}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer with navigation - flex-shrink-0 prevents compression */}
                    <div className="flex-shrink-0 flex items-center justify-between py-4 border-t border-theme">
                        {/* Cancel/Back */}
                        <Button
                            variant="secondary"
                            onClick={currentStep === 1 ? handleClose : handleBack}
                        >
                            {currentStep === 1 ? 'Cancel' : '← Back'}
                        </Button>

                        {/* Step indicators */}
                        <div className="flex items-center gap-3">
                            {STEPS.map((step) => (
                                <button
                                    key={step.id}
                                    onClick={() => handleStepClick(step.id)}
                                    className={`w-3 h-3 rounded-full transition-all border-2 ${currentStep === step.id
                                        ? 'bg-accent border-accent scale-125'
                                        : step.id < currentStep
                                            ? 'bg-accent/60 border-accent/60'
                                            : 'bg-theme-tertiary border-theme'
                                        } cursor-pointer hover:scale-110`}
                                    title={step.label}
                                />
                            ))}
                        </div>

                        {/* Next */}
                        {currentStep < 3 && (
                            <Button
                                variant="primary"
                                onClick={handleNext}
                                disabled={!canGoNext()}
                            >
                                Next →
                            </Button>
                        )}
                        {currentStep === 3 && (
                            <div className="w-20" /> // Spacer for layout balance
                        )}
                    </div>
                </div>
            </Modal>

            {/* Confirm close modal - different behavior for edit vs create mode */}
            <Modal
                isOpen={showConfirmClose}
                onClose={() => setShowConfirmClose(false)}
                title={isEditMode ? 'Discard Changes?' : 'Save Changes?'}
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-theme-secondary">
                        {isEditMode
                            ? 'Your changes have not been saved. Discard changes?'
                            : 'Would you like to save your template as a draft?'
                        }
                    </p>
                    <div className="flex gap-3 justify-end pt-4 border-t border-theme">
                        <Button
                            variant="secondary"
                            onClick={() => setShowConfirmClose(false)}
                        >
                            Keep Editing
                        </Button>

                        {isEditMode ? (
                            // Edit mode: Just close without deleting (revert = do nothing, template unchanged)
                            <Button
                                variant="danger"
                                onClick={() => {
                                    setShowConfirmClose(false);
                                    onClose();
                                }}
                            >
                                Discard Changes
                            </Button>
                        ) : (
                            // Create mode: Save Draft or Discard (delete draft)
                            <>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        // Draft is already saved from auto-save, just close and notify parent
                                        setShowConfirmClose(false);
                                        onDraftSaved?.(); // Trigger list refresh
                                        onClose();
                                    }}
                                >
                                    Save Draft
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={async () => {
                                        // Delete draft if it exists (only in create mode)
                                        if (draftId) {
                                            try {
                                                await axios.delete(`/api/templates/${draftId}`);
                                                logger.debug('Draft deleted', { id: draftId });
                                            } catch (err) {
                                                logger.error('Failed to delete draft', { error: err });
                                            }
                                        }
                                        setShowConfirmClose(false);
                                        onClose();
                                    }}
                                >
                                    Discard
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default TemplateBuilder;
