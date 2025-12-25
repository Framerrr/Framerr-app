/**
 * MockWidgetTest - Static test page to preview mock widgets
 * 
 * Access via: /mock-widget-test (add route to App.tsx if needed)
 * Or import directly in a component for testing.
 */

import React from 'react';
import {
    MockPlexWidget,
    MockRadarrWidget,
    MockSonarrWidget,
    MockQBittorrentWidget,
    MockSystemStatusWidget,
    MockCalendarWidget,
    MockClockWidget,
    MockWeatherWidget,
    MockLinkGridWidget,
    MockOverseerrWidget,
    MockCustomHTMLWidget,
    MockUpcomingMediaWidget,
} from '../components/templates/MockWidgets';
import {
    Tv, Film, MonitorPlay, Download, Activity,
    Calendar, Clock, Cloud, Link, Star, Code, Clapperboard
} from 'lucide-react';

// Simulates WidgetWrapper + Card structure
interface MockWidgetCardProps {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    gridSpan?: string; // Tailwind col-span class
    height?: string;   // Fixed height
}

const MockWidgetCard: React.FC<MockWidgetCardProps> = ({
    title,
    icon: Icon,
    children,
    gridSpan = 'col-span-4',
    height = 'h-[300px]'
}) => (
    <div className={`${gridSpan} ${height} glass-card rounded-xl overflow-hidden flex flex-col border border-theme`}>
        {/* Header - matches WidgetWrapper */}
        <div className="flex items-center gap-3 p-4 border-b border-theme flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                <Icon size={18} className="text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-theme-primary">{title}</h3>
        </div>
        {/* Content - matches WidgetWrapper */}
        <div className="flex-1 overflow-hidden p-4">
            {children}
        </div>
    </div>
);

const MockWidgetTest: React.FC = () => {
    return (
        <div className="min-h-screen bg-theme-primary p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-theme-primary mb-2">Mock Widget Test Page</h1>
                <p className="text-theme-secondary">Compare these to the real dashboard widgets</p>
            </header>

            {/* Grid layout similar to dashboard */}
            <div className="grid grid-cols-12 gap-4">
                {/* Row 1 */}
                <MockWidgetCard title="Plex" icon={Tv} gridSpan="col-span-6" height="h-[300px]">
                    <MockPlexWidget />
                </MockWidgetCard>

                <MockWidgetCard title="System Status" icon={Activity} gridSpan="col-span-4" height="h-[300px]">
                    <MockSystemStatusWidget />
                </MockWidgetCard>

                <MockWidgetCard title="Clock" icon={Clock} gridSpan="col-span-2" height="h-[200px]">
                    <MockClockWidget />
                </MockWidgetCard>

                {/* Row 2 */}
                <MockWidgetCard title="Sonarr" icon={MonitorPlay} gridSpan="col-span-4" height="h-[300px]">
                    <MockSonarrWidget />
                </MockWidgetCard>

                <MockWidgetCard title="Radarr" icon={Film} gridSpan="col-span-4" height="h-[300px]">
                    <MockRadarrWidget />
                </MockWidgetCard>

                <MockWidgetCard title="Weather" icon={Cloud} gridSpan="col-span-4" height="h-[200px]">
                    <MockWeatherWidget />
                </MockWidgetCard>

                {/* Row 3 */}
                <MockWidgetCard title="qBittorrent" icon={Download} gridSpan="col-span-6" height="h-[300px]">
                    <MockQBittorrentWidget />
                </MockWidgetCard>

                <MockWidgetCard title="Calendar" icon={Calendar} gridSpan="col-span-6" height="h-[400px]">
                    <MockCalendarWidget />
                </MockWidgetCard>

                {/* Row 4 */}
                <MockWidgetCard title="Link Grid" icon={Link} gridSpan="col-span-4" height="h-[200px]">
                    <MockLinkGridWidget />
                </MockWidgetCard>

                <MockWidgetCard title="Overseerr" icon={Star} gridSpan="col-span-4" height="h-[250px]">
                    <MockOverseerrWidget />
                </MockWidgetCard>

                <MockWidgetCard title="Upcoming Media" icon={Clapperboard} gridSpan="col-span-4" height="h-[150px]">
                    <MockUpcomingMediaWidget />
                </MockWidgetCard>

                {/* Custom HTML */}
                <MockWidgetCard title="Custom HTML" icon={Code} gridSpan="col-span-4" height="h-[150px]">
                    <MockCustomHTMLWidget />
                </MockWidgetCard>
            </div>

            {/* Scaled thumbnail preview section */}
            <section className="mt-12">
                <h2 className="text-2xl font-bold text-theme-primary mb-4">Thumbnail Scale Preview (CSS Scale)</h2>
                <p className="text-theme-secondary mb-6">Same widgets rendered at 600px then scaled to thumbnail size</p>

                <div className="flex gap-8 flex-wrap">
                    {/* Scale demo */}
                    <div className="relative overflow-hidden rounded-lg border border-theme" style={{ width: 160, height: 120 }}>
                        <div
                            style={{
                                width: 600,
                                transformOrigin: 'top left',
                                transform: 'scale(0.267)',
                                position: 'absolute',
                                left: 0,
                                top: 0,
                            }}
                        >
                            <div className="grid grid-cols-12 gap-2 p-2 bg-theme-secondary" style={{ width: 600 }}>
                                <div className="col-span-6 h-[150px] glass-card rounded-lg overflow-hidden flex flex-col">
                                    <div className="h-6 px-2 border-b border-theme bg-theme-tertiary flex items-center gap-1 text-xs">
                                        <Tv size={10} className="text-accent" />
                                        <span className="text-theme-primary font-medium">Plex</span>
                                    </div>
                                    <div className="flex-1 overflow-hidden p-1">
                                        <MockPlexWidget />
                                    </div>
                                </div>
                                <div className="col-span-6 h-[150px] glass-card rounded-lg overflow-hidden flex flex-col">
                                    <div className="h-6 px-2 border-b border-theme bg-theme-tertiary flex items-center gap-1 text-xs">
                                        <Activity size={10} className="text-accent" />
                                        <span className="text-theme-primary font-medium">System Status</span>
                                    </div>
                                    <div className="flex-1 overflow-hidden p-1">
                                        <MockSystemStatusWidget />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default MockWidgetTest;
