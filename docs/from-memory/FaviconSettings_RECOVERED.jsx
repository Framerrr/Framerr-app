import React, { useState, useEffect } from 'react';
import { Upload, Trash2, AlertCircle, CheckCircle, Link as LinkIcon, Loader } from 'lucide-react';
import axios from 'axios';
import logger from '../../utils/logger';
import { Button } from '../common/Button';
import { Textarea } from '../common/Input';

const FaviconSettings = () => {
    const [faviconFile, setFaviconFile] = useState(null);
    const [htmlSnippet, setHtmlSnippet] = useState('');
    const [currentFavicon, setCurrentFavicon] = useState(null);
    const [faviconEnabled, setFaviconEnabled] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [showConfirmReset, setShowConfirmReset] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchCurrentFavicon();
    }, []);

    const fetchCurrentFavicon = async () => {
        try {
            const response = await axios.get('/api/config/favicon', {
                withCredentials: true
            });
            setCurrentFavicon(response.data);
            setFaviconEnabled(response.data?.enabled !== false);

            // Populate HTML snippet field if exists
            if (response.data?.htmlSnippet) {
                setHtmlSnippet(response.data.htmlSnippet);
            }
        } catch (error) {
            logger.error('Failed to fetch favicon config:', error);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
                setMessage({ type: 'error', text: 'Please select a ZIP file' });
                return;
            }
            setFaviconFile(file);
            setMessage(null);
        }
    };

    const handleUpload = async () => {
        if (!faviconFile) {
            setMessage({ type: 'error', text: 'Please select a favicon ZIP file' });
            return;
        }

        if (!htmlSnippet.trim()) {
            setMessage({ type: 'error', text: 'Please paste the HTML snippet from RealFaviconGenerator' });
            return;
        }

        setUploading(true);
        setMessage(null);

        try {
            const formData = new FormData();
            formData.append('faviconZip', faviconFile);
            formData.append('htmlSnippet', htmlSnippet);

            const response = await axios.post('/api/config/favicon', formData, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setMessage({ type: 'success', text: 'Favicon uploaded successfully! Refresh the page to see changes.' });
            setFaviconFile(null);
            setHtmlSnippet('');
            fetchCurrentFavicon();

            // Reset file input
            document.getElementById('faviconFileInput').value = '';

            // Trigger favicon reload
            window.dispatchEvent(new Event('faviconUpdated'));
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to upload favicon'
            });
        } finally {
            setUploading(false);
        }
    };

    const handleToggleFavicon = async () => {
        try {
            const newState = !faviconEnabled;
            await axios.patch('/api/config/favicon',
                { enabled: newState },
                { withCredentials: true }
            );
            setFaviconEnabled(newState);
            setMessage({
                type: 'success',
                text: `Custom favicon ${newState ? 'enabled' : 'disabled'}. Refresh to see changes.`
            });

            // Trigger favicon reload
            window.dispatchEvent(new Event('faviconUpdated'));
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to toggle favicon'
            });
        }
    };

    const handleResetClick = () => {
        setShowConfirmReset(true);
    };

    const handleConfirmReset = async () => {
        setShowConfirmReset(false);
        setResetting(true);
        setMessage(null);

        try {
            await axios.delete('/api/config/favicon', {
                withCredentials: true
            });
            setMessage({ type: 'success', text: 'Favicon reset to default! Refresh the page to see changes.' });
            setCurrentFavicon(null);
            setHtmlSnippet('');

            // Don't call fetchCurrentFavicon - we want it to stay null

            // Trigger favicon reload
            window.dispatchEvent(new Event('faviconUpdated'));
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to reset favicon'
            });
        } finally {
            setResetting(false);
        }
    };

    const handleCancelReset = () => {
        setShowConfirmReset(false);
    };

    return (
        <div className="space-y-6 fade-in">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-theme-primary">Favicon</h2>
                <p className="text-theme-secondary text-sm mt-1">
                    Upload a custom favicon package from RealFaviconGenerator.net
                </p>
            </div>

            {/* Instructions */}
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-6">
                <div className="flex items-start gap-3">
                    <AlertCircle className="text-accent flex-shrink-0 mt-0.5" size={20} />
                    <div className="text-sm space-y-2">
                        <p className="text-accent font-medium">How to use RealFaviconGenerator.net:</p>
                        <ol className="list-decimal list-inside space-y-1 text-theme-secondary">
                            <li>Go to <a href="https://realfavicongenerator.net" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">realfavicongenerator.net</a></li>
                            <li>Upload your logo/icon image</li>
                            <li>Configure your favicon settings</li>
                            <li>In "Favicon Generator Options", set path to <code className="bg-theme-tertiary px-1.5 py-0.5 rounded text-accent">/favicon</code></li>
                            <li>Click "Generate your Favicons and HTML code"</li>
                            <li>Download the ZIP package and copy the HTML code</li>
                            <li>Upload both below</li>
                        </ol>
                    </div>
                </div>
            </div>

            {/* Current Status */}
            {currentFavicon?.htmlSnippet && (
                <div className="bg-theme-tertiary/50 border border-theme rounded-xl p-4">
                    {/* Header with status */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-theme-primary flex items-center gap-2">
                            {faviconEnabled ? (
                                <>
                                    <CheckCircle size={16} className="text-success" />
                                    Custom Favicon Active
                                </>
                            ) : (
                                <>
                                    <AlertCircle size={16} className="text-theme-secondary" />
                                    Using Default Framerr Favicon
                                </>
                            )}
                        </h3>
                    </div>

                    {/* Toggle Switch */}
                    <div className="flex items-center justify-between p-3 bg-theme-tertiary rounded-lg mb-4">
                        <div>
                            <span className="text-theme-primary font-medium">Use Custom Favicon</span>
                            <p className="text-xs text-theme-secondary mt-0.5">
                                {faviconEnabled
                                    ? 'Custom favicon is currently active'
                                    : 'Using default Framerr favicon'}
                            </p>
                        </div>
                        <button
                            onClick={handleToggleFavicon}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${faviconEnabled ? 'bg-accent' : 'bg-theme-tertiary'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${faviconEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Upload metadata */}
                    {currentFavicon.uploadedAt && (
                        <p className="text-xs text-theme-tertiary mb-3">
                            Uploaded by {currentFavicon.uploadedBy} on {new Date(currentFavicon.uploadedAt).toLocaleString()}
                        </p>
                    )}

                    {/* Delete button */}
                    {!showConfirmReset ? (
                        <Button
                            onClick={handleResetClick}
                            disabled={resetting}
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                        >
                            {resetting ? 'Deleting...' : 'Delete Custom Favicon'}
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                            <span className="text-sm text-theme-secondary">Are you sure?</span>
                            <Button
                                onClick={handleConfirmReset}
                                variant="danger"
                                size="sm"
                            >
                                Confirm
                            </Button>
                            <Button
                                onClick={handleCancelReset}
                                variant="secondary"
                                size="sm"
                            >
                                Cancel
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Upload Form */}
            <div className="glass-subtle shadow-deep border border-theme rounded-xl p-6 space-y-6">
                {/* File Upload */}
                <div>
                    <label className="block mb-2 font-medium text-theme-secondary text-sm">
                        1. Upload Favicon ZIP Package
                    </label>
                    <div className="relative">
                        <input
                            id="faviconFileInput"
                            type="file"
                            accept=".zip,application/zip,application/x-zip-compressed"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <label
                            htmlFor="faviconFileInput"
                            className="flex items-center justify-center gap-3 w-full px-6 py-8 border-2 border-dashed border-theme rounded-lg cursor-pointer hover:border-accent hover:bg-theme-tertiary/30 transition-colors"
                        >
                            <Upload size={24} className="text-theme-secondary" />
                            <div className="text-center">
                                {faviconFile ? (
                                    <>
                                        <p className="text-theme-primary font-medium">{faviconFile.name}</p>
                                        <p className="text-xs text-theme-secondary mt-1">
                                            {(faviconFile.size / 1024).toFixed(2)} KB
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-theme-secondary">Click to select ZIP file</p>
                                        <p className="text-xs text-theme-tertiary mt-1">or drag and drop</p>
                                    </>
                                )}
                            </div>
                        </label>
                    </div>
                </div>

                {/* HTML Snippet */}
                <div>
                    <label className="block mb-2 font-medium text-theme-secondary text-sm flex items-center gap-2">
                        <span>2. Paste HTML Code from RealFaviconGenerator</span>
                        <LinkIcon size={14} className="text-theme-tertiary" />
                    </label>
                    <Textarea
                        value={htmlSnippet}
                        onChange={(e) => setHtmlSnippet(e.target.value)}
                        placeholder='<link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png">
...'
                        className="h-32 font-mono text-sm resize-none"
                    />
                    <p className="text-xs text-theme-tertiary mt-2">
                        Copy the HTML code from Step 3 on RealFaviconGenerator.net
                    </p>
                </div>

                {/* Upload Button */}
                <Button
                    onClick={handleUpload}
                    disabled={uploading || !faviconFile || !htmlSnippet}
                    className="w-full"
                    icon={uploading ? Loader : Upload}
                >
                    {uploading ? 'Uploading...' : 'Upload Favicon'}
                </Button>
            </div>

            {/* Message Display */}
            {message && (
                <div className={`p-4 rounded-lg border ${message.type === 'success'
                    ? 'bg-success/10 border-success/30 text-success'
                    : 'bg-error/10 border-error/30 text-error'
                    }`}>
                    <div className="flex items-start gap-3">
                        {message.type === 'success' ? (
                            <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
                        ) : (
                            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                        )}
                        <p className="text-sm">{message.text}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FaviconSettings;
