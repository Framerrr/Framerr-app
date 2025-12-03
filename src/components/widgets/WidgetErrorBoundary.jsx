import React from 'react';
import { AlertTriangle, RotateCcw, ChevronDown } from 'lucide-react';
import { Button } from '../common/Button';
import logger from '../../utils/logger';

/**
 * WidgetErrorBoundary - Enhanced error boundary for widgets
 * Catches React errors, displays premium error UI, and provides retry mechanism
 */
class WidgetErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            showDetails: false
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });

        logger.error('Widget error caught by boundary', {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            widgetType: this.props.widgetType || 'unknown'
        });
    }

    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            showDetails: false
        });
    };

    toggleDetails = () => {
        this.setState(prev => ({ showDetails: !prev.showDetails }));
    };

    render() {
        if (this.state.hasError) {
            const { error, errorInfo, showDetails } = this.state;

            return (
                <div className="flex items-center justify-center p-6">
                    <div className="glass-card rounded-xl p-6 border border-theme max-w-lg w-full space-y-4">
                        {/* Header with Icon */}
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-error/20 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle size={20} className="text-error" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-theme-primary mb-1">
                                    Widget Failed to Load
                                </h3>
                                <p className="text-sm text-theme-secondary">
                                    {error?.message || 'An unknown error occurred'}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <Button
                                onClick={this.handleRetry}
                                variant="primary"
                                size="sm"
                                icon={RotateCcw}
                            >
                                Retry
                            </Button>

                            <button
                                onClick={this.toggleDetails}
                                className="px-3 py-2 text-sm text-theme-secondary hover:text-theme-primary border border-theme rounded-lg hover:bg-theme-hover transition-all flex items-center gap-2"
                            >
                                {showDetails ? 'Hide' : 'Show'} Details
                                <ChevronDown
                                    size={16}
                                    className={`transition-transform ${showDetails ? 'rotate-180' : ''}`}
                                />
                            </button>
                        </div>

                        {/* Collapsible Details */}
                        {showDetails && errorInfo && (
                            <div className="space-y-2 pt-4 border-t border-theme">
                                <div className="text-xs font-medium text-theme-tertiary uppercase tracking-wider">
                                    Stack Trace
                                </div>
                                <pre className="text-xs text-theme-secondary bg-theme-tertiary/30 rounded-lg p-3 overflow-auto max-h-48 font-mono">
                                    {error?.stack || 'No stack trace available'}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default WidgetErrorBoundary;
