import React, { useState, useEffect } from 'react';
import { Upload, Trash2, AlertCircle, CheckCircle, Link as LinkIcon } from 'lucide-react';
import axios from 'axios';

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
            console.error('Failed to fetch favicon config:', error);
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
                <h2 className="text-2xl font-bold text-white">Favicon</h2>
                <p className="text-slate-400 text-sm mt-1">
                    Upload a custom favicon package from RealFaviconGenerator.net
                </p>
            </div>

            {/* Instructions */}
            <div className="bg-accent/10 border border-accent/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="text-accent flex-shrink-0 mt-0.5" size={20} />
                    <div className="text-sm space-y-2">
                        <p className="text-accent font-medium">How to use RealFaviconGenerator.net:</p>
                        <ol className="list-decimal list-inside space-y-1 text-slate-300">
                            <li>Go to <a href="https://realfavicongenerator.net" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">realfavicongenerator.net</a></li>
                            <li>Upload your logo/icon image</li>
                            <li>Configure your favicon settings</li>
                            <li>In "Favicon Generator Options", set path to <code className="bg-slate-900/50 px-1.5 py-0.5 rounded text-accent">/favicon</code></li>
                            <li>Click "Generate your Favicons and HTML code"</li>
                            <li>Download the ZIP package and copy the HTML code</li>
                            <li>Upload both below</li>
                        </ol>
                    </div>
                </div>
            </div>

            {/* Current Status */}
            {currentFavicon?.htmlSnippet && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                    {/* Header with status */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            {faviconEnabled ? (
                                <>
                                    <CheckCircle size={16} className="text-green-400" />
                                    Custom Favicon Active
                                </>
                            ) : (
                                <>
                                    <AlertCircle size={16} className="text-slate-400" />
                                    Using Default Framerr Favicon
                                </>
                            )}
                        </h3>
                    </div>

                    {/* Toggle Switch */}
                    <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg mb-4">
                        <div>
                            <span className="text-white font-medium">Use Custom Favicon</span>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {faviconEnabled
                                    ? 'Custom favicon is currently active'
                                    : 'Using default Framerr favicon'}
                            </p>
                        </div>
                        <button
                            onClick={handleToggleFavicon}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${faviconEnabled ? 'bg-accent' : 'bg-slate-600'
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
                        <p className="text-xs text-slate-500 mb-3">
                            Uploaded by {currentFavicon.uploadedBy} on {new Date(currentFavicon.uploadedAt).toLocaleString()}
                        </p>
                    )}

                    {/* Delete button */}
                    {!showConfirmReset ? (
                        <button
                            onClick={handleResetClick}
                            disabled={resetting}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
                        >
                            <Trash2 size={14} />
                            {resetting ? 'Deleting...' : 'Delete Custom Favicon'}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                            <span className="text-sm text-slate-400">Are you sure?</span>
                            <button
                                onClick={handleConfirmReset}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Confirm
                            </button>
                            <button
                                onClick={handleCancelReset}
                                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Upload Form */}
            <div className="glass-subtle shadow-deep border border-slate-700 rounded-xl p-6 space-y-6">
                {/* File Upload */}
                <div>
                    <label className="block mb-2 font-medium text-slate-300 text-sm">
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
                            className="flex items-center justify-center gap-3 w-full px-6 py-8 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-accent hover:bg-slate-700/30 transition-colors"
                        >
                            <Upload size={24} className="text-slate-400" />
                            <div className="text-center">
                                {faviconFile ? (
                                    <>
                                        <p className="text-white font-medium">{faviconFile.name}</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {(faviconFile.size / 1024).toFixed(2)} KB
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-slate-300">Click to select ZIP file</p>
                                        <p className="text-xs text-slate-500 mt-1">or drag and drop</p>
                                    </>
                                )}
                            </div>
                        </label>
                    </div>
                </div>

                {/* HTML Snippet */}
                <div>
                    <label className="block mb-2 font-medium text-slate-300 text-sm flex items-center gap-2">
                        <span>2. Paste HTML Code from RealFaviconGenerator</span>
                        <LinkIcon size={14} className="text-slate-500" />
                    </label>
                    <textarea
                        value={htmlSnippet}
                        onChange={(e) => setHtmlSnippet(e.target.value)}
                        placeholder='<link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png">
...'
                        className="input-glow w-full h-32 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent transition-colors font-mono text-sm resize-none"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                        Copy the HTML code from Step 3 on RealFaviconGenerator.net
                    </p>
                </div>

                {/* Upload Button */}
                <button
                    onClick={handleUpload}
                    disabled={uploading || !faviconFile || !htmlSnippet}
                    className="button-elevated w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {uploading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <Upload size={18} />
                            Upload Favicon
                        </>
                    )}
                </button>
            </div>

            {/* Message Display */}
            {message && (
                <div className={`p-4 rounded-lg border ${message.type === 'success'
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
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
