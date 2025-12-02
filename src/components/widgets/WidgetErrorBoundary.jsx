import React from 'react';
import logger from '../../utils/logger';

class WidgetErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        logger.error('Widget error caught by boundary', {
            error: error.message,
            componentStack: errorInfo.componentStack,
            widgetType: this.props.widgetType || 'unknown'
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="widget-error">
                    <p>Widget failed to load</p>
                    <small>{this.state.error?.message}</small>
                </div>
            );
        }

        return this.props.children;
    }
}

export default WidgetErrorBoundary;
