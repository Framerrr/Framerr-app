import React from 'react';
import Button from '../common/Button';

const EmptyDashboard = ({ onAddWidget }) => {
    return (
        <div className="empty-dashboard">
            <div className="empty-dashboard-content">
                <h2>Welcome to Framerr</h2>
                <p>Your dashboard is empty. Add your first widget to get started!</p>
                {onAddWidget && (
                    <Button onClick={onAddWidget}>
                        Add Widget
                    </Button>
                )}
            </div>
        </div>
    );
};

export default EmptyDashboard;
