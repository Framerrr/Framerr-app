import React from 'react';
import { Palette } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ThemeSettings = () => {
    const { theme, themes, changeTheme } = useTheme();

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
                {themes.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => changeTheme(t.id)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${theme === t.id
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'hover:border-slate-600'
                            }`}
                        style={{
                            backgroundColor: theme === t.id ? 'var(--accent)20' : 'var(--bg-secondary)',
                            borderColor: theme === t.id ? 'var(--accent)' : 'var(--border)'
                        }}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Palette size={20} style={{ color: theme === t.id ? 'var(--accent)' : 'var(--text-secondary)' }} />
                                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    {t.name}
                                </span>
                            </div>
                            {theme === t.id && (
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
                            <div
                                className="w-8 h-8 rounded"
                                style={{ backgroundColor: t.id === 'light' ? '#0ea5e9' : t.id === 'nord' ? '#88c0d0' : t.id === 'catppuccin' ? '#89b4fa' : t.id === 'dracula' ? '#bd93f9' : t.id === 'noir' ? '#8a9ba8' : '#3b82f6' }}
                            />
                            <div
                                className="w-8 h-8 rounded"
                                style={{ backgroundColor: t.id === 'light' ? '#10b981' : t.id === 'nord' ? '#a3be8c' : t.id === 'catppuccin' ? '#a6e3a1' : t.id === 'dracula' ? '#50fa7b' : t.id === 'noir' ? '#4ade80' : '#10b981' }}
                            />
                            <div
                                className="w-8 h-8 rounded"
                                style={{ backgroundColor: t.id === 'light' ? '#f59e0b' : t.id === 'nord' ? '#ebcb8b' : t.id === 'catppuccin' ? '#f9e2af' : t.id === 'dracula' ? '#f1fa8c' : t.id === 'noir' ? '#fbbf24' : '#f59e0b' }}
                            />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ThemeSettings;
