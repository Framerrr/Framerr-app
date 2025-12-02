import React from 'react';
import { useHashLocation } from '../../hooks/useHashLocation';

const HashNavLink = ({ to, className, children, ...props }) => {
    const { hash } = useHashLocation();

    // Normalize target hash (ensure it starts with #)
    const targetHash = to.startsWith('#') ? to : `#${to}`;

    // Check if active
    // Exact match: current hash equals target hash
    // Default: if hash is empty and target is #dashboard
    const currentHash = hash || '#dashboard';
    const isActive = currentHash === targetHash;

    // Resolve className if it's a function
    const resolvedClassName = typeof className === 'function'
        ? className({ isActive })
        : className;

    return (
        <a
            href={targetHash}
            className={resolvedClassName}
            {...props}
        >
            {children}
        </a>
    );
};

export default HashNavLink;
