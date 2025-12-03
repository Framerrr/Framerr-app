import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Settings as SettingsIcon, Menu, X, LayoutDashboard, ChevronDown, ChevronUp, LogOut, UserCircle } from 'lucide-react';
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
    const { userSettings, groups } = useAppData();
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Parse query parameters from hash (e.g., /#settings?tab=profile&source=profile)
    const hash = window.location.hash.slice(1); // Remove the '#'
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

        // Handle custom uploaded icons
        if (iconValue.startsWith('custom:')) {
            const iconId = iconValue.replace('custom:', '');
            return <img src={`/api/custom-icons/${iconId}/file`} alt="custom icon" className="object-cover rounded" style={{ width: size, height: size }} />;
        }

        // Handle legacy base64 images
        if (iconValue.startsWith('data:')) {
            return <img src={iconValue} alt="icon" className="object-cover rounded" style={{ width: size, height: size }} />;
        }

        // Handle Lucide icons
        const IconComponent = Icons[iconValue] || Icons.Server;
        return <IconComponent size={size} />;
    };

    // Desktop Sidebar
    if (!isMobile) {
        return (
            <>
                {/* Backdrop when sidebar is expanded */}
                {isExpanded && (
                    <div
                        className="fixed inset-0 bg-black/20 z-30 transition-opacity duration-300"
                        style={{ opacity: isExpanded ? 1 : 0 }}
                    />
                )}

                <aside
                    className="flex flex-col transition-all duration-300 ease-in-out relative fade-in"
                    style={{
                        width: isExpanded ? '280px' : '80px',
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
                    onMouseLeave={() => setIsExpanded(false)}
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
                    <div
                        className={`h-20 flex items-center border-b border-slate-700/30 text-accent font-semibold text-lg whitespace-nowrap overflow-hidden relative z-10 transition-all duration-300 ${isExpanded ? 'justify-start px-6' : 'justify-center px-0'}`}
                    >
                        <div className={`text-accent flex items-center justify-center transition-all duration-300 drop-shadow-lg ${isExpanded ? 'min-w-[28px]' : 'w-full'}`}>
                            {renderIcon(userSettings?.serverIcon, 28)}
                        </div>
                        {isExpanded && (
                            <span className="ml-4 transition-opacity duration-300 opacity-100 gradient-text font-bold">
                                {userSettings?.serverName || 'Dashboard'}
                            </span>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-1 px-3">
                        <a
                            href="/#dashboard"
                            className={(() => {
                                const hash = window.location.hash.slice(1);
                                const shouldBeActive = !hash || hash === 'dashboard';
                                return `flex items-center py-3.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all rounded-xl ${shouldBeActive ? 'bg-accent/20 text-accent shadow-lg' : ''} ${isExpanded ? 'px-4 justify-start' : 'justify-center px-0'}`;
                            })()}
                        >
                            <span className={`flex items-center justify-center min-w-[22px] ${isExpanded ? 'mr-3' : ''}`}>
                                <LayoutDashboard size={22} />
                            </span>
                            <span className={`whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
                                Dashboard
                            </span>
                        </a>

                        {/* Tabs Section */}
                        {tabs && tabs.length > 0 && (
                            <>
                                {/* Header for expanded state */}
                                {isExpanded && (
                                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 pt-4 pb-2">
                                        Tabs
                                    </div>
                                )}

                                {/* Separator for collapsed state */}
                                {!isExpanded && <div className="my-3 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent w-full" />}

                                {/* Ungrouped tabs first */}
                                {tabs.filter(tab => !tab.groupId).map(tab => (
                                    <a
                                        key={tab.id}
                                        href={`/#${tab.slug}`}
                                        className={`flex items-center py-3.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all rounded-xl ${window.location.hash.slice(1) === tab.slug ? 'bg-accent/20 text-accent shadow-lg' : ''} ${isExpanded ? 'px-4 justify-start' : 'justify-center px-0'} relative group`}
                                    >
                                        <span className={`flex items-center justify-center min-w-[22px] ${isExpanded ? 'mr-3' : ''}`}>
                                            {renderIcon(tab.icon, 22)}
                                        </span>
                                        <span className={`whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
                                            {tab.name}
                                        </span>
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
                                                        {expandedGroups[group.id] ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                                    </button>
                                                    <div className={`overflow-hidden transition-all duration-300 space-y-1 ${expandedGroups[group.id] ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                                        {groupTabs.map(tab => (
                                                            <a
                                                                key={tab.id}
                                                                href={`/#${tab.slug}`}
                                                                className={`flex items-center py-3 px-4 pl-8 text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-white transition-all rounded-xl ${window.location.hash.slice(1) === tab.slug ? 'bg-accent/20 text-accent shadow-lg' : ''}`}
                                                            >
                                                                <span className="mr-3 flex items-center justify-center">
                                                                    {renderIcon(tab.icon, 18)}
                                                                </span>
                                                                <span className="truncate">{tab.name}</span>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                groupTabs.map(tab => (
                                                    <a
                                                        key={tab.id}
                                                        href={`/#${tab.slug}`}
                                                        className={`flex items-center justify-center py-3.5 text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all rounded-xl relative group ${window.location.hash.slice(1) === tab.slug ? 'bg-accent/20 text-accent shadow-lg' : ''}`}
                                                    >
                                                        <span className="flex items-center justify-center">
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
                    <div className="p-3 border-t border-slate-700/50 flex flex-col gap-2">
                        <a
                            href="/#settings?tab=profile"
                            className={`flex items-center py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all relative group ${isExpanded ? 'px-4 justify-start' : 'justify-center px-0'}`}
                        >
                            <span className={`flex items-center justify-center min-w-[22px] ${isExpanded ? 'mr-3' : ''}`}>
                                {currentUser?.profilePicture ? (
                                    <img
                                        src={currentUser.profilePicture}
                                        alt="Profile"
                                        className="w-[22px] h-[22px] rounded-full object-cover border border-slate-600"
                                    />
                                ) : (
                                    <UserCircle size={22} />
                                )}
                            </span>
                            <span className={`whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
                                Profile
                            </span>
                            {!isExpanded && (
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-slate-800/95 backdrop-blur-sm text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-slate-700">
                                    {currentUser?.username || 'Profile'}
                                </div>
                            )}
                        </a>
                        <a
                            href="/#settings"
                            className={(() => {
                                const hash = window.location.hash.slice(1);
                                const isActive = hash === 'settings' || hash.startsWith('settings?');
                                return `flex items-center py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all ${isActive ? 'bg-accent/20 text-accent' : ''} ${isExpanded ? 'px-4 justify-start' : 'justify-center px-0'}`;
                            })()}
                        >
                            <span className={`flex items-center justify-center min-w-[22px] ${isExpanded ? 'mr-3' : ''}`}>
                                <SettingsIcon size={20} />
                            </span>
                            <span className={`whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
                                Settings
                            </span>
                        </a>

                        <button
                            onClick={handleLogout}
                            className={`flex items-center py-3 text-sm font-medium text-slate-300 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all ${isExpanded ? 'px-4 justify-start' : 'justify-center px-0'}`}
                        >
                            <span className={`flex items-center justify-center min-w-[22px] ${isExpanded ? 'mr-3' : ''}`}>
                                <LogOut size={20} />
                            </span>
                            <span className={`whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
                                Logout
                            </span>
                        </button>
                    </div>
                </aside>
            </>
        );
    }

    // Mobile Sidebar (Expanding Bottom Bar)
    return (
        <>
            {/* Backdrop - dims main content when menu opens, click to close */}
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

            {/* Unified Expanding Mobile Menu Container */}
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
                {/* Gradient border accent */}
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

                {/* Menu Content Area (hidden when collapsed) - Flex container */}
                <motion.div
                    className="flex flex-col relative z-10"
                    animate={{
                        opacity: isMobileMenuOpen ? 1 : 0,
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
                    {/* Scrollable Nav Section */}
                    <div className="overflow-y-auto px-6 pt-6 pb-4" style={{ flex: 1, minHeight: 0 }}>
                        {/* Menu Header */}
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700/50">
                            <div className="flex items-center gap-3 text-accent font-bold text-xl">
                                {renderIcon(userSettings?.serverIcon, 24)}
                                <span className="gradient-text">{userSettings?.serverName || 'Dashboard'}</span>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="space-y-4">
                            {/* Tabs Section */}
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

                    {/* Fixed Logout Section (above tab bar) */}
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

                {/* Tab Bar (always visible, becomes menu footer when expanded) */}
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
                            // Highlight Settings when on any settings page EXCEPT when source=profile (then Profile button is highlighted)
                            const shouldHighlight = hash.startsWith('settings') && source !== 'profile';
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
