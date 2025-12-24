/**
 * MockWidgets - Static mock versions of widgets for template preview/thumbnail
 * 
 * Each mock component renders with fake data matching the real widget appearance.
 * Key: overflow:hidden, no scrolling - content clips if widget is too small.
 */

import React from 'react';
import {
    Film, Download, ArrowDown, ArrowUp, Activity, HardDrive, Thermometer, Clock,
    Globe, Music, Sun, Calendar as CalendarIcon, Code, Tv, Clapperboard
} from 'lucide-react';

// =============================================================================
// PLEX WIDGET (3 Sessions)
// =============================================================================
const PLEX_MOCK_DATA = [
    { title: "Breaking Bad", subtitle: "S5 • E16", user: "JohnDoe", progress: 65 },
    { title: "The Office", subtitle: "S7 • E11", user: "Jane", progress: 23 },
    { title: "Interstellar", subtitle: "Movie", user: "Mike", progress: 89 },
];

export const MockPlexWidget: React.FC = () => (
    <div className="h-full w-full overflow-hidden p-1">
        <div className="grid gap-2 h-full" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
            {PLEX_MOCK_DATA.map((session, i) => (
                <div key={i} className="bg-theme-hover rounded-lg overflow-hidden flex flex-col">
                    {/* Image placeholder with gradient */}
                    <div
                        className="flex-[0_0_65%] relative"
                        style={{ background: `linear-gradient(135deg, var(--accent) 0%, var(--bg-tertiary) 100%)` }}
                    >
                        <Film size={24} className="absolute inset-0 m-auto text-white/30" />
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 bg-theme-tertiary">
                        <div className="h-full bg-accent" style={{ width: `${session.progress}%` }} />
                    </div>
                    {/* Info */}
                    <div className="p-1.5 flex-1">
                        <div className="text-[10px] font-semibold text-theme-primary truncate">{session.title}</div>
                        <div className="flex justify-between text-[8px] text-theme-tertiary">
                            <span>{session.subtitle}</span>
                            <span>{session.user}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// =============================================================================
// RADARR WIDGET (5 Movies)
// =============================================================================
const RADARR_MOCK_DATA = [
    "Dune: Part Two (2024)",
    "Oppenheimer (2023)",
    "Barbie (2023)",
    "Avatar 3 (2025)",
    "Deadpool 4 (2025)"
];

export const MockRadarrWidget: React.FC = () => (
    <div className="h-full w-full overflow-hidden p-1 flex flex-col gap-1">
        {RADARR_MOCK_DATA.map((movie, i) => (
            <div key={i} className="flex items-center gap-2 py-1 px-2 bg-theme-tertiary/30 rounded">
                <Film size={12} className="text-accent flex-shrink-0" />
                <span className="text-xs text-theme-primary truncate">{movie}</span>
            </div>
        ))}
    </div>
);

// =============================================================================
// SONARR WIDGET (5 Shows)
// =============================================================================
const SONARR_MOCK_DATA = [
    "The Last of Us",
    "House of Dragon",
    "The Bear",
    "Severance",
    "Wednesday"
];

export const MockSonarrWidget: React.FC = () => (
    <div className="h-full w-full overflow-hidden p-1 flex flex-col gap-1">
        {SONARR_MOCK_DATA.map((show, i) => (
            <div key={i} className="flex items-center gap-2 py-1 px-2 bg-theme-tertiary/30 rounded">
                <Tv size={12} className="text-accent flex-shrink-0" />
                <span className="text-xs text-theme-primary truncate">{show}</span>
            </div>
        ))}
    </div>
);

// =============================================================================
// QBITTORRENT WIDGET (3 Torrents)
// =============================================================================
const QBIT_MOCK_DATA = {
    dlSpeed: "12.5 MB/s",
    ulSpeed: "2.1 MB/s",
    torrents: [
        { name: "ubuntu-22.04.iso", progress: 87 },
        { name: "movie.2024.mkv", progress: 23 },
        { name: "album.flac.zip", progress: 100 },
    ]
};

export const MockQBittorrentWidget: React.FC = () => (
    <div className="h-full w-full overflow-hidden p-1 flex flex-col gap-1">
        {/* Speed Header */}
        <div className="flex justify-between items-center py-1 px-2 bg-theme-tertiary/30 rounded">
            <div className="flex items-center gap-1 text-success">
                <ArrowDown size={10} />
                <span className="text-[10px] font-medium">{QBIT_MOCK_DATA.dlSpeed}</span>
            </div>
            <div className="flex items-center gap-1 text-info">
                <ArrowUp size={10} />
                <span className="text-[10px] font-medium">{QBIT_MOCK_DATA.ulSpeed}</span>
            </div>
        </div>
        {/* Torrents */}
        {QBIT_MOCK_DATA.torrents.map((torrent, i) => (
            <div key={i} className="flex flex-col gap-0.5 py-1 px-2 bg-theme-tertiary/30 rounded">
                <div className="flex items-center gap-1">
                    <Download size={10} className="text-accent flex-shrink-0" />
                    <span className="text-[10px] text-theme-primary truncate">{torrent.name}</span>
                </div>
                <div className="h-1 bg-theme-tertiary rounded-full overflow-hidden">
                    <div
                        className={`h-full ${torrent.progress === 100 ? 'bg-success' : 'bg-accent'}`}
                        style={{ width: `${torrent.progress}%` }}
                    />
                </div>
            </div>
        ))}
    </div>
);

// =============================================================================
// SYSTEM STATUS WIDGET (3 Bars + Uptime)
// =============================================================================
const SYSTEM_MOCK_DATA = { cpu: 45, memory: 68, temperature: 52, uptime: "14d 6h" };

const getMetricColor = (value: number): string => {
    if (value < 50) return 'bg-success';
    if (value < 80) return 'bg-warning';
    return 'bg-error';
};

export const MockSystemStatusWidget: React.FC = () => (
    <div className="h-full w-full overflow-hidden p-1 grid grid-cols-2 gap-1">
        {/* CPU */}
        <div className="flex flex-col items-center justify-center p-1 bg-theme-tertiary/30 rounded">
            <Activity size={14} className="text-accent mb-0.5" />
            <span className="text-[8px] text-theme-tertiary">CPU</span>
            <div className="w-full h-1.5 bg-theme-tertiary rounded-full mt-0.5 overflow-hidden">
                <div className={`h-full ${getMetricColor(SYSTEM_MOCK_DATA.cpu)}`} style={{ width: `${SYSTEM_MOCK_DATA.cpu}%` }} />
            </div>
            <span className="text-[10px] font-medium text-theme-primary">{SYSTEM_MOCK_DATA.cpu}%</span>
        </div>
        {/* Memory */}
        <div className="flex flex-col items-center justify-center p-1 bg-theme-tertiary/30 rounded">
            <HardDrive size={14} className="text-accent mb-0.5" />
            <span className="text-[8px] text-theme-tertiary">Memory</span>
            <div className="w-full h-1.5 bg-theme-tertiary rounded-full mt-0.5 overflow-hidden">
                <div className={`h-full ${getMetricColor(SYSTEM_MOCK_DATA.memory)}`} style={{ width: `${SYSTEM_MOCK_DATA.memory}%` }} />
            </div>
            <span className="text-[10px] font-medium text-theme-primary">{SYSTEM_MOCK_DATA.memory}%</span>
        </div>
        {/* Temperature */}
        <div className="flex flex-col items-center justify-center p-1 bg-theme-tertiary/30 rounded">
            <Thermometer size={14} className="text-accent mb-0.5" />
            <span className="text-[8px] text-theme-tertiary">Temp</span>
            <div className="w-full h-1.5 bg-theme-tertiary rounded-full mt-0.5 overflow-hidden">
                <div className={`h-full ${getMetricColor(SYSTEM_MOCK_DATA.temperature)}`} style={{ width: `${SYSTEM_MOCK_DATA.temperature}%` }} />
            </div>
            <span className="text-[10px] font-medium text-theme-primary">{SYSTEM_MOCK_DATA.temperature}°C</span>
        </div>
        {/* Uptime */}
        <div className="flex flex-col items-center justify-center p-1 bg-theme-tertiary/30 rounded">
            <Clock size={14} className="text-accent mb-0.5" />
            <span className="text-[8px] text-theme-tertiary">Uptime</span>
            <span className="text-[10px] font-medium text-theme-primary mt-1">{SYSTEM_MOCK_DATA.uptime}</span>
        </div>
    </div>
);

// =============================================================================
// CALENDAR WIDGET (Fake Movie Events)
// =============================================================================
const CALENDAR_MOCK_EVENTS = ["Dune: Part Two", "Avatar 3", "The Batman 2", "Blade", "Fantastic Four"];

export const MockCalendarWidget: React.FC = () => {
    const days = Array.from({ length: 35 }, (_, i) => i - 3); // Start from previous month
    const eventDays = [5, 12, 18, 23, 28]; // Days with events

    return (
        <div className="h-full w-full overflow-hidden p-1 flex flex-col">
            {/* Month header */}
            <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-xs font-medium text-theme-primary">December 2024</span>
            </div>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className="text-[8px] text-center text-theme-tertiary">{d}</div>
                ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0.5 flex-1">
                {days.map((day, i) => {
                    const isCurrentMonth = day > 0 && day <= 31;
                    const hasEvent = eventDays.includes(day);
                    return (
                        <div
                            key={i}
                            className={`relative flex items-center justify-center rounded text-[9px] ${isCurrentMonth ? 'text-theme-primary' : 'text-theme-tertiary/40'
                                }`}
                        >
                            {isCurrentMonth ? day : ''}
                            {hasEvent && (
                                <div className="absolute bottom-0 w-1 h-1 rounded-full bg-accent" />
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
    <div className="h-full w-full overflow-hidden flex items-center justify-center">
        <span className="text-2xl font-bold text-theme-primary">12:34</span>
    </div>
);

// =============================================================================
// WEATHER WIDGET
// =============================================================================
export const MockWeatherWidget: React.FC = () => (
    <div className="h-full w-full overflow-hidden flex flex-col items-center justify-center gap-1">
        <Sun size={32} className="text-warning" />
        <span className="text-lg font-bold text-theme-primary">72°F</span>
        <span className="text-xs text-theme-tertiary">Sunny</span>
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
    <div className="h-full w-full overflow-hidden p-1 flex items-center justify-center gap-2">
        {LINK_MOCK_DATA.map((link, i) => (
            <div
                key={i}
                className="w-12 h-12 rounded-full bg-theme-tertiary border border-theme flex flex-col items-center justify-center"
            >
                <link.icon size={16} className="text-accent" />
                <span className="text-[8px] text-theme-primary mt-0.5">{link.title}</span>
            </div>
        ))}
    </div>
);

// =============================================================================
// OVERSEERR WIDGET (3 Request Cards)
// =============================================================================
export const MockOverseerrWidget: React.FC = () => (
    <div className="h-full w-full overflow-hidden p-1 flex flex-col gap-1">
        {["Dune: Part Two", "Avatar 3", "The Batman 2"].map((title, i) => (
            <div key={i} className="flex items-center gap-2 py-1 px-2 bg-theme-tertiary/30 rounded">
                <Clapperboard size={12} className="text-accent flex-shrink-0" />
                <span className="text-xs text-theme-primary truncate">{title}</span>
                <span className="text-[10px] text-warning ml-auto">Pending</span>
            </div>
        ))}
    </div>
);

// =============================================================================
// UPCOMING MEDIA WIDGET (3 Posters)
// =============================================================================
export const MockUpcomingMediaWidget: React.FC = () => (
    <div className="h-full w-full overflow-hidden p-1 flex items-center gap-2">
        {[1, 2, 3].map((_, i) => (
            <div
                key={i}
                className="w-16 h-24 rounded bg-theme-tertiary border border-theme flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg, var(--accent) 0%, var(--bg-tertiary) 100%)` }}
            >
                <Film size={20} className="text-white/30" />
            </div>
        ))}
    </div>
);

// =============================================================================
// CUSTOM HTML WIDGET
// =============================================================================
export const MockCustomHTMLWidget: React.FC = () => (
    <div className="h-full w-full overflow-hidden flex items-center justify-center">
        <Code size={24} className="text-theme-tertiary mr-2" />
        <span className="text-sm text-theme-tertiary">Custom HTML</span>
    </div>
);

// =============================================================================
// GENERIC FALLBACK
// =============================================================================
export const MockGenericWidget: React.FC<{ type: string }> = ({ type }) => (
    <div className="h-full w-full overflow-hidden flex items-center justify-center">
        <span className="text-xs text-theme-tertiary">{type}</span>
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
