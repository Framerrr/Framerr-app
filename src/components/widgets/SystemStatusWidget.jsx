import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Disc, Thermometer, Clock } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { motion, AnimatePresence } from 'framer-motion';
import logger from '../../utils/logger';
import { useAppData } from '../../context/AppDataContext';
import IntegrationDisabledMessage from '../common/IntegrationDisabledMessage';

// Metric Graph Popover Component
const MetricGraphPopover = ({ metric, value, icon: Icon, integration }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentRange, setCurrentRange] = useState('1h');
    const [chart, setChart] = useState(null);
    const [graphData, setGraphData] = useState([]);
    const [loading, setLoading] = useState(false);
    const canvasRef = useRef(null);

    // Metric display configuration
    const metricConfig = {
        cpu: { label: 'CPU', color: 'var(--accent)', unit: '%' },
        memory: { label: 'Memory', color: 'var(--info)', unit: '%' },
        temperature: { label: 'Temperature', color: 'var(--warning)', unit: '°C' }
    };

    const config = metricConfig[metric];

    // Fetch graph data when popover opens
    useEffect(() => {
        if (!isOpen) return;

        const fetchGraphData = async () => {
            setLoading(true);
            try {
                const backend = integration.backend || 'custom';
                const backendConfig = backend === 'glances'
                    ? integration.glances
                    : (integration.custom || { url: integration.url, token: integration.token });

                let endpoint = '';
                let params = new URLSearchParams();

                if (backend === 'glances') {
                    endpoint = '/api/systemstatus/glances/history';
                    params.append('url', backendConfig.url);
                    if (backendConfig.password) params.append('password', backendConfig.password);
                } else {
                    endpoint = '/api/systemstatus/history';
                    params.append('url', backendConfig.url);
                    if (backendConfig.token) params.append('token', backendConfig.token);
                }

                const res = await fetch(`${endpoint}?${params}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();

                setGraphData(Array.isArray(data) ? data : []);
            } catch (err) {
                logger.error('Graph data fetch error:', err);
                setGraphData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchGraphData();
    }, [isOpen, integration, metric]);

    // Render chart when data changes or range changes
    useEffect(() => {
        if (!isOpen || !canvasRef.current || graphData.length === 0 || !window.Chart) return;

        // Calculate time range
        const ranges = {
            '1h': 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '1d': 24 * 60 * 60 * 1000,
            '3d': 3 * 24 * 60 * 60 * 1000
        };

        const now = Date.now();
        const cutoff = now - ranges[currentRange];

        // Prepare data points
        const points = graphData
            .map(d => ({ x: new Date(d.time).getTime(), y: Number(d[metric]) }))
            .filter(p => p.x >= cutoff && Number.isFinite(p.y))
            .sort((a, b) => a.x - b.x);

        if (points.length === 0) return;

        // Destroy existing chart
        if (chart) {
            chart.destroy();
            setChart(null);
        }

        // Get theme colors
        const style = getComputedStyle(document.body);
        const textColor = style.getPropertyValue('--text-secondary').trim();
        const gridColor = 'rgba(255, 255, 255, 0.1)';

        // Configure time format based on range
        const timeFormats = {
            '1h': { unit: 'minute', displayFormats: { minute: 'h:mm a' } },
            '6h': { unit: 'hour', displayFormats: { hour: 'h a' } },
            '1d': { unit: 'hour', displayFormats: { hour: 'ha' } },
            '3d': { unit: 'day', displayFormats: { day: 'MMM d' } }
        };

        const timeConfig = timeFormats[currentRange];

        // Create new chart
        const newChart = new window.Chart(canvasRef.current, {
            type: 'line',
            data: {
                datasets: [{
                    label: config.label,
                    data: points,
                    borderColor: config.color,
                    backgroundColor: `${config.color}33`,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    x: {
                        type: 'time',
                        time: timeConfig,
                        min: cutoff,
                        max: now,
                        ticks: {
                            color: textColor,
                            maxRotation: 0,
                            autoSkipPadding: 20
                        },
                        grid: { color: gridColor, display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            callback: (value) => `${value}${config.unit}`
                        },
                        grid: { color: gridColor }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: config.color,
                        borderWidth: 1,
                        callbacks: {
                            label: (context) => `${config.label}: ${context.parsed.y.toFixed(1)}${config.unit}`
                        }
                    }
                }
            }
        });

        setChart(newChart);

        return () => {
            if (newChart) newChart.destroy();
        };
    }, [isOpen, graphData, currentRange, metric, config, chart]);

    // Cleanup chart on close
    useEffect(() => {
        if (!isOpen && chart) {
            chart.destroy();
            setChart(null);
        }
    }, [isOpen, chart]);

    const getColor = (val) => {
        if (val < 50) return 'var(--success)';
        if (val < 80) return 'var(--warning)';
        return 'var(--error)';
    };

    return (
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
            <Popover.Trigger asChild>
                <div className="cursor-pointer group">
                    <div className="flex justify-between mb-1 text-sm text-theme-primary group-hover:text-accent transition-colors">
                        <span className="flex items-center gap-1.5">
                            <Icon size={14} />
                            {config.label}
                        </span>
                        <span>{value.toFixed(metric === 'temperature' ? 0 : 1)}{config.unit}</span>
                    </div>
                    <div className="w-full h-1.5 bg-theme-tertiary rounded-full overflow-hidden">
                        <div
                            style={{
                                width: `${metric === 'temperature' ? Math.min(value, 100) : value}%`,
                                backgroundColor: getColor(value)
                            }}
                            className="h-full rounded-full transition-all duration-300"
                        />
                    </div>
                </div>
            </Popover.Trigger>

            <AnimatePresence>
                {isOpen && (
                    <Popover.Portal forceMount>
                        <Popover.Content
                            side="bottom"
                            align="center"
                            sideOffset={8}
                            collisionPadding={24}
                            asChild
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{ type: 'spring', stiffness: 220, damping: 30 }}
                                className="glass-card border-theme rounded-xl shadow-2xl p-4 z-[9999]"
                                style={{ width: '400px', maxWidth: '90vw' }}
                            >
                                <Popover.Arrow className="fill-current text-theme-secondary" />

                                {/* Header */}
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-sm font-semibold text-theme-primary">
                                        {config.label} History
                                    </h3>
                                    {/* Range selector */}
                                    <div className="flex gap-1">
                                        {['1h', '6h', '1d', '3d'].map((range) => (
                                            <button
                                                key={range}
                                                onClick={() => setCurrentRange(range)}
                                                className={`text-xs px-2 py-1 rounded transition-all ${currentRange === range
                                                    ? 'bg-accent text-white'
                                                    : 'bg-theme-tertiary text-theme-secondary hover:text-theme-primary'
                                                    }`}
                                            >
                                                {range}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Chart */}
                                <div style={{ height: '200px', position: 'relative' }}>
                                    {loading ? (
                                        <div className="absolute inset-0 flex items-center justify-center text-theme-secondary text-sm">
                                            Loading...
                                        </div>
                                    ) : graphData.length === 0 ? (
                                        <div className="absolute inset-0 flex items-center justify-center text-theme-secondary text-sm">
                                            No historical data available
                                        </div>
                                    ) : (
                                        <canvas ref={canvasRef} />
                                    )}
                                </div>
                            </motion.div>
                        </Popover.Content>
                    </Popover.Portal>
                )}
            </AnimatePresence>
        </Popover.Root>
    );
};

const SystemStatusWidget = ({ config }) => {
    // Get integrations state from context
    const { integrations } = useAppData();
    const integration = integrations?.systemstatus;

    // Check if integration is enabled
    const isIntegrationEnabled = integration?.enabled && (
        (integration.backend === 'glances' && integration.glances?.url) ||
        (integration.backend === 'custom' && integration.custom?.url) ||
        (!integration.backend && integration.url) // Legacy format support
    );

    // Extract config with defaults
    const { enabled = false, url = '', token = '' } = config || {};
    const [statusData, setStatusData] = useState({ cpu: 0, memory: 0, temperature: 0, uptime: '--' });
    const [loading, setLoading] = useState(true);

    // Fetch status data - only when integration is enabled
    useEffect(() => {
        if (!isIntegrationEnabled) {
            // Integration disabled - don't fetch
            setLoading(false);
            return;
        }

        const fetchStatus = async () => {
            try {
                // Get backend and config from integration
                const backend = integration.backend || 'custom';
                const backendConfig = backend === 'glances'
                    ? integration.glances
                    : (integration.custom || { url: integration.url, token: integration.token });

                // Build endpoint based on backend
                let endpoint = '';
                let params = new URLSearchParams();

                if (backend === 'glances') {
                    endpoint = '/api/systemstatus/glances/status';
                    params.append('url', backendConfig.url);
                    if (backendConfig.password) params.append('password', backendConfig.password);
                } else {
                    endpoint = '/api/systemstatus/status';
                    params.append('url', backendConfig.url);
                    if (backendConfig.token) params.append('token', backendConfig.token);
                }

                const res = await fetch(`${endpoint}?${params}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                setStatusData({
                    cpu: data.cpu || 0,
                    memory: data.memory || 0,
                    temperature: data.temperature || 0,
                    uptime: data.uptime || '--'
                });
                setLoading(false);
            } catch (e) {
                logger.error('Status fetch error:', e);
                setLoading(false);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 2000);
        return () => clearInterval(interval);
    }, [isIntegrationEnabled, integration]);

    // Load Chart.js dynamically
    useEffect(() => {
        if (!window.Chart) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.js';
            script.async = true;
            script.onload = () => {
                // Load Chart.js date adapter
                const adapterScript = document.createElement('script');
                adapterScript.src = 'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js';
                adapterScript.async = true;
                document.head.appendChild(adapterScript);
            };
            document.head.appendChild(script);
        }
    }, []);

    // Show integration disabled message if not enabled
    if (!isIntegrationEnabled) {
        return <IntegrationDisabledMessage serviceName="System Health" />;
    }

    // Show loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-theme-secondary">
                Loading system status...
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 p-3 h-full justify-around">
            {/* CPU */}
            <MetricGraphPopover
                metric="cpu"
                value={statusData.cpu}
                icon={Activity}
                integration={integration}
            />

            {/* Memory */}
            <MetricGraphPopover
                metric="memory"
                value={statusData.memory}
                icon={Disc}
                integration={integration}
            />

            {/* Temperature */}
            <MetricGraphPopover
                metric="temperature"
                value={statusData.temperature}
                icon={Thermometer}
                integration={integration}
            />

            {/* Uptime (no graph) */}
            <div>
                <div className="flex justify-between mb-1 text-sm text-theme-primary">
                    <span className="flex items-center gap-1.5">
                        <Clock size={14} />
                        Uptime
                    </span>
                    <span className="text-xs">{statusData.uptime}</span>
                </div>
            </div>
        </div>
    );
};

export default SystemStatusWidget;
