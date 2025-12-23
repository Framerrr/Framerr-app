import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * DashboardEditContext - Refactored to be a central state store
 * 
 * The provider lives in MainLayout (wrapping both Sidebar and MainContent).
 * Dashboard registers itself and updates the state when edit mode changes.
 * Sidebar reads the state to decide whether to block navigation.
 */

export interface DashboardEditContextValue {
    // Read-only state for consumers (like Sidebar)
    editMode: boolean;
    hasUnsavedChanges: boolean;
    pendingUnlink: boolean;
    pendingDestination: string | null;

    // Actions available to consumers
    setPendingDestination: (dest: string | null) => void;

    // Registration for Dashboard to push its state
    registerDashboard: (handlers: DashboardHandlers) => void;
    unregisterDashboard: () => void;
    updateEditState: (state: EditStateUpdate) => void;
}

export interface DashboardHandlers {
    handleSave: () => Promise<void>;
    handleCancel: () => void;
}

export interface EditStateUpdate {
    editMode: boolean;
    hasUnsavedChanges: boolean;
    pendingUnlink: boolean;
}

const DashboardEditContext = createContext<DashboardEditContextValue | null>(null);

export interface DashboardEditProviderProps {
    children: ReactNode;
}

export function DashboardEditProvider({ children }: DashboardEditProviderProps): React.JSX.Element {
    // Edit state - updated by Dashboard
    const [editMode, setEditMode] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [pendingUnlink, setPendingUnlink] = useState(false);
    const [pendingDestination, setPendingDestination] = useState<string | null>(null);

    // Dashboard handlers - set when Dashboard registers
    const [dashboardHandlers, setDashboardHandlers] = useState<DashboardHandlers | null>(null);

    const registerDashboard = useCallback((handlers: DashboardHandlers) => {
        setDashboardHandlers(handlers);
    }, []);

    const unregisterDashboard = useCallback(() => {
        setDashboardHandlers(null);
        // Reset state when Dashboard unmounts
        setEditMode(false);
        setHasUnsavedChanges(false);
        setPendingUnlink(false);
        setPendingDestination(null);
    }, []);

    const updateEditState = useCallback((state: EditStateUpdate) => {
        setEditMode(state.editMode);
        setHasUnsavedChanges(state.hasUnsavedChanges);
        setPendingUnlink(state.pendingUnlink);
    }, []);

    const value: DashboardEditContextValue = {
        editMode,
        hasUnsavedChanges,
        pendingUnlink,
        pendingDestination,
        setPendingDestination,
        registerDashboard,
        unregisterDashboard,
        updateEditState,
    };

    return (
        <DashboardEditContext.Provider value={value}>
            {children}
        </DashboardEditContext.Provider>
    );
}

export function useDashboardEdit(): DashboardEditContextValue | null {
    return useContext(DashboardEditContext);
}

export default DashboardEditContext;
