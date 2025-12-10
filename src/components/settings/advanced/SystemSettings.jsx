import React, { useState, useEffect } from 'react';
import { Server, Cpu, HardDrive, Activity, RefreshCw, CheckCircle, AlertCircle, Database, Wifi, Zap, Loader, Download, Upload, Clock, XCircle } from 'lucide-react';
import axios from 'axios';
import logger from '../../../utils/logger';

const SystemSettings = () => {
    // System Information state
    const [systemInfo, setSystemInfo] = useState(null);
    const [resources, setResources] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Diagnostics state
    const [health, setHealth] = useState(null);
    const [dbStatus, setDbStatus] = useState(null);
    const [dbLoading, setDbLoading] = useState(false);
    const [speedTest, setSpeedTest] = useState({
        running: false,
        latency: null,
        download: null,
        upload: null,
        stage: null
    });
    const [apiHealth, setApiHealth] = useState(null);
    const [apiLoading, setApiLoading] = useState(false);

    useEffect(() => {
        fetchSystemData();
        testApiHealth();
    }, []);

    // ========================================================================
    // SYSTEM INFORMATION
    // ========================================================================

    const fetchSystemData = async () => {
        setLoading(true);
        await Promise.all([
            fetchSystemInfo(),
            fetchResources()
        ]);
        setLoading(false);
    };

    const fetchSystemInfo = async () => {
        try {
            const response = await axios.get('/api/advanced/system/info');
            if (response.data.success) {
                setSystemInfo(response.data.data);
            }
        } catch (error) {
            logger.error('Failed to fetch system info:', error);
        }
    };

    const fetchResources = async () => {
        try {
            const response = await axios.get('/api/advanced/system/resources');
            if (response.data.success) {
                setResources(response.data.data);
            }
        } catch (error) {
            logger.error('Failed to fetch resources:', error);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchSystemData();
        setRefreshing(false);
    };

    const formatUptime = (seconds) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);

        return parts.join(' ') || '< 1m';
    };

    // ========================================================================
    // DIAGNOSTICS - SYSTEM HEALTH
    // ========================================================================

    const fetchHealth = async () => {
        try {
            const response = await axios.get('/api/advanced/system/health');
            if (response.data.success) {
                setHealth(response.data.data);
            }
        } catch (error) {
            logger.error('Failed to fetch health:', error);
        }
    };

    // ========================================================================
    // DIAGNOSTICS - DATABASE TEST
    // ========================================================================

    const testDatabase = async () => {
        setDbLoading(true);
        try {
            const response = await axios.get('/api/diagnostics/database');
            setDbStatus(response.data);
        } catch (error) {
            setDbStatus({
                success: false,
                status: 'error',
                error: error.message
            });
        } finally {
            setDbLoading(false);
        }
    };

    // ========================================================================
    // DIAGNOSTICS - SPEED TEST
    // ========================================================================

    const runSpeedTest = async () => {
        setSpeedTest({ running: true, latency: null, download: null, upload: null, stage: 'latency' });

        try {
            // 1. LATENCY TEST (10 pings)
            const pings = [];
            for (let i = 0; i < 10; i++) {
                const start = Date.now();
                await axios.get('/api/diagnostics/ping');
                pings.push(Date.now() - start);
            }
            const avgLatency = Math.round(pings.reduce((a, b) => a + b, 0) / pings.length);
            setSpeedTest(prev => ({ ...prev, latency: avgLatency, stage: 'download' }));

            // 2. DOWNLOAD TEST (5MB)
            const downloadStart = Date.now();
            const downloadResponse = await axios.post('/api/diagnostics/download', { size: 5 }, {
                responseType: 'blob'
            });
            const downloadTime = (Date.now() - downloadStart) / 1000;
            const downloadBytes = downloadResponse.data.size;
            const downloadMbps = ((downloadBytes * 8) / downloadTime / 1000000).toFixed(2);
            setSpeedTest(prev => ({ ...prev, download: downloadMbps, stage: 'upload' }));

            // 3. UPLOAD TEST (5MB)
            const uploadData = { data: 'x'.repeat(5 * 1024 * 1024) };
            const uploadStart = Date.now();
            await axios.post('/api/diagnostics/upload', uploadData);
            const uploadTime = (Date.now() - uploadStart) / 1000;
            const uploadBytes = JSON.stringify(uploadData).length;
            const uploadMbps = ((uploadBytes * 8) / uploadTime / 1000000).toFixed(2);

            setSpeedTest({
                running: false,
                latency: avgLatency,
                download: downloadMbps,
                upload: uploadMbps,
                stage: null
            });
        } catch (error) {
            logger.error('Speed test failed:', error);
            setSpeedTest({ running: false, latency: null, download: null, upload: null, stage: null });
        }
    };

    // ========================================================================
    // DIAGNOSTICS - API HEALTH
    // ========================================================================

    const testApiHealth = async () => {
        setApiLoading(true);
        try {
            const response = await axios.get('/api/diagnostics/api-health');
            setApiHealth(response.data);
        } catch (error) {
            setApiHealth({
                success: false,
                overallStatus: 'error',
                error: error.message
            });
        } finally {
            setApiLoading(false);
        }
    };

    const handleRefreshDiagnostics = async () => {
        await Promise.all([
            fetchHealth(),
            testApiHealth()
        ]);
    };

    // ========================================================================
    // RENDER HELPERS
    // ========================================================================

    const getHealthIcon = (status) => {
        return status === 'healthy' ? (
            <CheckCircle size={18} className="text-success" />
        ) : (
            <AlertCircle size={18} className="text-error" />
        );
    };

    const getStatusIcon = (status) => {
        if (status === 'healthy') return <CheckCircle size={18} className="text-success" />;
        if (status === 'error') return <XCircle size={18} className="text-error" />;
        return <Loader size={18} className="text-warning animate-spin" />;
    };

    const getStatusColor = (status) => {
        if (status === 'healthy') return 'bg-success/20 text-success';
        if (status === 'error') return 'bg-error/20 text-error';
        return 'bg-warning/20 text-warning';
    };

    if (loading) {
        return (
            <div className="text-center py-12 text-theme-secondary">
                <Activity className="mx-auto mb-4 animate-spin" size={48} />
                <p>Loading system information...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* ================================================================ */}
            {/* SECTION 1: INFORMATION */}
            {/* ================================================================ */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                        <h3 className="text-xl font-bold text-theme-primary mb-2">System Information</h3>
                        <p className="text-theme-secondary text-sm">
                            View system details and resource usage
                        </p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="button-elevated p-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg transition-all"
                        title="Refresh data"
                    >
                        <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* System Details */}
                <div className="glass-subtle rounded-xl p-6 border border-theme">
                    <h4 className="text-theme-primary font-medium mb-4 flex items-center gap-2">
                        <Server size={18} className="text-accent" />
                        System Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-theme-secondary text-sm">App Version</p>
                            <p className="text-theme-primary font-medium">{systemInfo?.appVersion || 'Unknown'}</p>
                        </div>
                        <div>
                            <p className="text-theme-secondary text-sm">Node.js Version</p>
                            <p className="text-theme-primary font-medium">{systemInfo?.nodeVersion || 'Unknown'}</p>
                        </div>
                        <div>
                            <p className="text-theme-secondary text-sm">Platform</p>
                            <p className="text-theme-primary font-medium">{systemInfo?.platform || 'Unknown'} ({systemInfo?.arch || 'Unknown'})</p>
                        </div>
                        <div>
                            <p className="text-theme-secondary text-sm">Uptime</p>
                            <p className="text-theme-primary font-medium">
                                {systemInfo?.uptime ? formatUptime(systemInfo.uptime) : 'Unknown'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Resource Usage */}
                <div className="glass-subtle rounded-xl p-6 border border-theme">
                    <h4 className="text-theme-primary font-medium mb-4 flex items-center gap-2">
                        <Cpu size={18} className="text-accent" />
                        Resource Usage
                    </h4>

                    {/* Memory */}
                    <div className="mb-6">
                        <div className="flex justify-between mb-2">
                            <span className="text-theme-secondary text-sm">Memory (Heap)</span>
                            <span className="text-theme-primary font-medium">
                                {resources?.memory?.heapUsed || 0} MB / {resources?.memory?.heapTotal || 0} MB
                            </span>
                        </div>
                        <div className="h-2 bg-theme-tertiary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-accent transition-all duration-300"
                                style={{
                                    width: `${resources?.memory ? (resources.memory.heapUsed / resources.memory.heapTotal * 100) : 0}%`
                                }}
                            />
                        </div>
                    </div>

                    {/* RSS */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="text-theme-secondary text-sm flex items-center gap-2">
                                <HardDrive size={16} />
                                Resident Set Size (RSS)
                            </span>
                            <span className="text-theme-primary font-medium">
                                {resources?.memory?.rss || 0} MB
                            </span>
                        </div>
                        <p className="text-theme-tertiary text-xs">
                            Total memory allocated to the process
                        </p>
                    </div>
                </div>
            </div>

            {/* ================================================================ */}
            {/* SECTION 2: DIAGNOSTICS */}
            {/* ================================================================ */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                        <h3 className="text-xl font-bold text-theme-primary mb-2">Diagnostics & Health</h3>
                        <p className="text-theme-secondary text-sm">
                            Test connections, verify API health, and monitor system status
                        </p>
                    </div>
                    <button
                        onClick={handleRefreshDiagnostics}
                        className="button-elevated p-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg transition-all"
                        title="Refresh diagnostics"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>

                {/* System Health Checks */}
                <div className="glass-subtle rounded-xl p-6 border border-theme">
                    <h4 className="text-theme-primary font-medium mb-4 flex items-center gap-2">
                        <Activity size={18} className="text-accent" />
                        System Health
                    </h4>
                    {health ? (
                        <div className="space-y-3">
                            {Object.entries(health).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between p-3 bg-theme-tertiary/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        {getHealthIcon(value.status)}
                                        <div>
                                            <p className="text-theme-primary font-medium capitalize">{key}</p>
                                            <p className="text-theme-secondary text-sm">{value.message}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${value.status === 'healthy'
                                        ? 'bg-success/20 text-success'
                                        : 'bg-error/20 text-error'
                                        }`}>
                                        {value.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <button
                            onClick={fetchHealth}
                            className="button-elevated px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg transition-all"
                        >
                            Run Health Check
                        </button>
                    )}
                </div>

                {/* Database Test */}
                <div className="glass-subtle rounded-xl p-6 border border-theme">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-theme-primary font-medium flex items-center gap-2">
                            <Database size={18} className="text-accent" />
                            Database Connection
                        </h4>
                        <button
                            onClick={testDatabase}
                            disabled={dbLoading}
                            className="button-elevated px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg transition-all disabled:opacity-50"
                        >
                            {dbLoading ? 'Testing...' : 'Test Database'}
                        </button>
                    </div>
                    {dbStatus && (
                        <div className="bg-theme-tertiary rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-3">
                                {getStatusIcon(dbStatus.status)}
                                <div>
                                    <p className="text-theme-primary font-medium capitalize">{dbStatus.status}</p>
                                    <p className="text-theme-secondary text-sm">
                                        Latency: {dbStatus.latency}ms
                                    </p>
                                </div>
                            </div>
                            {dbStatus.details && (
                                <div className="text-sm text-theme-secondary space-y-1">
                                    <p>Path: {dbStatus.details.path}</p>
                                    <p>Size: {dbStatus.details.sizeKB} KB</p>
                                </div>
                            )}
                            {dbStatus.error && (
                                <p className="text-error text-sm mt-2">{dbStatus.error}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Speed Test */}
                <div className="glass-subtle rounded-xl p-6 border border-theme">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h4 className="text-theme-primary font-medium flex items-center gap-2">
                                <Wifi size={18} className="text-accent" />
                                Network Speed Test
                            </h4>
                            <p className="text-theme-secondary text-sm mt-1">
                                Test connection speed from your device to this server
                            </p>
                        </div>
                        <button
                            onClick={runSpeedTest}
                            disabled={speedTest.running}
                            className="button-elevated px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg transition-all disabled:opacity-50"
                        >
                            {speedTest.running ? 'Testing...' : 'Start Test'}
                        </button>
                    </div>

                    {speedTest.running && (
                        <div className="bg-theme-tertiary rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-3">
                                <Loader size={20} className="animate-spin text-accent" />
                                <p className="text-theme-primary">
                                    {speedTest.stage === 'latency' && 'Measuring latency...'}
                                    {speedTest.stage === 'download' && 'Testing download speed...'}
                                    {speedTest.stage === 'upload' && 'Testing upload speed...'}
                                </p>
                            </div>
                        </div>
                    )}

                    {(speedTest.latency !== null || speedTest.download !== null || speedTest.upload !== null) && !speedTest.running && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Latency */}
                            <div className="bg-theme-tertiary rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock size={16} className="text-info" />
                                    <span className="text-theme-secondary text-sm">Latency</span>
                                </div>
                                <p className="text-2xl font-bold text-theme-primary">{speedTest.latency} <span className="text-base text-theme-secondary">ms</span></p>
                            </div>

                            {/* Download */}
                            <div className="bg-theme-tertiary rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Download size={16} className="text-success" />
                                    <span className="text-theme-secondary text-sm">Download</span>
                                </div>
                                <p className="text-2xl font-bold text-theme-primary">{speedTest.download} <span className="text-base text-theme-secondary">Mbps</span></p>
                            </div>

                            {/* Upload */}
                            <div className="bg-theme-tertiary rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Upload size={16} className="text-warning" />
                                    <span className="text-theme-secondary text-sm">Upload</span>
                                </div>
                                <p className="text-2xl font-bold text-theme-primary">{speedTest.upload} <span className="text-base text-theme-secondary">Mbps</span></p>
                            </div>
                        </div>
                    )}
                </div>

                {/* API Health */}
                <div className="glass-subtle rounded-xl p-6 border border-theme">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-theme-primary font-medium flex items-center gap-2">
                            <Zap size={18} className="text-accent" />
                            API Health Checks
                        </h4>
                        <button
                            onClick={testApiHealth}
                            disabled={apiLoading}
                            className="button-elevated px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg transition-all disabled:opacity-50"
                        >
                            {apiLoading ? 'Testing...' : 'Refresh'}
                        </button>
                    </div>

                    {apiLoading && (
                        <div className="text-center py-8">
                            <Loader size={40} className="mx-auto mb-4 animate-spin text-accent" />
                            <p className="text-theme-secondary">Testing API endpoints...</p>
                        </div>
                    )}

                    {apiHealth && !apiLoading && (
                        <div className="space-y-3">
                            {/* Overall Status */}
                            <div className={`p-3 rounded-lg flex items-center gap-3 ${getStatusColor(apiHealth.overallStatus)}`}>
                                {getStatusIcon(apiHealth.overallStatus)}
                                <span className="font-medium capitalize">Overall: {apiHealth.overallStatus}</span>
                            </div>

                            {/* Individual Endpoints */}
                            {apiHealth.endpoints?.map((endpoint, index) => (
                                <div key={index} className="bg-theme-tertiary rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {getStatusIcon(endpoint.status)}
                                            <div>
                                                <p className="text-theme-primary font-medium">{endpoint.name}</p>
                                                <p className="text-theme-secondary text-sm">{endpoint.path}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(endpoint.status)}`}>
                                                {endpoint.status}
                                            </span>
                                            <p className="text-theme-secondary text-sm mt-1">{endpoint.responseTime}ms</p>
                                        </div>
                                    </div>
                                    {endpoint.error && (
                                        <p className="text-error text-sm mt-2">{endpoint.error}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SystemSettings;
