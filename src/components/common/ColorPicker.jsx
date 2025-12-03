import React, { useState, useEffect } from 'react';

// Quick color presets for common theme colors
const COLOR_PRESETS = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Purple', value: '#A855F7' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Yellow', value: '#EAB308' },
    { name: 'Green', value: '#10B981' },
    { name: 'Cyan', value: '#06B6D4' }
];

/**
 * ColorPicker - Enhanced color picker with presets and validation
 * @param {string} value - Current hex color value
 * @param {function} onChange - Callback when color changes
 * @param {string} label - Display label
 */
const ColorPicker = ({ value, onChange, label }) => {
    const [color, setColor] = useState(value || '#3B82F6');

    // Sync with parent value changes
    useEffect(() => {
        if (value) setColor(value);
    }, [value]);

    const handleColorChange = (newColor) => {
        setColor(newColor);
        if (onChange) onChange(newColor);
    };

    const handleTextChange = (e) => {
        let newValue = e.target.value;

        // Auto-add # if missing
        if (newValue && !newValue.startsWith('#')) {
            newValue = '#' + newValue;
        }

        setColor(newValue);

        // Only call onChange if valid hex format
        if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
            if (onChange) onChange(newValue);
        }
    };

    return (
        <div className="space-y-3">
            {/* Label */}
            {label && (
                <label className="block text-sm font-medium text-theme-primary">
                    {label}
                </label>
            )}

            {/* Main Picker Row */}
            <div className="flex items-center gap-3 p-3 bg-theme-tertiary/30 rounded-lg border border-theme">
                {/* Color Swatch Preview */}
                <div
                    className="w-10 h-10 rounded-lg border-2 border-theme flex-shrink-0"
                    style={{ backgroundColor: color }}
                    title="Current color preview"
                />

                {/* Hex Input */}
                <input
                    type="text"
                    value={color}
                    onChange={handleTextChange}
                    className="flex-1 bg-theme-secondary border border-theme rounded-lg px-3 py-2 text-theme-primary font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                    placeholder="#3B82F6"
                    maxLength={7}
                />

                {/* Native Color Picker */}
                <input
                    type="color"
                    value={color}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-10 h-10 cursor-pointer rounded-lg border border-theme"
                    title="Open color picker"
                />
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
                <div className="text-xs text-theme-tertiary">Quick Presets:</div>
                <div className="grid grid-cols-8 gap-2">
                    {COLOR_PRESETS.map(preset => (
                        <button
                            key={preset.value}
                            onClick={() => handleColorChange(preset.value)}
                            className="w-8 h-8 rounded-lg border-2 border-theme hover:border-accent hover:scale-110 transition-all"
                            style={{ backgroundColor: preset.value }}
                            title={`${preset.name}: ${preset.value}`}
                            type="button"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ColorPicker;
