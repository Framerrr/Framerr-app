import React, { useState, useEffect } from 'react';
import { Server, Cpu, HardDrive, Activity, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

const SystemSettings = () => {
    const [systemInfo, setSystemInfo] = useState(null);
    const [resources, setResources] = useState(null);
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        await Promise.all([
            fetchSystemInfo(),
            fetchResources(),
            fetchHealth()
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
            console.error('Failed to fetch system info:', error);
        }
    };

    const fetchResources = async () => {
        try {
            const response = await axios.get('/api/advanced/system/resources');
            if (response.data.success) {
                setResources(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch resources:', error);
        }
    };

    const fetchHealth = async () => {
        try {
            const response = await axios.get('/api/advanced/system/health');
            if (response.data.success) {
                setHealth(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch health:', error);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchAllData();
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

    const getHealthIcon = (status) => {
        return status === 'healthy' ? (
            <CheckCircle size={18} className="text-green-400" />
        ) : (
            <AlertCircle size={18} className="text-red-400" />
        );
    };

    if (loading) {
        return (
            <div className="text-center py-12 text-slate-400">
                <Activity className="mx-auto mb-4 animate-spin" size={48} />
                <p>Loading system information...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">System Information</h3>
                    <p className="text-slate-400 text-sm">
                        Monitor system resources and health status
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

            {/* System Info */}
            <div className="glass-card rounded-xl p-6">
                <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Server size={18} className="text-accent" />
                    System Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-slate-400 text-sm">App Version</p>
                        <p className="text-white font-medium">{systemInfo?.appVersion || 'Unknown'}</p>
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm">Node.js Version</p>
                        <p className="text-white font-medium">{systemInfo?.nodeVersion || 'Unknown'}</p>
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm">Platform</p>
                        <p className="text-white font-medium">{systemInfo?.platform || 'Unknown'} ({systemInfo?.arch || 'Unknown'})</p>
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm">Uptime</p>
                        <p className="text-white font-medium">
                            {systemInfo?.uptime ? formatUptime(systemInfo.uptime) : 'Unknown'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Resource Usage */}
            <div className="glass-card rounded-xl p-6">
                <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Cpu size={18} className="text-accent" />
                    Resource Usage
                </h4>

                {/* Memory */}
                <div className="mb-6">
                    <div className="flex justify-between mb-2">
                        <span className="text-slate-300 text-sm">Memory (Heap)</span>
                        <span className="text-white font-medium">
                            {resources?.memory?.heapUsed || 0} MB / {resources?.memory?.heapTotal || 0} MB
                        </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
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
                        <span className="text-slate-300 text-sm flex items-center gap-2">
                            <HardDrive size={16} />
                            Resident Set Size (RSS)
                        </span>
                        <span className="text-white font-medium">
                            {resources?.memory?.rss || 0} MB
                        </span>
                    </div>
                    <p className="text-slate-400 text-xs">
                        Total memory allocated to the process
                    </p>
                </div>
            </div>

            {/* Health Checks */}
            <div className="glass-card rounded-xl p-6">
                <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Activity size={18} className="text-accent" />
                    Health Checks
                </h4>
                <div className="space-y-3">
                    {health && Object.entries(health).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                            <div className="flex items-center gap-3">
                                {getHealthIcon(value.status)}
                                <div>
                                    <p className="text-white font-medium capitalize">{key}</p>
                                    <p className="text-slate-400 text-sm">{value.message}</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${value.status === 'healthy'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                {value.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SystemSettings;
