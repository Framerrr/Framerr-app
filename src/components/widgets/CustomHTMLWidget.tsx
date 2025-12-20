import React from 'react';

interface CustomHTMLConfig {
    htmlContent?: string;
    cssContent?: string;
    [key: string]: unknown;
}

export interface CustomHTMLWidgetProps {
    config?: CustomHTMLConfig;
}

/**
 * Custom HTML Widget
 * Renders user-defined HTML and CSS content
 */
const CustomHTMLWidget = ({ config }: CustomHTMLWidgetProps): React.JSX.Element => {
    const { htmlContent = '', cssContent = '' } = config || {};

    if (!htmlContent) {
        return (
            <div className="flex items-center justify-center h-full text-center p-4">
                <p className="text-sm text-slate-400">No custom content configured</p>
            </div>
        );
    }

    return (
        <div className="custom-html-widget h-full overflow-auto">
            {cssContent && <style>{cssContent}</style>}
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </div>
    );
};

export default CustomHTMLWidget;
