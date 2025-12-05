import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HashNavLink from './common/HashNavLink';
import { Home, Settings as SettingsIcon, Menu, X, LayoutDashboard, ChevronDown, ChevronUp, LogOut } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [tabs, setTabs] = useState([]);
    const { userSettings, services, groups } = useAppData();
    const { logout } = useAuth();
    const navigate = useNavigate();

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
                console.error('Error fetching tabs:', error);
            }
        };
        fetchTabs();
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
        if (iconValue.startsWith('data:')) {
            return <img src={iconValue} alt="icon" className="object-cover rounded" style={{ width: size, height: size }} />;
        }
        const IconComponent = Icons[iconValue] || Icons.Server;
        return <IconComponent size={size} />;
    };

    // Desktop Sidebar
    if (!isMobile) {
        return (
            <aside
                className="flex flex-col transition-all duration-300 ease-in-out fixed z-50"
                style={{
                    width: isExpanded ? '280px' : '80px',
                    top: '8px',
                    bottom: '8px',
                    left: '8px',
                    background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.98))',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '20px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(71, 85, 105, 0.3)',
                }}
                onMouseEnter={() => setIsExpanded(true)}
                onMouseLeave={() => setIsExpanded(false)}
            >
                {/* Gradient border accent */}
                <div
                    className="absolute inset-0 rounded-[20px] pointer-events-none"
                    style={{
                        background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.1))',
                        WebkitMaskImage: 'linear-gradient(black, black) padding-box, linear-gradient(black, black)',
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                        padding: '1px',
                    }}
                />

                {/* Header */}
                <div
                    className={`h-20 flex items-center border-b border-slate-700/50 text-blue-400 font-semibold text-lg whitespace-nowrap overflow-hidden relative z-10 transition-all duration-300 ${isExpanded ? 'justify-start px-6' : 'justify-center px-0'}`}
                >
                    <div className={`text-blue-400 flex items-center justify-center transition-all duration-300 ${isExpanded ? 'min-w-[28px]' : 'w-full'}`}>
                        {renderIcon(userSettings?.serverIcon, 28)}
                    </div>
                    {isExpanded && (
                        <span className="ml-4 transition-opacity duration-300 opacity-100">
                            {userSettings?.serverName || 'Dashboard'}
                        </span>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-1 px-3">
                    <HashNavLink
                        to="#dashboard"
                        className={({ isActive }) => `flex items-center py-3.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all rounded-xl ${isActive ? 'bg-blue-600/20 text-blue-400 shadow-lg shadow-blue-600/20' : ''} ${isExpanded ? 'px-4 justify-start' : 'justify-center px-0'}`}
                    >
                        <span className={`flex items-center justify-center min-w-[22px] ${isExpanded ? 'mr-3' : ''}`}>
                            <LayoutDashboard size={22} />
                        </span>
                        <span className={`whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
                            Dashboard
                        </span>
                    </HashNavLink>

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
                                <HashNavLink
                                    key={tab.id}
                                    to={`#${tab.slug}`}
                                    className={({ isActive }) => `flex items-center py-3.5 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all rounded-xl ${isActive ? 'bg-blue-600/20 text-blue-400 shadow-lg shadow-blue-600/20' : ''} ${isExpanded ? 'px-4 justify-start' : 'justify-center px-0'} relative group`}
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
                                </HashNavLink>
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
                                                        <HashNavLink
                                                            key={tab.id}
                                                            to={`#${tab.slug}`}
                                                            className={({ isActive }) => `flex items-center py-3 px-4 pl-8 text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-white transition-all rounded-xl ${isActive ? 'bg-blue-600/20 text-blue-400 shadow-lg shadow-blue-600/20' : ''}`}
                                                        >
                                                            <span className="mr-3 flex items-center justify-center">
                                                                {renderIcon(tab.icon, 18)}
                                                            </span>
                                                            <span className="truncate">{tab.name}</span>
                                                        </HashNavLink>
                                                    ))}
                                                </div>
                                            </>
                                        ) : (
                                            groupTabs.map(tab => (
                                                <HashNavLink
                                                    key={tab.id}
                                                    to={`#${tab.slug}`}
                                                    className={({ isActive }) => `flex items-center justify-center py-3.5 text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all rounded-xl relative group ${isActive ? 'bg-blue-600/20 text-blue-400 shadow-lg shadow-blue-600/20' : ''}`}
                                                >
                                                    <span className="flex items-center justify-center">
                                                        {renderIcon(tab.icon, 20)}
                                                    </span>
                                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-slate-800/95 backdrop-blur-sm text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-slate-700">
                                                        {tab.name}
                                                        <span className="text-xs text-slate-400 block">{group.name}</span>
                                                    </div>
                                                </HashNavLink>
                                            ))
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {isExpanded && groups && groups.length > 0 && (
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 pt-4 pb-2">
                            Services
                        </div>
                    )}

                    {!isExpanded && <div className="my-3 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent w-full" />}

                    {groups && groups.map(group => {
                        const groupServices = services?.filter(s => s.groupId === group.id) || [];
                        if (groupServices.length === 0) return null;

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
                                            {groupServices.map(service => (
                                                <button
                                                    key={service.id}
                                                    onClick={() => navigate(`/service/${service.id}`)}
                                                    className="w-full flex items-center py-3 px-4 pl-8 text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-white transition-all rounded-xl text-left group"
                                                >
                                                    <span className="mr-3 flex items-center justify-center group-hover:text-blue-400 transition-colors">
                                                        {renderIcon(service.icon, 18)}
                                                    </span>
                                                    <span className="truncate">{service.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    groupServices.map(service => (
                                        <button
                                            key={service.id}
                                            onClick={() => navigate(`/service/${service.id}`)}
                                            className="w-full flex items-center justify-center py-3.5 text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all rounded-xl relative group"
                                            title={service.name}
                                        >
                                            <span className="flex items-center justify-center group-hover:text-blue-400 transition-colors">
                                                {renderIcon(service.icon, 20)}
                                            </span>
                                            {/* Tooltip for collapsed state */}
                                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-slate-800/95 backdrop-blur-sm text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-slate-700">
                                                {service.name}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-slate-700/50 flex flex-col gap-2">
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

                    <HashNavLink
                        to="#settings"
                        className={({ isActive }) => `flex items-center py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all ${isActive ? 'bg-blue-600/20 text-blue-400' : ''} ${isExpanded ? 'px-4 justify-start' : 'justify-center px-0'}`}
                    >
                        <span className={`flex items-center justify-center min-w-[22px] ${isExpanded ? 'mr-3' : ''}`}>
                            <SettingsIcon size={20} />
                        </span>
                        <span className={`whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
                            Settings
                        </span>
                    </HashNavLink>
                </div>
            </aside>
        );
    }

    // Mobile Sidebar (Bottom Bar)
    return (
        <>
            <div className="fixed bottom-2 left-2 right-2 h-16 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl flex justify-around items-center z-50 px-4 shadow-lg">
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="flex flex-col items-center gap-1 text-slate-400 hover:text-white">
                    <Menu size={24} />
                    <span className="text-[10px]">Menu</span>
                </button>
                <HashNavLink to="#dashboard" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-blue-500' : 'text-slate-400 hover:text-white'}`}>
                    <LayoutDashboard size={24} />
                    <span className="text-[10px]">Dashboard</span>
                </HashNavLink>
                <HashNavLink to="#settings" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-blue-500' : 'text-slate-400 hover:text-white'}`}>
                    <SettingsIcon size={24} />
                    <span className="text-[10px]">Settings</span>
                </HashNavLink>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/50 z-[51] flex items-end" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="w-full max-h-[80vh] bg-slate-900 rounded-t-2xl p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                            <div className="flex items-center gap-3 text-blue-500 font-bold text-xl">
                                {renderIcon(userSettings?.serverIcon, 24)}
                                <span>{userSettings?.serverName || 'Dashboard'}</span>
                            </div>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <nav className="space-y-4">
                            {/* Tabs Section */}
                            {tabs && tabs.length > 0 && (
                                <div>
                                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Tabs</div>
                                    <div className="space-y-1">
                                        {tabs.map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => {
                                                    window.location.hash = `#${tab.slug}`;
                                                    setIsMobileMenuOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 py-3 px-4 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                                            >
                                                {renderIcon(tab.icon, 18)}
                                                <span>{tab.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {groups && groups.map(group => {
                                const groupServices = services?.filter(s => s.groupId === group.id) || [];
                                if (groupServices.length === 0) return null;

                                return (
                                    <div key={group.id}>
                                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{group.name}</div>
                                        <div className="space-y-1">
                                            {groupServices.map(service => (
                                                <button
                                                    key={service.id}
                                                    onClick={() => {
                                                        navigate(`/service/${service.id}`);
                                                        setIsMobileMenuOpen(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 py-3 px-4 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                                                >
                                                    {renderIcon(service.icon, 18)}
                                                    <span>{service.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </nav>

                        {/* Logout Button */}
                        <div className="mt-6 pt-6 border-t border-slate-800">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 py-3 px-4 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                            >
                                <LogOut size={20} />
                                <span className="font-medium">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
