import React, { useState } from 'react';

const ColorPicker = ({ value, onChange, label }) => {
    const [color, setColor] = useState(value || '#000000');

    const handleChange = (e) => {
        const newColor = e.target.value;
        setColor(newColor);
        if (onChange) {
            onChange(newColor);
        }
    };

    return (
        <div className="color-picker">
            {label && <label className="color-picker-label">{label}</label>}
            <div className="color-picker-input-wrapper">
                <input
                    type="color"
                    value={color}
                    onChange={handleChange}
                    className="color-picker-input"
                />
                <input
                    type="text"
                    value={color}
                    onChange={handleChange}
                    className="color-picker-text"
                    placeholder="#000000"
                />
            </div>
        </div>
    );
};

export default ColorPicker;
