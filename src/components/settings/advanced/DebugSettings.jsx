import React, { useState, useEffect, useRef } from 'react';
import { Download, Trash2, Search, Bug, Play, Pause } from 'lucide-react';
import axios from 'axios';

const DebugSettings = () => {
    const [debugOverlay, setDebugOverlay] = useState(false);
    const [logLevel, setLogLevel] = useState('INFO');
    const [logs, setLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLevel, setFilterLevel] = useState('ALL');
    const [autoScroll, setAutoScroll] = useState(true);
    const [loading, setLoading] = useState(false);
    const logsEndRef = useRef(null);

    const logLevels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
    const filterLevels = ['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'];

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (autoScroll && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, autoScroll]);

    // Load settings and logs on mount
    useEffect(() => {
        fetchLogs();
        loadDebugSettings();
    }, []);

    const loadDebugSettings = async () => {
        try {
            const response = await axios.get('/api/system/config');
            console.log('[DEBUG TOGGLE] Full config response:', response.data.config);
            if (response.data.config?.debug) {
                console.log('[DEBUG TOGGLE] Debug section:', response.data.config.debug);
                setDebugOverlay(response.data.config.debug.overlayEnabled || false);
                // Load log level (uppercase for UI)
                const savedLevel = response.data.config.debug.logLevel;
                if (savedLevel) {
                    setLogLevel(savedLevel.toUpperCase());
                }
            } else {
                console.log('[DEBUG TOGGLE] No debug section in config');
            }
        } catch (error) {
            console.error('Failed to load debug settings:', error);
        }
    };

    const handleOverlayToggle = async (enabled) => {
        console.log('[DEBUG TOGGLE] Toggling overlay to:', enabled);
        setDebugOverlay(enabled);
        try {
            const response = await axios.put('/api/system/config', {
                debug: { overlayEnabled: enabled }
            });
            console.log('[DEBUG TOGGLE] Save response:', response.data);
            // Reload page to apply overlay changes to Dashboard
            window.location.reload();
        } catch (error) {
            console.error('Failed to save debug overlay setting:', error);
        }
    };

    const handleLogLevelChange = async (newLevel) => {
        setLogLevel(newLevel);
        try {
            await axios.post('/api/advanced/logs/level', {
                level: newLevel
            });
        } catch (error) {
            console.error('Failed to update log level:', error);
        }
    };

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/advanced/logs');
            if (response.data.success) {
                setLogs(response.data.logs || []);
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearLogs = async () => {
        if (!confirm('Clear all logs? This cannot be undone.')) return;

        try {
            await axios.post('/api/advanced/logs/clear');
            setLogs([]);
        } catch (error) {
            console.error('Failed to clear logs:', error);
        }
    };

    const handleDownloadLogs = async () => {
        try {
            const response = await axios.get('/api/advanced/logs/download', {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `framerr-logs-${new Date().toISOString()}.txt`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Failed to download logs:', error);
        }
    };


    // Filter logs based on search and level
    const filteredLogs = logs.filter(log => {
        const matchesSearch = searchTerm === '' ||
            (log.message && log.message.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesLevel = filterLevel === 'ALL' || log.level === filterLevel;
        return matchesSearch && matchesLevel;
    });

    const getLogLevelColor = (level) => {
        switch (level) {
            case 'ERROR': return 'text-red-400';
            case 'WARN': return 'text-yellow-400';
            case 'INFO': return 'text-blue-400';
            case 'DEBUG': return 'text-slate-400';
            default: return 'text-slate-300';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">Debug Settings</h3>
                <p className="text-slate-400 text-sm">
                    Control debug overlay and view system logs
                </p>
            </div>

            {/* Debug Overlay Toggle */}
            <div className="glass-card rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-white font-medium flex items-center gap-2">
                            <Bug size={18} className="text-accent" />
                            Dashboard Debug Overlay
                        </h4>
                        <p className="text-slate-400 text-sm mt-1">
                            Show grid layout and widget information on dashboard
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={debugOverlay}
                            onChange={(e) => handleOverlayToggle(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                </div>
            </div>

            {/* Log Level Control */}
            <div className="glass-card rounded-xl p-6">
                <h4 className="text-white font-medium mb-3">Log Level</h4>
                <p className="text-slate-400 text-sm mb-4">
                    Set minimum log level for system logging
                </p>
                <div className="flex gap-2">
                    {logLevels.map(level => (
                        <button
                            key={level}
                            onClick={() => handleLogLevelChange(level)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${logLevel === level
                                ? 'bg-accent text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            {level}
                        </button>
                    ))}
                </div>
            </div>

            {/* Log Viewer */}
            <div className="glass-card rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-medium">System Logs</h4>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setAutoScroll(!autoScroll)}
                            className={`button-elevated p-2 rounded-lg transition-all ${autoScroll ? 'bg-accent text-white' : 'bg-slate-700 text-slate-300'
                                }`}
                            title={autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
                        >
                            {autoScroll ? <Play size={16} /> : <Pause size={16} />}
                        </button>
                        <button
                            onClick={handleDownloadLogs}
                            className="button-elevated p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all"
                            title="Download logs"
                        >
                            <Download size={16} />
                        </button>
                        <button
                            onClick={handleClearLogs}
                            className="button-elevated p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                            title="Clear logs"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className="flex gap-2 mb-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent transition-colors"
                        />
                    </div>
                    <select
                        value={filterLevel}
                        onChange={(e) => setFilterLevel(e.target.value)}
                        className="px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
                    >
                        {filterLevels.map(level => (
                            <option key={level} value={level}>{level}</option>
                        ))}
                    </select>
                </div>

                {/* Logs Display */}
                <div className="bg-slate-900/50 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
                    {loading ? (
                        <div className="text-center text-slate-400 py-8">Loading logs...</div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center text-slate-400 py-8">
                            {logs.length === 0 ? 'No logs available' : 'No matching logs'}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredLogs.map((log, index) => (
                                <div key={index} className="flex gap-2 hover:bg-slate-800/50 px-2 py-1 rounded">
                                    <span className="text-slate-500 flex-shrink-0">
                                        {log.timestamp || new Date().toLocaleTimeString()}
                                    </span>
                                    <span className={`font-bold flex-shrink-0 ${getLogLevelColor(log.level)}`}>
                                        [{log.level || 'INFO'}]
                                    </span>
                                    <span className="text-slate-300 break-all">
                                        {log.message || 'Log message'}
                                    </span>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    )}
                </div>

                <div className="mt-4 text-sm text-slate-400 text-center">
                    Showing {filteredLogs.length} of {logs.length} logs
                </div>
            </div>
        </div>
    );
};

export default DebugSettings;
