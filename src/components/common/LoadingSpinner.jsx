import React from 'react';

/**
 * LoadingSpinner - Animated loading indicator with theme support
 * @param {string} size - Size variant: 'sm'|'md'|'lg' (or 'small'|'medium'|'large')
 * @param {string} message - Optional loading message to display below spinner
 */
const LoadingSpinner = ({ size = 'md', message }) => {
    // Size mapping with aliases
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
        small: 'h-4 w-4',   // Alias
        medium: 'h-8 w-8',  // Alias  
        large: 'h-12 w-12'  // Alias
    };

    const spinnerSize = sizeClasses[size] || sizeClasses.md;

    return (
        <div className="flex flex-col items-center justify-center gap-3">
            {/* Animated spinner - uses Tailwind animate-spin */}
            <div
                className={`${spinnerSize} animate-spin rounded-full border-2 border-theme border-t-accent`}
                role="status"
                aria-label="Loading"
            />

            {/* Optional message */}
            {message && (
                <p className="text-sm text-theme-secondary">
                    {message}
                </p>
            )}
        </div>
    );
};

export default LoadingSpinner;
