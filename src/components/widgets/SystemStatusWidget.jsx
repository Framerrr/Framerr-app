import React from 'react';

/**
 * System Status Widget - STUB
 * TODO: Implement full system health monitoring (CPU, memory, temperature)
 */
export default function SystemStatusWidget({ config }) {
    return (
        <div style={{ padding: '1rem', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>System Status</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Widget not yet implemented
            </p>
            <p style={{ marginTop: '1rem', fontSize: '0.75rem', opacity: 0.6 }}>
                This widget will show CPU, memory, and temperature monitoring
            </p>
        </div>
    );
}
