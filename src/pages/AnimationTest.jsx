import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/animations.css';

/**
 * Animation Test Page
 * 
 * Isolated environment to test and refine animations before applying to production.
 * Access via: http://localhost:3001/animation-test
 */
export default function AnimationTest() {
    const [activeSection, setActiveSection] = useState('tabs');

    const sections = [
        { id: 'tabs', name: 'Tabs Animation', icon: '📑' },
        { id: 'sidebar', name: 'Sidebar Animation', icon: '📁' },
    ];

    return (
        <div className="min-h-screen bg-theme-primary p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <h1 className="text-4xl font-bold text-theme-primary mb-2">
                    🎨 Animation Testers
                </h1>
                <p className="text-theme-secondary">
                    Isolated components to test and refine animations before production deployment
                </p>
            </div>

            {/* Section Selector */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="glass-subtle rounded-xl p-2 inline-flex gap-2">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`px-6 py-3 rounded-lg font-medium transition-all relative ${activeSection === section.id
                                    ? 'text-theme-primary'
                                    : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-hover'
                                }`}
                        >
                            {activeSection === section.id && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-accent rounded-lg"
                                    transition={{
                                        type: 'spring',
                                        stiffness: 220,
                                        damping: 30,
                                    }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                <span>{section.icon}</span>
                                <span>{section.name}</span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Test Components */}
            <div className="max-w-7xl mx-auto">
                <AnimatePresence mode="wait">
                    {activeSection === 'tabs' && (
                        <motion.div
                            key="tabs"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{
                                type: 'spring',
                                stiffness: 220,
                                damping: 30,
                            }}
                        >
                            <TabAnimationTester />
                        </motion.div>
                    )}

                    {activeSection === 'sidebar' && (
                        <motion.div
                            key="sidebar"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{
                                type: 'spring',
                                stiffness: 220,
                                damping: 30,
                            }}
                        >
                            <SidebarAnimationTester />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

/**
 * Tab Animation Tester
 * Tests smooth tab switching with sliding indicator and content transitions
 */
function TabAnimationTester() {
    const [activeTab, setActiveTab] = useState('account');
    const [stiffness, setStiffness] = useState(220);
    const [damping, setDamping] = useState(30);

    const tabs = [
        { id: 'account', label: 'Account', content: 'Account settings and profile information' },
        { id: 'security', label: 'Security', content: 'Password and authentication settings' },
        { id: 'notifications', label: 'Notifications', content: 'Email and push notification preferences' },
        { id: 'privacy', label: 'Privacy', content: 'Privacy and data sharing settings' },
    ];

    const springConfig = {
        type: 'spring',
        stiffness,
        damping,
    };

    return (
        <div className="glass-card rounded-xl p-8 border border-theme">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-theme-primary mb-2">Tab Animation Tester</h2>
                <p className="text-theme-secondary">
                    Testing smooth tab switching with animated indicator and content transitions
                </p>
            </div>

            {/* Animation Controls */}
            <div className="glass-subtle rounded-lg p-4 mb-6 border border-theme">
                <h3 className="text-sm font-semibold text-theme-primary mb-3">Spring Physics Controls</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-theme-secondary mb-2">
                            Stiffness: {stiffness}
                            <span className="text-theme-tertiary ml-2">(Lower = Slower)</span>
                        </label>
                        <input
                            type="range"
                            min="100"
                            max="400"
                            step="10"
                            value={stiffness}
                            onChange={(e) => setStiffness(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-theme-secondary mb-2">
                            Damping: {damping}
                            <span className="text-theme-tertiary ml-2">(Higher = Less Bounce)</span>
                        </label>
                        <input
                            type="range"
                            min="15"
                            max="50"
                            step="1"
                            value={damping}
                            onChange={(e) => setDamping(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>
                </div>
                <div className="mt-3 text-xs text-theme-tertiary">
                    Recommended for "gentle but fluid": Stiffness: 220, Damping: 30
                </div>
            </div>

            {/* Tab List with Animated Indicator */}
            <div className="relative mb-6">
                <div className="flex gap-1 border-b border-theme relative">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative px-6 py-3 font-medium transition-colors ${activeTab === tab.id
                                    ? 'text-accent'
                                    : 'text-theme-secondary hover:text-theme-primary'
                                }`}
                        >
                            {tab.label}

                            {/* Animated indicator */}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="tabIndicator"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                                    transition={springConfig}
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content with Animation */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={springConfig}
                    className="glass-subtle rounded-lg p-6 border border-theme-light"
                >
                    <h3 className="text-lg font-semibold text-theme-primary mb-2">
                        {tabs.find((t) => t.id === activeTab)?.label}
                    </h3>
                    <p className="text-theme-secondary">
                        {tabs.find((t) => t.id === activeTab)?.content}
                    </p>
                    <div className="mt-4 pt-4 border-t border-theme">
                        <p className="text-sm text-theme-tertiary">
                            This content animates when switching tabs using the spring configuration above.
                        </p>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

/**
 * Sidebar Animation Tester
 * Tests sidebar expand/collapse animations
 */
function SidebarAnimationTester() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [stiffness, setStiffness] = useState(220);
    const [damping, setDamping] = useState(30);
    const [expandedGroups, setExpandedGroups] = useState({ group1: true });

    const springConfig = {
        type: 'spring',
        stiffness,
        damping,
    };

    const menuItems = [
        { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
        { id: 'analytics', icon: '📊', label: 'Analytics' },
        { id: 'settings', icon: '⚙️', label: 'Settings' },
    ];

    const groups = [
        {
            id: 'group1',
            icon: '📁',
            label: 'Projects',
            items: [
                { id: 'project1', label: 'Project Alpha' },
                { id: 'project2', label: 'Project Beta' },
                { id: 'project3', label: 'Project Gamma' },
            ],
        },
    ];

    const toggleGroup = (groupId) => {
        setExpandedGroups((prev) => ({
            ...prev,
            [groupId]: !prev[groupId],
        }));
    };

    return (
        <div className="glass-card rounded-xl p-8 border border-theme">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-theme-primary mb-2">Sidebar Animation Tester</h2>
                <p className="text-theme-secondary">
                    Testing sidebar expand/collapse with smooth width transitions and content reveals
                </p>
            </div>

            {/* Animation Controls */}
            <div className="glass-subtle rounded-lg p-4 mb-6 border border-theme">
                <h3 className="text-sm font-semibold text-theme-primary mb-3">Spring Physics Controls</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-theme-secondary mb-2">
                            Stiffness: {stiffness}
                        </label>
                        <input
                            type="range"
                            min="100"
                            max="400"
                            step="10"
                            value={stiffness}
                            onChange={(e) => setStiffness(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-theme-secondary mb-2">
                            Damping: {damping}
                        </label>
                        <input
                            type="range"
                            min="15"
                            max="50"
                            step="1"
                            value={damping}
                            onChange={(e) => setDamping(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>
                </div>
            </div>

            {/* Sidebar Demo */}
            <div className="flex gap-6">
                {/* Animated Sidebar */}
                <motion.div
                    animate={{
                        width: isExpanded ? 280 : 80,
                    }}
                    transition={springConfig}
                    className="glass-subtle rounded-lg border border-theme overflow-hidden flex-shrink-0"
                    onMouseEnter={() => setIsExpanded(true)}
                    onMouseLeave={() => setIsExpanded(false)}
                >
                    {/* Header */}
                    <div className={`h-16 flex items-center border-b border-theme transition-all ${isExpanded ? 'justify-start px-4' : 'justify-center'
                        }`}>
                        <span className="text-2xl">🎨</span>
                        <AnimatePresence>
                            {isExpanded && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={springConfig}
                                    className="ml-3 font-semibold text-theme-primary whitespace-nowrap"
                                >
                                    Framerr
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2 space-y-1">
                        {menuItems.map((item) => (
                            <div
                                key={item.id}
                                className={`flex items-center rounded-lg py-3 px-2 hover:bg-theme-hover cursor-pointer transition-all ${isExpanded ? 'justify-start' : 'justify-center'
                                    }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.span
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={springConfig}
                                            className="ml-3 text-sm font-medium text-theme-secondary whitespace-nowrap"
                                        >
                                            {item.label}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>

                    {/* Collapsible Group */}
                    <div className="p-2 mt-2 border-t border-theme">
                        {groups.map((group) => (
                            <div key={group.id}>
                                <div
                                    onClick={() => toggleGroup(group.id)}
                                    className={`flex items-center rounded-lg py-3 px-2 hover:bg-theme-hover cursor-pointer transition-all ${isExpanded ? 'justify-between' : 'justify-center'
                                        }`}
                                >
                                    <div className="flex items-center">
                                        <span className="text-xl">{group.icon}</span>
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.span
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -10 }}
                                                    transition={springConfig}
                                                    className="ml-3 text-sm font-medium text-theme-secondary whitespace-nowrap"
                                                >
                                                    {group.label}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.span
                                                initial={{ opacity: 0 }}
                                                animate={{
                                                    opacity: 1,
                                                    rotate: expandedGroups[group.id] ? 180 : 0,
                                                }}
                                                exit={{ opacity: 0 }}
                                                transition={springConfig}
                                                className="text-theme-tertiary"
                                            >
                                                ▼
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Collapsible Items */}
                                <AnimatePresence>
                                    {expandedGroups[group.id] && isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={springConfig}
                                            className="overflow-hidden"
                                        >
                                            {group.items.map((subItem, index) => (
                                                <motion.div
                                                    key={subItem.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -10 }}
                                                    transition={{
                                                        ...springConfig,
                                                        delay: index * 0.05,
                                                    }}
                                                    className="pl-10 py-2 text-sm text-theme-tertiary hover:text-theme-secondary cursor-pointer"
                                                >
                                                    {subItem.label}
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Instructions */}
                <div className="flex-1 glass-subtle rounded-lg p-6 border border-theme">
                    <h3 className="text-lg font-semibold text-theme-primary mb-3">
                        Hover to Test
                    </h3>
                    <ul className="space-y-2 text-theme-secondary">
                        <li className="flex items-start gap-2">
                            <span className="text-accent mt-1">→</span>
                            <span>Hover over the sidebar to expand it</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-accent mt-1">→</span>
                            <span>Move mouse away to collapse</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-accent mt-1">→</span>
                            <span>Click "Projects" folder to expand/collapse</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-accent mt-1">→</span>
                            <span>Adjust spring physics to refine feel</span>
                        </li>
                    </ul>

                    <div className="mt-6 pt-6 border-t border-theme">
                        <h4 className="text-sm font-semibold text-theme-primary mb-2">
                            Current Status: {isExpanded ? '🔓 Expanded' : '🔒 Collapsed'}
                        </h4>
                        <p className="text-sm text-theme-tertiary">
                            Width: {isExpanded ? '280px' : '80px'} •
                            Spring: {stiffness}/{damping}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
