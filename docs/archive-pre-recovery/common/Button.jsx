import React from 'react';

/**
 * Button Component - Consistent button styling with variants
 */
export const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    onClick,
    disabled = false,
    type = 'button',
    className = '',
    fullWidth = false
}) => {
    const variants = {
        primary: {
            backgroundColor: 'var(--accent)',
            color: 'white',
            border: 'none'
        },
        secondary: {
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)'
        },
        danger: {
            backgroundColor: 'var(--error)',
            color: 'white',
            border: 'none'
        },
        ghost: {
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            border: '1px solid transparent'
        },
        outline: {
            backgroundColor: 'transparent',
            color: 'var(--accent)',
            border: '1px solid var(--accent)'
        }
    };

    const sizes = {
        sm: {
            padding: 'var(--space-2) var(--space-3)',
            fontSize: 'var(--text-sm)'
        },
        md: {
            padding: 'var(--space-3) var(--space-4)',
            fontSize: 'var(--text-base)'
        },
        lg: {
            padding: 'var(--space-4) var(--space-6)',
            fontSize: 'var(--text-lg)'
        }
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center justify-center gap-2 font-medium transition-all ${className}`}
            style={{
                ...variants[variant],
                ...sizes[size],
                borderRadius: 'var(--radius-md)',
                opacity: disabled ? 0.5 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
                width: fullWidth ? '100%' : 'auto'
            }}
        >
            {Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
            {children}
        </button>
    );
};

export default Button;
