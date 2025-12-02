import React from 'react';

/**
 * Card Component - Simple modern container
 */
export const Card = ({
    children,
    className = '',
    hover = false,
    padding = 'lg'
}) => {
    const paddingClass = {
        sm: 'p-4',
        md: 'p-5',
        lg: 'p-6',
        xl: 'p-8'
    }[padding];

    const baseClasses = `${paddingClass} bg-slate-800 border border-slate-700 rounded-xl shadow-lg transition-all duration-200`;
    const hoverClasses = hover ? 'hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1 hover:border-blue-500/50 cursor-pointer' : '';
    const allClasses = `${baseClasses} ${hoverClasses} ${className}`.trim();

    return (
        <div className={allClasses}>
            {children}
        </div>
    );
};

/**
 * CardHeader Component - Header section for cards
 */
export const CardHeader = ({
    title,
    description,
    action,
    divider = true
}) => {
    return (
        <div className={`mb-6 ${divider ? 'pb-4 border-b border-slate-700' : ''}`}>
            <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                    <h3 className={`text-xl font-semibold text-white ${description ? 'mb-1' : ''}`}>
                        {title}
                    </h3>
                    {description && (
                        <p className="text-sm text-slate-400">
                            {description}
                        </p>
                    )}
                </div>
                {action && <div className="flex-shrink-0">{action}</div>}
            </div>
        </div>
    );
};

export default Card;
