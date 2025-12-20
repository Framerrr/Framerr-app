import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
    value: string;
    label: string;
}

export interface DropdownProps {
    label?: string;
    value?: string;
    onChange: (value: string) => void;
    options?: DropdownOption[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

/**
 * Dropdown Component - Custom select input styling
 */
const Dropdown = ({
    label,
    value,
    onChange,
    options = [],
    placeholder = 'Select an option',
    disabled = false,
    className = ''
}: DropdownProps): React.JSX.Element => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent): void => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (option: DropdownOption): void => {
        if (disabled) return;
        onChange(option.value);
        setIsOpen(false);
    };

    return (
        <div className={`mb-4 ${className}`} ref={dropdownRef}>
            {label && (
                <label className="block mb-2 font-medium text-theme-primary text-sm">
                    {label}
                </label>
            )}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={`
            w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-all
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${isOpen
                            ? 'border-accent ring-2 ring-accent/20'
                            : 'border-theme hover:border-theme-light'
                        }
            bg-theme-tertiary text-theme-primary
          `}
                >
                    <span className={selectedOption ? 'text-theme-primary' : 'text-theme-tertiary'}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown
                        size={18}
                        className={`text-theme-tertiary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </button>
                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute z-[1000] w-full mt-2 py-1 rounded-lg border border-theme bg-theme-secondary shadow-deep max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                        {options.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-theme-tertiary text-center">
                                No options available
                            </div>
                        ) : (
                            options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option)}
                                    className={`
                    w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors
                    ${option.value === value
                                            ? 'bg-accent/10 text-accent'
                                            : 'text-theme-primary hover:bg-theme-hover'
                                        }
                  `}
                                >
                                    <span>{option.label}</span>
                                    {option.value === value && (
                                        <Check size={16} className="text-accent" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dropdown;
