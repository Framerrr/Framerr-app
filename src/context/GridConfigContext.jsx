import React, { createContext, useContext, useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { GRID_CONFIG, calculateAvailableSpace as calculateSpace } from '../utils/gridConfig';

// Create context
const GridConfigContext = createContext(null);

/**
 * Grid Configuration Provider
 * Provides grid constants and helper functions to all widgets
 */
export const GridConfigProvider = ({ children }) => {
    // State for future dynamic features
    const [gridDensity, setGridDensity] = useState('normal'); // normal | compact | comfortable

    // Calculation cache for performance optimization
    const calculationCache = useRef(new Map());

    // Calculate dynamic rowHeight based on density (future feature)
    const rowHeight = useMemo(() => {
        switch (gridDensity) {
            case 'compact': return 80;
            case 'comfortable': return 120;
            case 'normal':
            default: return GRID_CONFIG.colWidth; // Default to colWidth for square cells
        }
    }, [gridDensity]);

    // Clear calculation cache when rowHeight changes
    useEffect(() => {
        calculationCache.current.clear();
    }, [rowHeight]);

    // Memoized calculation function with caching
    const calculateAvailableSpace = useCallback((widgetCols, widgetRows, hasHeader = true) => {
        const cacheKey = `${widgetCols}-${widgetRows}-${hasHeader}-${rowHeight}`;

        // Return cached result if available
        if (calculationCache.current.has(cacheKey)) {
            return calculationCache.current.get(cacheKey);
        }

        // Calculate and cache result
        const result = calculateSpace(widgetCols, widgetRows, hasHeader, { rowHeight });
        calculationCache.current.set(cacheKey, result);

        return result;
    }, [rowHeight]);

    // Memoize context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        // Static config values
        ...GRID_CONFIG,

        // Dynamic values (can change at runtime)
        rowHeight,
        gridDensity,
        setGridDensity,

        // Helper functions
        calculateAvailableSpace
    }), [rowHeight, gridDensity, calculateAvailableSpace]);

    return (
        <GridConfigContext.Provider value={value}>
            {children}
        </GridConfigContext.Provider>
    );
};

/**
 * Custom hook to access grid configuration
 * Must be used within GridConfigProvider
 * 
 * @param {Object} [overrides={}] - Optional configuration overrides for this widget
 * @returns {Object} Grid configuration object
 * 
 * @example
 * // Basic usage
 * const { calculateAvailableSpace, rowHeight } = useGridConfig();
 * 
 * @example
 * // With overrides (future feature)
 * const config = useGridConfig({ rowHeight: 120 });
 */
export const useGridConfig = (overrides = {}) => {
    const context = useContext(GridConfigContext);

    if (!context) {
        throw new Error('useGridConfig must be used within GridConfigProvider');
    }

    // If no overrides, return context as-is
    if (Object.keys(overrides).length === 0) {
        return context;
    }

    // Apply overrides (future feature for per-widget customization)
    return useMemo(() => ({
        ...context,
        ...overrides,
        // Override-aware calculation
        calculateAvailableSpace: (widgetCols, widgetRows, hasHeader) => {
            return calculateSpace(
                widgetCols,
                widgetRows,
                hasHeader,
                {
                    rowHeight: overrides.rowHeight || context.rowHeight,
                    ...overrides
                }
            );
        }
    }), [context, overrides]);
};
