import React from 'react';
import { Activity, CheckCircle2, Server } from 'lucide-react';
import { motion } from 'framer-motion';

type BackendId = 'glances' | 'custom';
type BadgeColor = 'success' | 'info';

interface Backend {
    id: BackendId;
    name: string;
    icon: string;
    tagline: string;
    badge: string;
    badgeColor: BadgeColor;
}

export interface BackendSelectorProps {
    selected?: BackendId;
    onSelect: (backendId: BackendId) => void;
    disabled?: boolean;
}

/**
 * BackendSelector - Visual card-based backend picker
 * Modern glassmorphism cards with selection state
 */
const BackendSelector = ({ selected, onSelect, disabled = false }: BackendSelectorProps): React.JSX.Element => {
    const backends: Backend[] = [
        {
            id: 'glances',
            name: 'Glances',
            icon: '📊',
            tagline: 'Lightweight REST API',
            badge: 'Recommended',
            badgeColor: 'success'
        },
        {
            id: 'custom',
            name: 'Custom API',
            icon: '⚙️',
            tagline: 'Your own endpoint',
            badge: 'Advanced',
            badgeColor: 'info'
        }
    ];

    return (
        <div className="mb-6">
            <h3 className="text-sm font-medium text-theme-secondary mb-3">
                Choose Your Monitoring Backend
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {backends.map((backend) => {
                    const isSelected = selected === backend.id;

                    return (
                        <motion.button
                            key={backend.id}
                            onClick={() => !disabled && onSelect(backend.id)}
                            disabled={disabled}
                            className={`
                relative p-6 rounded-xl text-left transition-all
                glass-subtle
                ${isSelected
                                    ? 'border-2 border-accent shadow-glow'
                                    : 'border border-theme hover:border-accent/50'
                                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer card-glow'}
              `}
                            whileHover={!disabled ? { scale: 1.02 } : {}}
                            transition={{
                                type: 'spring',
                                stiffness: 220,
                                damping: 30
                            }}
                        >
                            {/* Selected checkmark */}
                            {isSelected && (
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 220,
                                        damping: 30
                                    }}
                                    className="absolute top-3 right-3"
                                >
                                    <CheckCircle2 size={20} className="text-accent" />
                                </motion.div>
                            )}

                            {/* Content */}
                            <div className="flex flex-col gap-3">
                                {/* Icon & Title */}
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{backend.icon}</span>
                                    <div className="flex-1">
                                        <h4 className={`font-semibold ${isSelected ? 'text-accent' : 'text-theme-primary'}`}>
                                            {backend.name}
                                        </h4>
                                        <p className="text-sm text-theme-secondary">
                                            {backend.tagline}
                                        </p>
                                    </div>
                                </div>

                                {/* Badge */}
                                <div className="flex">
                                    <span className={`
                    px-3 py-1 rounded-full text-xs font-medium
                    ${backend.badgeColor === 'success'
                                            ? 'bg-success/10 text-success border border-success/20'
                                            : 'bg-info/10 text-info border border-info/20'
                                        }
                  `}>
                                        {backend.badge}
                                    </span>
                                </div>
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
};

export default BackendSelector;
