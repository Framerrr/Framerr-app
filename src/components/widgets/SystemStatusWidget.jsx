import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Disc, Clock, X } from 'lucide-react';
import logger from '../../utils/logger';
const SystemStatusWidget = ({ config }) => {
    // Extract config with defaults
    const { enabled = false, url = '', token = '' } = config || {};
    const [statusData, setStatusData] = useState({ cpu: 0, memory: 0, temperature: 0, uptime: '--' });
    const [showModal, setShowModal] = useState(false);
    const [currentMetric, setCurrentMetric] = useState('cpu');
    const [currentRange, setCurrentRange] = useState('1h');
    const [chart, setChart] = useState(null);
    const canvasRef = useRef(null);
    const modalRef = useRef(null);
    // Fetch status data
    useEffect(() => {
        if (!enabled || !url) return;
        const fetchStatus = async () => {
            try {
                // Use proxy route instead of direct fetch
                const res = await fetch(`/api/systemstatus/status?url=${encodeURIComponent(url)}&token=${encodeURIComponent(token || '')}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                setStatusData({
                    cpu: data.cpu || 0,
                    memory: data.memory || 0,
                    temperature: data.temperature || 0,
                    uptime: data.uptime || '--'
                });
            } catch (e) {
                logger.error('Status fetch error:', e);
            }
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 2000);
        return () => clearInterval(interval);
    }, [enabled, url, token]);
    // Load Chart.js dynamically
    useEffect(() => {
        if (!window.Chart) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.js';
            script.async = true;
            document.head.appendChild(script);
        }
    }, []);
    const getColor = (v) => {
        return v < 50 ? 'var(--success)' : v < 75 ? 'var(--warning)' : 'var(--error)';
    };
    const renderGraph = useCallback(async (metric, range) => {
        if (!window.Chart || !canvasRef.current || !url) return;
        try {
            // Use proxy route instead of direct fetch
            const res = await fetch(`/api/systemstatus/history?url=${encodeURIComponent(url)}&token=${encodeURIComponent(token || '')}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const now = Date.now();
            const msMap = { '1h': 3600e3, '6h': 21600e3, '1d': 86400e3, '3d': 259200e3 };
            const ms = msMap[range] || 86400e3;
            const cutoff = now - ms;
            const points = data
                .map(d => ({ x: new Date(d.time).getTime(), y: Number(d[metric]) }))
                .filter(p => p.x >= cutoff && Number.isFinite(p.y));
            if (chart) chart.destroy();
            // Get theme colors from computed styles
            const style = getComputedStyle(document.body);
            const accentColor = style.getPropertyValue('--accent').trim();
            const textColor = style.getPropertyValue('--text-secondary').trim();
            const gridColor = 'rgba(255, 255, 255, 0.1)';
            const newChart = new window.Chart(canvasRef.current, {
                type: 'line',
                data: {
                    datasets: [{
                        label: metric.toUpperCase(),
                        data: points,
                        borderColor: accentColor,
                        backgroundColor: 'rgba(108, 79, 143, 0.2)', // Keep this for now or use accent with opacity
                        fill: true,
                        tension: 0.4,
                        pointRadius: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            type: 'linear',
                            min: cutoff,
                            max: now,
                            ticks: {
                                color: textColor,
                                callback: (v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            },
                            grid: { color: gridColor }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: { color: textColor },
                            grid: { color: gridColor }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
            setChart(newChart);
        } catch (err) {
            logger.error('Graph error:', err);
        }
    }, [chart, url, token]);
    const openGraph = (metric) => {
        setCurrentMetric(metric);
        setShowModal(true);
        renderGraph(metric, currentRange);
    };
    const closeGraph = () => {
        setShowModal(false);
        setCurrentMetric(null);
        if (chart) {
            chart.destroy();
            setChart(null);
        }
    };
    useEffect(() => {
        if (showModal && currentMetric) {
            const timer = setTimeout(() => renderGraph(currentMetric, currentRange), 100);
            return () => clearTimeout(timer);
        }
    }, [currentRange, showModal, currentMetric, renderGraph]);
    useEffect(() => {
        const handleClick = (e) => {
            if (showModal && modalRef.current && !modalRef.current.contains(e.target)) {
                closeGraph();
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [showModal]);
    const tempPct = Math.min((statusData.temperature / 100) * 100, 100);
    return (
        <div className="relative h-full">
            {!enabled || !url ? (
                <div className="flex flex-col items-center justify-center h-full text-theme-secondary text-center">
                    <div>
                        <Activity size={24} className="opacity-50 mb-2 mx-auto" />
                        <p>System Health Not Configured</p>
                        <p className="text-xs mt-1">Configure in Settings</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-3 p-3 h-full justify-around">
                    {/* CPU */}
                    <div onClick={() => openGraph('cpu')} className="cursor-pointer group">
                        <div className="flex justify-between mb-1 text-sm text-theme-primary group-hover:text-accent transition-colors">
                            <span className="flex items-center gap-1.5">
                                <Activity size={14} />
                                CPU
                            </span>
                            <span>{Math.round(statusData.cpu)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-theme-tertiary rounded-full overflow-hidden">
                            <div
                                style={{
                                    width: `${statusData.cpu}%`,
                                    backgroundColor: getColor(statusData.cpu)
                                }}
                                className="h-full rounded-full transition-all duration-300"
                            />
                        </div>
                    </div>
                    {/* Memory */}
                    <div onClick={() => openGraph('memory')} className="cursor-pointer group">
                        <div className="flex justify-between mb-1 text-sm text-theme-primary group-hover:text-accent transition-colors">
                            <span className="flex items-center gap-1.5">
                                <Disc size={14} />
                                Memory
                            </span>
                            <span>{Math.round(statusData.memory)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-theme-tertiary rounded-full overflow-hidden">
                            <div
                                style={{
                                    width: `${statusData.memory}%`,
                                    backgroundColor: getColor(statusData.memory)
                                }}
                                className="h-full rounded-full transition-all duration-300"
                            />
                        </div>
                    </div>
                    {/* Temperature */}
                    <div onClick={() => openGraph('temperature')} className="cursor-pointer group">
                        <div className="flex justify-between mb-1 text-sm text-theme-primary group-hover:text-accent transition-colors">
                            <span className="flex items-center gap-1.5">
                                <Activity size={14} />
                                Temp
                            </span>
                            <span>{Math.round(statusData.temperature)}°C</span>
                        </div>
                        <div className="w-full h-1.5 bg-theme-tertiary rounded-full overflow-hidden">
                            <div
                                style={{
                                    width: `${tempPct}%`,
                                    backgroundColor: getColor(tempPct)
                                }}
                                className="h-full rounded-full transition-all duration-300"
                            />
                        </div>
                    </div>
                    {/* Uptime */}
                    <div className="flex justify-between text-sm text-theme-secondary">
                        <span className="flex items-center gap-1.5">
                            <Clock size={14} />
                            Uptime
                        </span>
                        <span>{statusData.uptime}</span>
                    </div>
                </div>
            )}
            {/* Graph Modal */}
            {showModal && (
                <>
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]" />
                    <div
                        ref={modalRef}
                        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] 
                                   bg-theme-secondary border border-theme rounded-xl p-6 w-[90vw] max-w-[600px] shadow-deep"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-theme-primary">
                                {currentMetric?.toUpperCase()} History
                            </h3>
                            <button
                                onClick={closeGraph}
                                className="text-theme-secondary hover:text-theme-primary transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <select
                            value={currentRange}
                            onChange={(e) => setCurrentRange(e.target.value)}
                            className="mb-4 w-full max-w-[200px] bg-theme-tertiary text-theme-primary border border-theme rounded-lg p-2 text-sm focus:outline-none focus:border-accent"
                        >
                            <option value="1h">Last 1 hour</option>
                            <option value="6h">Last 6 hours</option>
                            <option value="1d">Last 1 day</option>
                            <option value="3d">Last 3 days</option>
                        </select>

                        <div className="h-[300px] w-full">
                            <canvas ref={canvasRef} />
                        </div>
                        <button
                            onClick={closeGraph}
                            className="mt-4 w-full py-2 bg-theme-tertiary hover:bg-theme-hover text-theme-primary rounded-lg transition-colors font-medium"
                        >
                            Close
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};
export default SystemStatusWidget;
