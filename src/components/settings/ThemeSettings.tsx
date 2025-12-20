import React from 'react';
import { Palette, LucideIcon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeOption {
    id: string;
    name: string;
    description: string;
}

const ThemeSettings: React.FC = () => {
    const { theme, themes, changeTheme } = useTheme();

    // Color preview mapping for each theme
    const getThemeColors = (themeId: string): string[] => {
        const colorMap: Record<string, string[]> = {
            light: ['#0ea5e9', '#10b981', '#f59e0b'],
            nord: ['#88c0d0', '#a3be8c', '#ebcb8b'],
            catppuccin: ['#89b4fa', '#a6e3a1', '#f9e2af'],
            dracula: ['#bd93f9', '#50fa7b', '#f1fa8c'],
            noir: ['#8a9ba8', '#4ade80', '#fbbf24'],
            nebula: ['#a855f7', '#ec4899', '#22d3ee'],
        };
        return colorMap[themeId] || ['#3b82f6', '#10b981', '#f59e0b'];
    };

    return (
        <div className="space-y-6">
            <div className="mb-6 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-theme-primary">
                    Theme
                </h2>
                <p className="text-theme-secondary text-sm">
                    Choose your preferred color theme
                </p>
            </div>

            {/* Theme Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(themes as ThemeOption[]).map((t) => {
                    const colors = getThemeColors(t.id);
                    const isActive = theme === t.id;

                    return (
                        <button
                            key={t.id}
                            onClick={() => changeTheme(t.id)}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${isActive
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'hover:border-slate-600'
                                }`}
                            style={{
                                backgroundColor: isActive ? 'var(--accent)20' : 'var(--bg-secondary)',
                                borderColor: isActive ? 'var(--accent)' : 'var(--border)'
                            }}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Palette size={20} style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }} />
                                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                        {t.name}
                                    </span>
                                </div>
                                {isActive && (
                                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                                        Active
                                    </span>
                                )}
                            </div>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {t.description}
                            </p>

                            {/* Color Preview */}
                            <div className="flex gap-2 mt-3">
                                {colors.map((color, index) => (
                                    <div
                                        key={index}
                                        className="w-8 h-8 rounded"
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default ThemeSettings;
