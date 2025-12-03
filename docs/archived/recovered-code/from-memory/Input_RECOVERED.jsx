import React from 'react';

/**
 * Input Component - Consistent form input styling
 */
export const Input = ({
    label,
    error,
    helperText,
    icon: Icon,
    className = '',
    ...props
}) => {
    return (
        <div className={`mb-4 ${className}`}>
            {label && (
                <label className="block mb-2 font-medium text-theme-primary text-sm">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-tertiary">
                        <Icon size={18} />
                    </div>
                )}
                <input
                    {...props}
                    className={`w-full rounded-lg transition-all focus:outline-none focus:ring-2 bg-theme-tertiary text-theme-primary text-base placeholder-theme-tertiary
                        ${error
                            ? 'border-error focus:border-error focus:ring-error/20'
                            : 'border-theme focus:border-accent focus:ring-accent/20'
                        }
                        ${Icon ? 'pl-10 pr-4 py-3' : 'px-4 py-3'}
                        border
                    `}
                />
            </div>
            {error && (
                <p className="mt-1 text-error text-sm">
                    {error}
                </p>
            )}
            {helperText && !error && (
                <p className="mt-1 text-theme-tertiary text-sm">
                    {helperText}
                </p>
            )}
        </div>
    );
};

/**
 * Textarea Component - Multi-line input
 */
export const Textarea = ({
    label,
    error,
    helperText,
    className = '',
    rows = 4,
    ...props
}) => {
    return (
        <div className={`mb-4 ${className}`}>
            {label && (
                <label className="block mb-2 font-medium text-theme-primary text-sm">
                    {label}
                </label>
            )}
            <textarea
                {...props}
                rows={rows}
                className={`w-full rounded-lg transition-all focus:outline-none focus:ring-2 bg-theme-tertiary text-theme-primary text-base placeholder-theme-tertiary resize-y px-4 py-3
                    ${error
                        ? 'border-error focus:border-error focus:ring-error/20'
                        : 'border-theme focus:border-accent focus:ring-accent/20'
                    }
                    border
                `}
            />
            {error && (
                <p className="mt-1 text-error text-sm">
                    {error}
                </p>
            )}
            {helperText && !error && (
                <p className="mt-1 text-theme-tertiary text-sm">
                    {helperText}
                </p>
            )}
        </div>
    );
};

export default Input;
