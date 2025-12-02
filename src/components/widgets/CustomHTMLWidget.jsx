import React from 'react';

/**
 * Custom HTML Widget
 * Renders user-defined HTML and CSS content
 */
const CustomHTMLWidget = ({ config }) => {
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
