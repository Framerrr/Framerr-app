import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Settings as SettingsIcon, Menu, X, LayoutDashboard, ChevronDown, ChevronRight, ChevronUp, LogOut, UserCircle } from 'lucide-react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import logger from '../utils/logger';

const Sidebar = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [tabs, setTabs] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [hoveredItem, setHoveredItem] = useState(null);
    const { userSettings, groups } = useAppData();
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Spring configuration for sidebar animations (animate-ui inspired)
    const sidebarSpring = {
        type: 'spring',
        stiffness: 350,
        damping: 35,
    };

    // Faster spring for text to avoid icon pushing
    const textSpring = {
        type: 'spring',
        stiffness: 400,
        damping: 35,
    };

    // Parse query parameters from hash
    const hash = window.location.hash.slice(1);
    const hashParts = hash.split('?');
    const searchParams = hashParts.length > 1 ? new URLSearchParams(hashParts[1]) : new URLSearchParams();
    const currentTab = searchParams.get('tab');
    const source = searchParams.get('source');

    // Fetch tabs from API
    useEffect(() => {
        const fetchTabs = async () => {
            try {
                const response = await fetch('/api/tabs', {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    setTabs(data.tabs || []);
                }
            } catch (error) {
                logger.error('Error fetching tabs:', error);
            }
        };

        fetchTabs();

        const handleTabsUpdated = () => {
            fetchTabs();
        };

        window.addEventListener('tabsUpdated', handleTabsUpdated);

        return () => {
            window.removeEventListener('tabsUpdated', handleTabsUpdated);
        };
    }, []);

    // Fetch current user profile
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const response = await fetch('/api/profile', {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    setCurrentUser(data);
                }
            } catch (error) {
                logger.error('Error fetching user profile:', error);
            }
        };
        fetchUserProfile();
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Initialize all groups as expanded by default
    useEffect(() => {
        if (groups && groups.length > 0) {
            const initialState = {};
            groups.forEach(group => {
                initialState[group.id] = true;
            });
            setExpandedGroups(initialState);
        }
    }, [groups]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const renderIcon = (iconValue, size = 20) => {
        if (!iconValue) return <Icons.Server size={size} />;

        if (iconValue.startsWith('custom:')) {
            const iconId = iconValue.replace('custom:', '');
            return <img src={`/api/custom-icons/${iconId}/file`} alt="custom icon" className="object-cover rounded" style={{ width: size, height: size }} />;
        }

        if (iconValue.startsWith('data:')) {
            return <img src={iconValue} alt="icon" className="object-cover rounded" style={{ width: size, height: size }} />;
        }

        const IconComponent = Icons[iconValue] || Icons.Server;
        return <IconComponent size={size} />;
    };

    // Desktop Sidebar with animated hover indicator
    if (!isMobile) {
        return (
            <>
                {/* Backdrop when sidebar is expanded */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={sidebarSpring}
                            className="fixed inset-0 bg-black/20 z-30"
                        />
                    )}
                </AnimatePresence>

                <motion.aside
                    className="flex flex-col relative fade-in"
                    animate={{
                        width: isExpanded ? 280 : 80,
                    }}
                    transition={sidebarSpring}
                    style={{
                        height: 'calc(100vh - 32px)',
                        position: 'fixed',
                        left: '16px',
                        top: '16px',
                        zIndex: 40,
                        overflow: 'hidden',
                        background: 'linear-gradient(135deg, var(--glass-start), var(--glass-end))',
                        backdropFilter: 'blur(var(--blur-strong))',
                        WebkitBackdropFilter: 'blur(var(--blur-strong))',
                        borderRadius: '20px',
                        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6), 0 12px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--border-glass), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                    }}
                    onMouseEnter={() => setIsExpanded(true)}
                    onMouseLeave={() => {
                        setIsExpanded(false);
                        setHoveredItem(null);
                    }}
                >
                    {/* Gradient border accent */}
                    <div
                        className="absolute inset-0 rounded-[20px] pointer-events-none"
                        style={{
                            background: 'linear-gradient(to bottom, var(--accent-glow), var(--accent-glow-soft))',
                            WebkitMask: 'linear-gradient(black, black) padding-box, linear-gradient(black, black)',
                            WebkitMaskComposite: 'xor',
                            mask: 'linear-gradient(black, black) padding-box, linear-gradient(black, black)',
                            maskComposite: 'exclude',
                            padding: '1px',
                        }}
                    />

                    {/* Header */}
                    <div className="h-20 flex items-center border-b border-slate-700/30 text-accent font-semibold text-lg whitespace-nowrap overflow-hidden relative z-10">
                        {/* Icon - locked in 80px container */}
                        <div className="w-20 flex items-center justify-center flex-shrink-0 text-accent drop-shadow-lg">
                            {renderIcon(userSettings?.serverIcon, 28)}
                        </div>
                        {/* Text - appears when expanded */}
                        <AnimatePresence mode="wait">
                            {isExpanded && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.1 }}
                                    className="gradient-text font-bold"
                                >
                                    {userSettings?.serverName || 'Dashboard'}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-1 relative">
                        {/* Dashboard Link */}
                        <a
                            href="/#dashboard"
                            onMouseEnter={() => setHoveredItem('dashboard')}
                            onMouseLeave={() => setHoveredItem(null)}
                            className={(() => {
                                const hash = window.location.hash.slice(1);
                                const shouldBeActive = !hash || hash === 'dashboard';
                                return `flex items-center py-3.5 text-sm font-medium text-slate-300 hover:text-white transition-colors rounded-xl relative`;
                            })()}
                        >
                            {/* Animated hover/active indicator */}
                            {(hoveredItem === 'dashboard' || (!window.location.hash || window.location.hash === '#dashboard')) && (
                                <motion.div
                                    layoutId="sidebarIndicator"
                                    className={`absolute inset-y-1 inset-x-2 rounded-xl ${(!window.location.hash || window.location.hash === '#dashboard')
                                        ? 'bg-accent/20 shadow-lg'
                                        : 'bg-slate-800/60'
                                        }`}
                                    transition={sidebarSpring}
                                />
                            )}
                            {/* Icon - locked in 80px container */}
                            <div className="w-20 flex items-center justify-center flex-shrink-0 relative z-10">
                                <span className={`flex items-center justify-center ${!window.location.hash || window.location.hash === '#dashboard' ? 'text-accent' : ''}`}>
                                    <LayoutDashboard size={20} />
                                </span>
                            </div>
                            {/* Text - appears when expanded */}
                            <AnimatePresence mode="wait">
                                {isExpanded && (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.1 }}
                                        className={`whitespace-nowrap relative z-10 ${!window.location.hash || window.location.hash === '#dashboard' ? 'text-accent' : ''}`}
                                    >
                                        Dashboard
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </a>

                        {/* Tabs Section */}
                        {tabs && tabs.length > 0 && (
                            <>
                                {/* Header for expanded state */}
                                <AnimatePresence mode="wait">
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.1 }}
                                            className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 pt-4 pb-2"
                                        >
                                            Tabs
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Separator for collapsed state */}
                                {!isExpanded && <div className="my-3 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent w-full" />}

                                {/* Ungrouped tabs */}
                                {tabs.filter(tab => !tab.groupId).map(tab => (
                                    <a
                                        key={tab.id}
                                        href={`/#${tab.slug}`}
                                        onMouseEnter={() => setHoveredItem(`tab-${tab.id}`)}
                                        onMouseLeave={() => setHoveredItem(null)}
                                        className={`flex items-center py-3.5 text-sm font-medium text-slate-300 hover:text-white transition-colors rounded-xl relative ${isExpanded ? 'px-4 justify-start' : 'justify-center px-0'} group`}
                                    >
                                        {/* Animated hover/active indicator */}
                                        {(hoveredItem === `tab-${tab.id}` || window.location.hash.slice(1) === tab.slug) && (
                                            <motion.div
                                                layoutId="sidebarIndicator"
                                                className={`absolute inset-y-1 inset-x-2 rounded-xl ${window.location.hash.slice(1) === tab.slug ? 'bg-accent/20 shadow-lg' : 'bg-slate-800/60'}`}
                                                transition={sidebarSpring}
                                            />
                                        )}
                                        <span className={`flex items-center justify-center min-w-[20px] relative z-10 ${window.location.hash.slice(1) === tab.slug ? 'text-accent' : ''} ${isExpanded ? 'mr-3' : ''}`}>
                                            {renderIcon(tab.icon, 20)}
                                        </span>
                                        <AnimatePresence mode="wait">
                                            {isExpanded && (
                                                <motion.span
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{
                                                        ...textSpring,
                                                        exit: { duration: 0.1 },
                                                    }}
                                                    className={`whitespace-nowrap relative z-10 ${window.location.hash.slice(1) === tab.slug ? 'text-accent' : ''}`}
                                                >
                                                    {tab.name}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                        {!isExpanded && (
                                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-slate-800/95 backdrop-blur-sm text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-slate-700">
                                                {tab.name}
                                            </div>
                                        )}
                                    </a>
                                ))}

                                {/* Grouped tabs */}
                                {groups && groups.map(group => {
                                    const groupTabs = tabs.filter(tab => tab.groupId === group.id);
                                    if (groupTabs.length === 0) return null;

                                    return (
                                        <div key={group.id} className={isExpanded ? 'mt-2' : ''}>
                                            {isExpanded ? (
                                                <>
                                                    <button
                                                        onClick={() => toggleGroup(group.id)}
                                                        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-800/40"
                                                    >
                                                        <span>{group.name}</span>
                                                        <ChevronRight
                                                            size={16}
                                                            className="transition-transform duration-300"
                                                            style={{
                                                                transform: expandedGroups[group.id] ? 'rotate(90deg)' : 'rotate(0deg)'
                                                            }}
                                                        />
                                                    </button>
                                                    <AnimatePresence>
                                                        {expandedGroups[group.id] && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                transition={sidebarSpring}
                                                                className="overflow-hidden space-y-1 mt-1"
                                                            >
                                                                {groupTabs.map(tab => (
                                                                    <a
                                                                        key={tab.id}
                                                                        href={`/#${tab.slug}`}
                                                                        onMouseEnter={() => setHoveredItem(`tab-${tab.id}`)}
                                                                        onMouseLeave={() => setHoveredItem(null)}
                                                                        className="flex items-center py-3 px-4 pl-8 text-sm font-medium text-slate-400 hover:text-white transition-colors rounded-xl relative"
                                                                    >
                                                                        {/* Animated hover/active indicator */}
                                                                        {(hoveredItem === `tab-${tab.id}` || window.location.hash.slice(1) === tab.slug) && (
                                                                            <motion.div
                                                                                layoutId="sidebarIndicator"
                                                                                className={`absolute inset-y-1 inset-x-2 rounded-xl ${window.location.hash.slice(1) === tab.slug ? 'bg-accent/20 shadow-lg' : 'bg-slate-800/60'}`}
                                                                                transition={sidebarSpring}
                                                                            />
                                                                        )}
                                                                        <span className={`mr-3 flex items-center justify-center relative z-10 ${window.location.hash.slice(1) === tab.slug ? 'text-accent' : ''}`}>
                                                                            {renderIcon(tab.icon, 20)}
                                                                        </span>
                                                                        <span className={`truncate relative z-10 ${window.location.hash.slice(1) === tab.slug ? 'text-accent' : ''}`}>
                                                                            {tab.name}
                                                                        </span>
                                                                    </a>
                                                                ))}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </>
                                            ) : (
                                                groupTabs.map(tab => (
                                                    <a
                                                        key={tab.id}
                                                        href={`/#${tab.slug}`}
                                                        onMouseEnter={() => setHoveredItem(`tab-${tab.id}`)}
                                                        onMouseLeave={() => setHoveredItem(null)}
                                                        className="flex items-center justify-center py-3.5 text-slate-300 hover:text-white transition-colors rounded-xl relative group"
                                                    >
                                                        {/* Animated hover/active indicator */}
                                                        {(hoveredItem === `tab-${tab.id}` || window.location.hash.slice(1) === tab.slug) && (
                                                            <motion.div
                                                                layoutId="sidebarIndicator"
                                                                className={`absolute inset-y-1 inset-x-2 rounded-xl ${window.location.hash.slice(1) === tab.slug ? 'bg-accent/20 shadow-lg' : 'bg-slate-800/60'}`}
                                                                transition={sidebarSpring}
                                                            />
                                                        )}
                                                        <span className={`flex items-center justify-center relative z-10 ${window.location.hash.slice(1) === tab.slug ? 'text-accent' : ''}`}>
                                                            {renderIcon(tab.icon, 20)}
                                                        </span>
                                                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-slate-800/95 backdrop-blur-sm text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-slate-700">
                                                            {tab.name}
                                                            <span className="text-xs text-slate-400 block">{group.name}</span>
                                                        </div>
                                                    </a>
                                                ))
                                            )}
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </nav>

                    {/* Footer */}
                    <div className="py-3 border-t border-slate-700/50 flex flex-col gap-2 relative">
                        {/* Profile Link */}
                        <a
                            href="/#settings?tab=profile&source=profile"
                            onMouseEnter={() => setHoveredItem('profile')}
                            onMouseLeave={() => setHoveredItem(null)}
                            className={(() => {
                                const hash = window.location.hash.slice(1);
                                const hashParts = hash.split('?');
                                const searchParams = hashParts.length > 1 ? new URLSearchParams(hashParts[1]) : new URLSearchParams();
                                const currentTab = searchParams.get('tab');
                                const source = searchParams.get('source');
                                const isActive = hash.startsWith('settings') && currentTab === 'profile' && source === 'profile';
                                return `flex items-center py-3 text-sm font-medium text-slate-300 hover:text-white transition-colors rounded-xl relative group`;
                            })()}
                        >
                            {/* Animated hover/active indicator */}
                            {(hoveredItem === 'profile' || (hash.startsWith('settings') && currentTab === 'profile' && source === 'profile')) && (
                                <motion.div
                                    layoutId="sidebarIndicator"
                                    className={`absolute inset-y-1 inset-x-2 rounded-xl ${hash.startsWith('settings') && currentTab === 'profile' && source === 'profile' ? 'bg-accent/20 shadow-lg' : 'bg-slate-800/60'}`}
                                    transition={sidebarSpring}
                                />
                            )}
                            {/* Icon - locked in 80px container */}
                            <div className="w-20 flex items-center justify-center flex-shrink-0 relative z-10">
                                <span className={`flex items-center justify-center ${hash.startsWith('settings') && currentTab === 'profile' && source === 'profile' ? 'text-accent' : ''}`}>
                                    {currentUser?.profilePicture ? (
                                        <img
                                            src={currentUser.profilePicture}
                                            alt="Profile"
                                            className="w-[20px] h-[20px] rounded-full object-cover border border-slate-600"
                                        />
                                    ) : (
                                        <UserCircle size={20} />
                                    )}
                                </span>
                            </div>
                            {/* Text - appears when expanded */}
                            <AnimatePresence mode="wait">
                                {isExpanded && (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.1 }}
                                        className={`whitespace-nowrap relative z-10 ${hash.startsWith('settings') && currentTab === 'profile' && source === 'profile' ? 'text-accent' : ''}`}
                                    >
                                        Profile
                                    </motion.span>
                                )}
                            </AnimatePresence>
                            {!isExpanded && (
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-slate-800/95 backdrop-blur-sm text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-slate-700">
                                    {currentUser?.username || 'Profile'}
                                </div>
                            )}
                        </a>

                        {/* Settings Link */}
                        <a
                            href="/#settings"
                            onMouseEnter={() => setHoveredItem('settings')}
                            onMouseLeave={() => setHoveredItem(null)}
                            className={(() => {
                                const hash = window.location.hash.slice(1);
                                const hashParts = hash.split('?');
                                const searchParams = hashParts.length > 1 ? new URLSearchParams(hashParts[1]) : new URLSearchParams();
                                const currentTab = searchParams.get('tab');
                                const source = searchParams.get('source');
                                const isProfilePage = currentTab === 'profile' && source === 'profile';
                                const shouldHighlight = hash.startsWith('settings') && !isProfilePage;
                                return `flex items-center py-3 text-sm font-medium text-slate-300 hover:text-white transition-colors rounded-xl relative`;
                            })()}
                        >
                            {/* Animated hover/active indicator */}
                            {(hoveredItem === 'settings' || (hash.startsWith('settings') && !(currentTab === 'profile' && source === 'profile'))) && (
                                <motion.div
                                    layoutId="sidebarIndicator"
                                    className={`absolute inset-y-1 inset-x-2 rounded-xl ${hash.startsWith('settings') && !(currentTab === 'profile' && source === 'profile') ? 'bg-accent/20 shadow-lg' : 'bg-slate-800/60'}`}
                                    transition={sidebarSpring}
                                />
                            )}
                            {/* Icon - locked in 80px container */}
                            <div className="w-20 flex items-center justify-center flex-shrink-0 relative z-10">
                                <span className={`flex items-center justify-center ${hash.startsWith('settings') && !(currentTab === 'profile' && source === 'profile') ? 'text-accent' : ''}`}>
                                    <SettingsIcon size={20} />
                                </span>
                            </div>
                            {/* Text - appears when expanded */}
                            <AnimatePresence mode="wait">
                                {isExpanded && (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.1 }}
                                        className={`whitespace-nowrap relative z-10 ${hash.startsWith('settings') && !(currentTab === 'profile' && source === 'profile') ? 'text-accent' : ''}`}
                                    >
                                        Settings
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </a>

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            onMouseEnter={() => setHoveredItem('logout')}
                            onMouseLeave={() => setHoveredItem(null)}
                            className="flex items-center py-3 text-sm font-medium text-slate-300 hover:text-red-400 transition-colors rounded-xl relative"
                        >
                            {hoveredItem === 'logout' && (
                                <motion.div
                                    layoutId="sidebarIndicator"
                                    className="absolute inset-y-1 inset-x-2 bg-red-500/10 rounded-xl"
                                    transition={sidebarSpring}
                                />
                            )}
                            {/* Icon - locked in 80px container */}
                            <div className="w-20 flex items-center justify-center flex-shrink-0 relative z-10">
                                <span className="flex items-center justify-center">
                                    <LogOut size={20} />
                                </span>
                            </div>
                            {/* Text - appears when expanded */}
                            <AnimatePresence mode="wait">
                                {isExpanded && (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.1 }}
                                        className="whitespace-nowrap relative z-10"
                                    >
                                        Logout
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </button>
                    </div>
                </motion.aside>
            </>
        );
    }

    // Mobile Sidebar (keep existing mobile implementation - no changes needed)
    return (
        <>
            {/* Backdrop */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/50 z-[49]"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Mobile menu - keep existing implementation */}
            <motion.div
                className="fixed left-4 right-4 z-50 flex flex-col justify-end"
                animate={{
                    maxHeight: isMobileMenuOpen ? '80vh' : '70px',
                    scale: isMobileMenuOpen ? 1 : 0.98,
                }}
                transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                    mass: 0.8,
                }}
                style={{
                    bottom: '1rem',
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, var(--glass-start), var(--glass-end))',
                    backdropFilter: 'blur(var(--blur-strong))',
                    WebkitBackdropFilter: 'blur(var(--blur-strong))',
                    borderRadius: '20px',
                    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6), 0 12px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--border-glass), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                }}
            >
                {/* Mobile menu content - keeping existing implementation unchanged */}
                <div
                    className="absolute inset-0 rounded-[20px] pointer-events-none"
                    style={{
                        background: 'linear-gradient(to top, var(--accent-glow), var(--accent-glow-soft))',
                        WebkitMask: 'linear-gradient(black, black) padding-box, linear-gradient(black, black)',
                        WebkitMaskComposite: 'xor',
                        mask: 'linear-gradient(black, black) padding-box, linear-gradient(black, black)',
                        maskComposite: 'exclude',
                        padding: '1px',
                    }}
                />

                <motion.div
                    className="flex flex-col relative z-10"
                    animate={{
                        opacity: isMobileMenuOpen

                            ? 1 : 0,
                        y: isMobileMenuOpen ? 0 : 20,
                    }}
                    transition={{
                        duration: isMobileMenuOpen ? 0.4 : 0.2,
                        delay: isMobileMenuOpen ? 0.1 : 0,
                        ease: 'easeOut',
                    }}
                    style={{
                        flex: isMobileMenuOpen ? 1 : '0 0 0px',
                        pointerEvents: isMobileMenuOpen ? 'auto' : 'none',
                        minHeight: 0,
                        overflow: 'hidden',
                    }}
                >
                    <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-700/50">
                        <div className="flex items-center gap-3 text-accent font-bold text-xl">
                            {renderIcon(userSettings?.serverIcon, 24)}
                            <span className="gradient-text">{userSettings?.serverName || 'Dashboard'}</span>
                        </div>
                    </div>

                    <div className="overflow-y-auto px-6 pt-4 pb-4" style={{ flex: 1, minHeight: 0 }}>
                        <nav className="space-y-4">
                            {tabs && tabs.length > 0 && (
                                <div>
                                    <motion.div
                                        className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: isMobileMenuOpen ? 1 : 0 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        Tabs
                                    </motion.div>
                                    <div className="space-y-1">
                                        {tabs.map((tab, index) => (
                                            <motion.a
                                                key={tab.id}
                                                href={`/#${tab.slug}`}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="w-full flex items-center gap-3 py-3 px-4 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{
                                                    opacity: isMobileMenuOpen ? 1 : 0,
                                                    y: isMobileMenuOpen ? 0 : 10,
                                                }}
                                                transition={{
                                                    delay: isMobileMenuOpen ? 0.3 + (index * 0.05) : 0,
                                                    duration: 0.3,
                                                }}
                                                whileTap={{ scale: 0.97 }}
                                            >
                                                {renderIcon(tab.icon, 18)}
                                                <span>{tab.name}</span>
                                            </motion.a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </nav>
                    </div>

                    <div className="px-6 pt-4 pb-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(100, 116, 139, 0.3)' }}>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 py-3 px-4 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                        >
                            <LogOut size={20} />
                            <span className="font-medium">Logout</span>
                        </button>
                    </div>
                </motion.div>

                <div
                    className="flex justify-around items-center px-4 relative z-10"
                    style={{
                        height: '70px',
                        flexShrink: 0,
                    }}
                >
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-all py-2 px-3 rounded-lg hover:bg-slate-800/60"
                        style={{
                            transition: 'transform 300ms ease-out',
                        }}
                    >
                        <div style={{
                            transition: 'transform 300ms ease-out',
                            transform: isMobileMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                        }}>
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </div>
                        <span className="text-[10px] font-medium">{isMobileMenuOpen ? 'Close' : 'Menu'}</span>
                    </button>
                    <a
                        href="/#dashboard"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={(() => {
                            const hash = window.location.hash.slice(1);
                            const shouldBeActive = !hash || hash === 'dashboard';
                            return `flex flex-col items-center gap-1 transition-all py-2 px-3 rounded-lg ${shouldBeActive ? 'text-accent bg-accent/20 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`;
                        })()}
                    >
                        <LayoutDashboard size={24} />
                        <span className="text-[10px] font-medium">Dashboard</span>
                    </a>
                    <a
                        href="/#settings?tab=profile&source=profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={(() => {
                            const hash = window.location.hash.slice(1);
                            const hashParts = hash.split('?');
                            const searchParams = hashParts.length > 1 ? new URLSearchParams(hashParts[1]) : new URLSearchParams();
                            const currentTab = searchParams.get('tab');
                            const source = searchParams.get('source');
                            const isActive = hash.startsWith('settings') && currentTab === 'profile' && source === 'profile';
                            return `flex flex-col items-center gap-1 transition-all py-2 px-3 rounded-lg ${isActive ? 'text-accent bg-accent/20 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`;
                        })()}
                    >
                        {currentUser?.profilePicture ? (
                            <img
                                src={currentUser.profilePicture}
                                alt="Profile"
                                className="w-6 h-6 rounded-full object-cover border border-slate-600"
                            />
                        ) : (
                            <UserCircle size={24} />
                        )}
                        <span className="text-[10px] font-medium">Profile</span>
                    </a>
                    <a
                        href="/#settings"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={(() => {
                            const hash = window.location.hash.slice(1);
                            const hashParts = hash.split('?');
                            const searchParams = hashParts.length > 1 ? new URLSearchParams(hashParts[1]) : new URLSearchParams();
                            const currentTab = searchParams.get('tab');
                            const source = searchParams.get('source');
                            const isProfilePage = currentTab === 'profile' && source === 'profile';
                            const shouldHighlight = hash.startsWith('settings') && !isProfilePage;
                            return `flex flex-col items-center gap-1 transition-all py-2 px-3 rounded-lg ${shouldHighlight ? 'text-accent bg-accent/20 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`;
                        })()}
                    >
                        <SettingsIcon size={24} />
                        <span className="text-[10px] font-medium">Settings</span>
                    </a>
                </div>
            </motion.div>
        </>
    );
};

export default Sidebar;
