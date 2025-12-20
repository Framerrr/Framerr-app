import React from 'react';
import { LucideIcon } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children?: React.ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: LucideIcon;
    fullWidth?: boolean;
}

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
    fullWidth = false,
    ...props
}: ButtonProps): React.JSX.Element => {
    const variants: Record<ButtonVariant, string> = {
        primary: 'bg-accent text-white hover:bg-accent-hover border-none',
        secondary: 'bg-theme-tertiary text-theme-primary border border-theme hover:bg-theme-hover',
        danger: 'bg-error text-white border-none hover:bg-red-600',
        ghost: 'bg-transparent text-theme-primary border-transparent hover:bg-theme-hover',
        outline: 'bg-transparent text-accent border border-accent hover:bg-accent/10'
    };

    const sizes: Record<ButtonSize, string> = {
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-3 text-base',
        lg: 'px-6 py-4 text-lg'
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center justify-center gap-2 font-medium transition-all rounded-lg ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${fullWidth ? 'w-full' : 'w-auto'} ${className}`}
            {...props}
        >
            {Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
            {children}
        </button>
    );
};

export default Button;
