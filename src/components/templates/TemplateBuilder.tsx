/**
 * TemplateBuilder - Main wizard container for creating/editing templates
 * 
 * A 3-step wizard:
 * 1. Setup - Name, category, description
 * 2. Build - Visual grid editor (Phase 3)
 * 3. Review - Preview and save actions
 */

import React, { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Modal from '../common/Modal';
import TemplateBuilderStep1 from './TemplateBuilderStep1';
import TemplateBuilderStep2 from './TemplateBuilderStep2';
import TemplateBuilderStep3 from './TemplateBuilderStep3';
import { Button } from '../common/Button';

// Types
export interface TemplateWidget {
    type: string;
    layout: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
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
    isAdmin = false,
}) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [isDirty, setIsDirty] = useState(false);
    const [showConfirmClose, setShowConfirmClose] = useState(false);

    // Template data state
    const [templateData, setTemplateData] = useState<TemplateData>({
        name: initialData?.name || '',
        description: initialData?.description || '',
        categoryId: initialData?.categoryId || null,
        widgets: initialData?.widgets || [],
        isDraft: initialData?.isDraft || false,
        ...(initialData?.id && { id: initialData.id }),
    });

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

    const handleNext = () => {
        if (currentStep < 3 && canGoNext()) {
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

            {/* Confirm close modal */}
            <Modal
                isOpen={showConfirmClose}
                onClose={() => setShowConfirmClose(false)}
                title="Discard Changes?"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-theme-secondary">
                        Your template progress will be lost.
                    </p>
                    <div className="flex gap-3 justify-end pt-4 border-t border-theme">
                        <Button
                            variant="secondary"
                            onClick={() => setShowConfirmClose(false)}
                        >
                            Keep Editing
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => {
                                setShowConfirmClose(false);
                                onClose();
                            }}
                        >
                            Discard
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default TemplateBuilder;
