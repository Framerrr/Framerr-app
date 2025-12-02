import React from 'react';

const LoadingSpinner = ({ size = 'medium', message }) => {
    const sizeClass = size === 'small' ? 'spinner-sm' : size === 'large' ? 'spinner-lg' : 'spinner-md';

    return (
        <div className={`loading-spinner ${sizeClass}`}>
            <div className="spinner"></div>
            {message && <p className="loading-message">{message}</p>}
        </div>
    );
};

export default LoadingSpinner;
