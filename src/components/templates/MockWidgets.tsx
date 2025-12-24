/**
 * MockWidgets - EXACT visual replicas of real widgets with fake data
 * 
 * These are CSS-perfect copies of the actual widget rendering.
 * Styled to match real widgets 1:1 - only the data is fake.
 */

import React from 'react';
import {
    Film, Download, ArrowDown, ArrowUp, Activity, Disc, Thermometer, Clock,
    Globe, Music, Sun, Code, Tv
} from 'lucide-react';

// =============================================================================
// PLEX WIDGET (3 Sessions) - EXACT replica of PlexWidget render
// =============================================================================
const PLEX_MOCK_DATA = [
    { title: "Breaking Bad", subtitle: "S5 • E16", user: "JohnDoe", progress: 65 },
    { title: "The Office", subtitle: "S7 • E11", user: "Jane", progress: 23 },
    { title: "Interstellar", subtitle: "Movie", user: "Mike", progress: 89 },
];

export const MockPlexWidget: React.FC = () => (
    <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '1rem',
        height: '100%',
        overflowY: 'hidden',
        padding: '0.25rem'
    }}>
        {PLEX_MOCK_DATA.map((session, i) => (
            <div
                key={i}
                style={{
                    background: 'var(--bg-hover)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    position: 'relative',
                }}
            >
                {/* Image Container - 70% height */}
                <div style={{
                    flex: '0 0 70%',
                    position: 'relative',
                    background: 'var(--bg-tertiary)',
                }}>
                    {/* Gradient placeholder for poster */}
                    <div style={{
                        width: '100%',
                        height: '100%',
                        background: `linear-gradient(135deg, var(--accent) 0%, var(--bg-tertiary) 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Film size={32} style={{ opacity: 0.3, color: 'white' }} />
                    </div>
                </div>

                {/* Progress Bar - 6px */}
                <div style={{ height: '6px', background: 'var(--bg-tertiary)' }}>
                    <div style={{
                        width: `${session.progress}%`,
                        background: 'var(--accent)',
                        height: '100%',
                        transition: 'width 0.3s ease'
                    }} />
                </div>

                {/* Info Section */}
                <div style={{ padding: '0.75rem 0.5rem' }}>
                    <div style={{
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        marginBottom: '0.25rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: 'var(--text-primary)'
                    }}>
                        {session.title}
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.7rem',
                        color: 'var(--text-secondary)'
                    }}>
                        <span>{session.subtitle}</span>
                        <span style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '80px'
                        }}>{session.user}</span>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

// =============================================================================
// RADARR WIDGET (5 Movies) - EXACT replica of RadarrWidget MoviePopover trigger
// =============================================================================
const RADARR_MOCK_DATA = [
    { title: "Dune: Part Two", year: 2024, release: "2024-03-01" },
    { title: "Oppenheimer", year: 2023, release: "2023-07-21" },
    { title: "Barbie", year: 2023, release: "2023-07-21" },
    { title: "Avatar 3", year: 2025, release: "2025-12-19" },
    { title: "Deadpool 4", year: 2025, release: "TBA" },
];

export const MockRadarrWidget: React.FC = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100%', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>Upcoming Movies</span>
        </div>
        {RADARR_MOCK_DATA.map((movie, i) => (
            <button
                key={i}
                style={{
                    padding: '0.5rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '0.5rem',
                    fontSize: '0.85rem',
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    cursor: 'default',
                }}
            >
                <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                    {movie.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {movie.year} • {movie.release}
                </div>
            </button>
        ))}
    </div>
);

// =============================================================================
// SONARR WIDGET (5 Shows) - EXACT same as Radarr style
// =============================================================================
const SONARR_MOCK_DATA = [
    { title: "The Last of Us", season: "S2", episode: "E3", airdate: "2025-01-19" },
    { title: "House of Dragon", season: "S3", episode: "E1", airdate: "2025-06-15" },
    { title: "The Bear", season: "S4", episode: "E1", airdate: "2025-06-22" },
    { title: "Severance", season: "S2", episode: "E6", airdate: "2025-02-14" },
    { title: "Wednesday", season: "S2", episode: "E1", airdate: "2025-08-01" },
];

export const MockSonarrWidget: React.FC = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100%', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>Upcoming Episodes</span>
        </div>
        {SONARR_MOCK_DATA.map((show, i) => (
            <button
                key={i}
                style={{
                    padding: '0.5rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '0.5rem',
                    fontSize: '0.85rem',
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    cursor: 'default',
                }}
            >
                <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                    {show.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {show.season} • {show.episode} • {show.airdate}
                </div>
            </button>
        ))}
    </div>
);

// =============================================================================
// QBITTORRENT WIDGET (3 Torrents) - EXACT replica
// =============================================================================
const QBIT_MOCK_DATA = {
    total: 47,
    dlSpeed: "12.5 MB/s",
    dlCount: 3,
    ulSpeed: "2.1 MB/s",
    ulCount: 5,
    torrents: [
        { name: "ubuntu-22.04-desktop-amd64.iso", progress: 87, size: "4.2 GB", dlspeed: "5.2 MB/s", upspeed: "156 KB/s", state: "downloading" },
        { name: "LinuxMint-21.2-cinnamon-64bit.iso", progress: 23, size: "2.8 GB", dlspeed: "3.1 MB/s", upspeed: "89 KB/s", state: "downloading" },
        { name: "debian-12.1.0-amd64-netinst.iso", progress: 100, size: "628 MB", dlspeed: "0 B/s", upspeed: "1.8 MB/s", state: "uploading" },
    ]
};

export const MockQBittorrentWidget: React.FC = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%', overflow: 'hidden' }}>
        {/* Stats - 3-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
            {/* Total */}
            <div className="bg-theme-tertiary" style={{ textAlign: 'center', padding: '0.5rem', borderRadius: '0.5rem' }}>
                <div style={{ color: 'var(--text-secondary)' }}>Total</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{QBIT_MOCK_DATA.total}</div>
            </div>

            {/* Download */}
            <div style={{ textAlign: 'center', padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(var(--success-rgb), 0.1)' }}>
                <div style={{ color: 'var(--text-secondary)' }}>↓ {QBIT_MOCK_DATA.dlSpeed}</div>
                <div style={{ fontWeight: 600, color: 'var(--success)' }}>{QBIT_MOCK_DATA.dlCount} DL</div>
            </div>

            {/* Upload */}
            <div style={{ textAlign: 'center', padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(var(--info-rgb), 0.1)' }}>
                <div style={{ color: 'var(--text-secondary)' }}>↑ {QBIT_MOCK_DATA.ulSpeed}</div>
                <div style={{ fontWeight: 600, color: 'var(--info)' }}>{QBIT_MOCK_DATA.ulCount} UP</div>
            </div>
        </div>

        {/* Torrent List */}
        <div style={{ flex: 1, overflowY: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {QBIT_MOCK_DATA.torrents.map((torrent, i) => {
                const isActive = torrent.state === 'downloading' || torrent.state === 'uploading';
                return (
                    <div
                        key={i}
                        className="bg-theme-tertiary"
                        style={{ padding: '0.5rem', borderRadius: '0.5rem', fontSize: '0.75rem' }}
                    >
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {torrent.name}
                        </div>

                        {/* Progress Bar */}
                        <div className="bg-theme-hover" style={{ height: '4px', borderRadius: '9999px', marginBottom: '0.25rem', overflow: 'hidden' }}>
                            <div style={{
                                width: `${torrent.progress}%`,
                                height: '100%',
                                background: isActive ? 'var(--success)' : 'var(--text-secondary)',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                            <span>{torrent.progress}% • {torrent.size}</span>
                            {isActive && (
                                <span>
                                    <ArrowDown size={12} style={{ display: 'inline' }} /> {torrent.dlspeed}
                                    {' '}
                                    <ArrowUp size={12} style={{ display: 'inline' }} /> {torrent.upspeed}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
);

// =============================================================================
// SYSTEM STATUS WIDGET (3 Bars + Uptime) - EXACT replica
// =============================================================================
const SYSTEM_MOCK_DATA = { cpu: 45, memory: 68, temperature: 52, uptime: "14d 6h 23m" };

const getMetricColor = (value: number): string => {
    if (value < 50) return 'var(--success)';
    if (value < 80) return 'var(--warning)';
    return 'var(--error)';
};

interface MetricRowProps {
    icon: React.FC<{ size?: number }>;
    label: string;
    value: number;
    unit: string;
}

const MetricRow: React.FC<MetricRowProps> = ({ icon: Icon, label, value, unit }) => (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Icon size={14} />
                {label}
            </span>
            <span>{value.toFixed(label === 'Temperature' ? 0 : 1)}{unit}</span>
        </div>
        <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '9999px', overflow: 'hidden' }}>
            <div
                style={{
                    width: `${Math.min(value, 100)}%`,
                    backgroundColor: getMetricColor(value),
                    height: '100%',
                    borderRadius: '9999px',
                    transition: 'all 0.3s',
                }}
            />
        </div>
    </div>
);

export const MockSystemStatusWidget: React.FC = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem', height: '100%', justifyContent: 'space-around' }}>
        <MetricRow icon={Activity} label="CPU" value={SYSTEM_MOCK_DATA.cpu} unit="%" />
        <MetricRow icon={Disc} label="Memory" value={SYSTEM_MOCK_DATA.memory} unit="%" />
        <MetricRow icon={Thermometer} label="Temperature" value={SYSTEM_MOCK_DATA.temperature} unit="°C" />

        {/* Uptime - no bar */}
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Clock size={14} />
                    Uptime
                </span>
                <span style={{ fontSize: '0.75rem' }}>{SYSTEM_MOCK_DATA.uptime}</span>
            </div>
        </div>
    </div>
);

// =============================================================================
// CALENDAR WIDGET - Compact calendar with events
// =============================================================================
const CALENDAR_MOCK_EVENTS = ["Dune: Part Two", "Avatar 3", "The Batman", "Blade", "Fantastic 4"];

export const MockCalendarWidget: React.FC = () => {
    const days = Array.from({ length: 35 }, (_, i) => i - 3);
    const eventDays = [5, 12, 18, 23, 28];

    return (
        <div style={{ height: '100%', width: '100%', overflow: 'hidden', padding: '0.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', padding: '0 0.25rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>December 2024</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '0.25rem' }}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} style={{ fontSize: '0.625rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>{d}</div>
                ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', flex: 1 }}>
                {days.map((day, i) => {
                    const isCurrentMonth = day > 0 && day <= 31;
                    const hasEvent = eventDays.includes(day);
                    return (
                        <div
                            key={i}
                            style={{
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px',
                                fontSize: '0.625rem',
                                color: isCurrentMonth ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                opacity: isCurrentMonth ? 1 : 0.4,
                            }}
                        >
                            {isCurrentMonth ? day : ''}
                            {hasEvent && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '1px',
                                    width: '3px',
                                    height: '3px',
                                    borderRadius: '50%',
                                    background: 'var(--accent)',
                                }} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// =============================================================================
// CLOCK WIDGET
// =============================================================================
export const MockClockWidget: React.FC = () => (
    <div style={{ height: '100%', width: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>12:34</span>
    </div>
);

// =============================================================================
// WEATHER WIDGET
// =============================================================================
export const MockWeatherWidget: React.FC = () => (
    <div style={{ height: '100%', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <Sun size={40} style={{ color: 'var(--warning)' }} />
        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>72°F</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Sunny</span>
    </div>
);

// =============================================================================
// LINK GRID WIDGET (3 Buttons)
// =============================================================================
const LINK_MOCK_DATA = [
    { icon: Globe, title: "Google" },
    { icon: Film, title: "Netflix" },
    { icon: Music, title: "Spotify" },
];

export const MockLinkGridWidget: React.FC = () => (
    <div style={{ height: '100%', width: '100%', overflow: 'hidden', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
        {LINK_MOCK_DATA.map((link, i) => (
            <div
                key={i}
                style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <link.icon size={20} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '0.625rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{link.title}</span>
            </div>
        ))}
    </div>
);

// =============================================================================
// OVERSEERR WIDGET (3 Request Cards)
// =============================================================================
export const MockOverseerrWidget: React.FC = () => (
    <div style={{ height: '100%', width: '100%', overflow: 'hidden', padding: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {["Dune: Part Three", "Avatar 4", "The Batman 2"].map((title, i) => (
            <button
                key={i}
                style={{
                    padding: '0.5rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '0.5rem',
                    fontSize: '0.85rem',
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    cursor: 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--warning)' }}>Pending</span>
            </button>
        ))}
    </div>
);

// =============================================================================
// UPCOMING MEDIA WIDGET (3 Posters)
// =============================================================================
export const MockUpcomingMediaWidget: React.FC = () => (
    <div style={{ height: '100%', width: '100%', overflow: 'hidden', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {[1, 2, 3].map((_, i) => (
            <div
                key={i}
                style={{
                    width: '70px',
                    height: '100px',
                    borderRadius: '8px',
                    background: `linear-gradient(135deg, var(--accent) 0%, var(--bg-tertiary) 100%)`,
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                <Film size={24} style={{ opacity: 0.3, color: 'white' }} />
            </div>
        ))}
    </div>
);

// =============================================================================
// CUSTOM HTML WIDGET
// =============================================================================
export const MockCustomHTMLWidget: React.FC = () => (
    <div style={{ height: '100%', width: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Code size={24} style={{ color: 'var(--text-tertiary)', marginRight: '0.5rem' }} />
        <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Custom HTML</span>
    </div>
);

// =============================================================================
// GENERIC FALLBACK
// =============================================================================
export const MockGenericWidget: React.FC<{ type: string }> = ({ type }) => (
    <div style={{ height: '100%', width: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{type}</span>
    </div>
);

// =============================================================================
// WIDGET TYPE MAPPING
// =============================================================================
export const getMockWidget = (type: string): React.FC => {
    const widgets: Record<string, React.FC> = {
        'plex': MockPlexWidget,
        'radarr': MockRadarrWidget,
        'sonarr': MockSonarrWidget,
        'qbittorrent': MockQBittorrentWidget,
        'systemstatus': MockSystemStatusWidget,
        'calendar': MockCalendarWidget,
        'clock': MockClockWidget,
        'weather': MockWeatherWidget,
        'linkgrid': MockLinkGridWidget,
        'overseerr': MockOverseerrWidget,
        'upcomingmedia': MockUpcomingMediaWidget,
        'customhtml': MockCustomHTMLWidget,
    };

    return widgets[type.toLowerCase()] || (() => <MockGenericWidget type={type} />);
};
