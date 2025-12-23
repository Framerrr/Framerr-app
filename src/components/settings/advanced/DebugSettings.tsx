import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Download, Trash2, Search, Bug, Play, Pause, Check, X } from 'lucide-react';
import axios from 'axios';
import logger from '../../../utils/logger';
import { Button } from '../../common/Button';
import { Input } from '../../common/Input';

type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
type FilterLevel = 'ALL' | LogLevel;

interface LogEntry {
    timestamp?: string;
    level?: string;
    message?: string;
    [key: string]: unknown;
}

interface SystemConfigResponse {
    config?: {
        debug?: {
            overlayEnabled?: boolean;
            logLevel?: string;
        };
    };
}

interface LogsResponse {
    success: boolean;
    logs?: LogEntry[];
}

const DebugSettings = (): React.JSX.Element => {
    const [debugOverlay, setDebugOverlay] = useState<boolean>(false);
    const [logLevel, setLogLevel] = useState<LogLevel>('INFO');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filterLevel, setFilterLevel] = useState<FilterLevel>('ALL');
    const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);
    const [confirmClear, setConfirmClear] = useState<boolean>(false);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const logsContainerRef = useRef<HTMLDivElement>(null);

    const logLevels: LogLevel[] = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
    const filterLevels: FilterLevel[] = ['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'];

    // Auto-scroll logs to bottom when new logs arrive
    useEffect(() => {
        if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
    }, [logs]);

    // Load settings and logs on mount + auto-refresh
    useEffect(() => {
        fetchLogs();
        loadDebugSettings();

        if (autoRefresh) {
            const interval = setInterval(() => {
                fetchLogs();
            }, 2000);
            return () => clearInterval(interval);
        }
        return undefined;
    }, [autoRefresh]);

    const loadDebugSettings = async (): Promise<void> => {
        try {
            const response = await axios.get<SystemConfigResponse>('/api/system/config');
            logger.debug('[DEBUG TOGGLE] Full config response:', response.data.config);

            if (response.data.config?.debug) {
                logger.debug('[DEBUG TOGGLE] Debug section:', response.data.config.debug);
                setDebugOverlay(response.data.config.debug.overlayEnabled || false);

                const savedLevel = response.data.config.debug.logLevel;
                if (savedLevel) {
                    setLogLevel(savedLevel.toUpperCase() as LogLevel);
                }
            } else {
                logger.debug('[DEBUG TOGGLE] No debug section in config');
            }
        } catch (error) {
            logger.error('Failed to load debug settings:', { error });
        }
    };

    const handleOverlayToggle = async (enabled: boolean): Promise<void> => {
        logger.debug('[DEBUG TOGGLE] Toggling overlay to:', enabled);
        setDebugOverlay(enabled);

        try {
            const response = await axios.put('/api/system/config', {
                debug: { overlayEnabled: enabled }
            });
            logger.debug('[DEBUG TOGGLE] Save response:', response.data);
            window.location.reload();
        } catch (error) {
            logger.error('Failed to save debug overlay setting:', { error });
        }
    };

    const handleLogLevelChange = async (newLevel: LogLevel): Promise<void> => {
        setLogLevel(newLevel);
        try {
            await axios.post('/api/advanced/logs/level', {
                level: newLevel
            });
        } catch (error) {
            logger.error('Failed to update log level:', { error });
        }
    };

    const fetchLogs = async (): Promise<void> => {
        try {
            const response = await axios.get<LogsResponse>('/api/advanced/logs');
            if (response.data.success) {
                const newLogs = response.data.logs || [];
                if (JSON.stringify(newLogs) !== JSON.stringify(logs)) {
                    setLogs(newLogs);
                }
            }
        } catch (error) {
            logger.error('Failed to fetch logs:', { error });
        }
    };

    const handleClearLogs = async (): Promise<void> => {
        try {
            await axios.post('/api/advanced/logs/clear');
            setLogs([]);
            setConfirmClear(false);
        } catch (error) {
            logger.error('Failed to clear logs:', { error });
            setConfirmClear(false);
        }
    };

    const handleDownloadLogs = async (): Promise<void> => {
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
            logger.error('Failed to download logs:', { error });
        }
    };

    // Filter logs based on search and level
    const filteredLogs = logs.filter(log => {
        const matchesSearch = searchTerm === '' ||
            (log.message && log.message.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesLevel = filterLevel === 'ALL' || log.level === filterLevel;
        return matchesSearch && matchesLevel;
    });

    const getLogLevelColor = (level: string | undefined): string => {
        switch (level) {
            case 'ERROR': return 'text-error';
            case 'WARN': return 'text-warning';
            case 'INFO': return 'text-info';
            case 'DEBUG': return 'text-theme-secondary';
            default: return 'text-theme-tertiary';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h3 className="text-xl font-bold text-theme-primary mb-2">Debug Settings</h3>
                <p className="text-theme-secondary text-sm">
                    Control debug overlay and view system logs
                </p>
            </div>

            {/* Debug Overlay Toggle */}
            <div className="glass-subtle rounded-xl p-6 border border-theme">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-theme-primary font-medium flex items-center gap-2">
                            <Bug size={18} className="text-accent" />
                            Dashboard Debug Overlay
                        </h4>
                        <p className="text-theme-secondary text-sm mt-1">
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
                        <div className="w-11 h-6 bg-theme-primary border border-theme peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-theme after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-checked:border-accent"></div>
                    </label>
                </div>
            </div>

            {/* Log Level Control */}
            <div className="glass-subtle rounded-xl p-6 border border-theme">
                <h4 className="text-theme-primary font-medium mb-3">Log Level</h4>
                <p className="text-theme-secondary text-sm mb-4">
                    Set minimum log level for system logging
                </p>
                <div className="flex flex-wrap gap-2">
                    {logLevels.map(level => (
                        <button
                            key={level}
                            onClick={() => handleLogLevelChange(level)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${logLevel === level
                                ? 'bg-accent text-white'
                                : 'bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary/80'
                                }`}
                        >
                            {level}
                        </button>
                    ))}
                </div>
            </div>

            {/* Log Viewer */}
            <div className="glass-subtle rounded-xl p-6 border border-theme">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-theme-primary font-medium">System Logs</h4>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            variant={autoRefresh ? 'primary' : 'secondary'}
                            size="sm"
                            icon={autoRefresh ? Play : Pause}
                            title={autoRefresh ? 'Auto-refresh ON (2s)' : 'Auto-refresh OFF'}
                        />
                        <Button
                            onClick={handleDownloadLogs}
                            variant="secondary"
                            size="sm"
                            icon={Download}
                            title="Download logs"
                        />
                        {!confirmClear ? (
                            <Button
                                onClick={() => setConfirmClear(true)}
                                variant="danger"
                                size="sm"
                                icon={Trash2}
                                title="Clear logs"
                            />
                        ) : (
                            <div className="flex items-center gap-1">
                                <Button
                                    onClick={handleClearLogs}
                                    variant="danger"
                                    size="sm"
                                    icon={Check}
                                    title="Confirm clear"
                                />
                                <Button
                                    onClick={() => setConfirmClear(false)}
                                    variant="secondary"
                                    size="sm"
                                    icon={X}
                                    title="Cancel"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Search and Filter */}
                <div className="flex gap-2 mb-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                            icon={Search}
                            className="mb-0"
                        />
                    </div>
                    <select
                        value={filterLevel}
                        onChange={(e) => setFilterLevel(e.target.value as FilterLevel)}
                        className="px-4 py-2 bg-theme-tertiary border border-theme rounded-lg text-theme-primary focus:outline-none focus:border-accent transition-colors"
                    >
                        {filterLevels.map(level => (
                            <option key={level} value={level}>{level}</option>
                        ))}
                    </select>
                </div>

                {/* Logs Display */}
                <div ref={logsContainerRef} className="bg-theme-tertiary rounded-lg p-4 h-96 overflow-y-auto overflow-x-auto scroll-contain-x font-mono text-[10px] min-[515px]:text-xs sm:text-sm border border-theme">
                    {loading ? (
                        <div className="text-center text-theme-secondary py-8">Loading logs...</div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center text-theme-secondary py-8">
                            {logs.length === 0 ? 'No logs available' : 'No matching logs'}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredLogs.map((log, index) => (
                                <div key={index} className="flex flex-wrap gap-0.5 min-[515px]:gap-1 sm:gap-2 hover:bg-theme-surface px-0.5 min-[515px]:px-1 sm:px-2 py-1 rounded min-w-0 transition-colors">
                                    <span className="text-theme-tertiary flex-shrink-0">
                                        {log.timestamp || new Date().toLocaleTimeString()}
                                    </span>
                                    <span className={`font-bold flex-shrink-0 ${getLogLevelColor(log.level)}`}>
                                        [{log.level || 'INFO'}]
                                    </span>
                                    <span className="text-theme-secondary break-words min-w-0 flex-1">
                                        {log.message || 'Log message'}
                                        {(() => {
                                            const metadataKeys = Object.keys(log).filter(
                                                key => !['timestamp', 'level', 'message'].includes(key)
                                            );
                                            if (metadataKeys.length > 0) {
                                                return (
                                                    <span className="text-theme-tertiary italic ml-2">
                                                        [metadata obfuscated for security]
                                                    </span>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </span>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    )}
                </div>

                <div className="mt-4 text-sm text-theme-secondary text-center">
                    Showing {filteredLogs.length} of {logs.length} logs
                </div>
            </div>
        </div>
    );
};

export default DebugSettings;
