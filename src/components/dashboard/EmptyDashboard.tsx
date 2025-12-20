import React from 'react';
import { Plus, LayoutGrid } from 'lucide-react';
import { Button } from '../common/Button';

export interface EmptyDashboardProps {
    onAddWidget: () => void;
}

const EmptyDashboard = ({ onAddWidget }: EmptyDashboardProps): React.JSX.Element => {
    return (
        <div className="flex items-center justify-center py-16 fade-in">
            <div className="glass-card rounded-2xl p-12 max-w-2xl w-full border border-theme text-center space-y-6">
                {/* Icon with glow effect */}
                <div className="flex justify-center mb-2">
                    <div className="relative">
                        <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full"></div>
                        <LayoutGrid
                            size={80}
                            className="relative text-accent"
                            strokeWidth={1.5}
                        />
                    </div>
                </div>

                {/* Heading */}
                <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-theme-primary">
                        Welcome to Your Dashboard
                    </h2>
                    <p className="text-lg text-theme-secondary max-w-lg mx-auto">
                        Your dashboard is empty, but it won't be for long!
                        Add your first widget to get started.
                    </p>
                </div>

                {/* CTA Button */}
                <div className="pt-4">
                    <Button
                        onClick={onAddWidget}
                        variant="primary"
                        size="lg"
                        icon={Plus}
                    >
                        Add Your First Widget
                    </Button>
                </div>

                {/* Helper Text */}
                <div className="pt-4 border-t border-theme">
                    <p className="text-sm text-theme-tertiary">
                        💡 Quick tip: Widgets can display your media, downloads,
                        system stats, and more.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EmptyDashboard;
