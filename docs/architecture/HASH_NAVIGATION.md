Hash Navigation System - Full Implementation Explanation
🎯 What It Is
The hash-based navigation system allows the app to switch between different views (Dashboard, Settings, Tabs) using URL hashes (#) instead of traditional paths, which preserves component state and prevents iFrame reloads.

🔧 Core Concept
Traditional Routing (Before):

domain.com/           ← Dashboard
domain.com/settings   ← Settings
domain.com/tab/radarr ← Tab
Problem: Navigating between these paths causes React Router to unmount/remount components, destroying iFrame state.

Hash-Based Routing (After):

domain.com/#dashboard       ← Dashboard
domain.com/#settings        ← Settings
domain.com/#radarr          ← Tab
Benefit: All views are served from the same path (/*), so components stay mounted. Only visibility toggles with CSS display.

📁 Files Involved & Their Roles
1. Entry Point: 

main.jsx
<BrowserRouter>  // Still uses BrowserRouter (not HashRouter!)
    <App />
</BrowserRouter>
Uses standard BrowserRouter because we're managing hashes manually
React Router serves everything at path /*
2. Routing: 

App.jsx
<Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/setup" element={<Setup />} />
    <Route path="/*" element={
        <ProtectedRoute>
            <Sidebar />
            <main>
                <Routes>
                    <Route path="/*" element={<MainContent />} />
                </Routes>
            </main>
        </ProtectedRoute>
    } />
</Routes>
Role: All authenticated views go through /* → MainContent

3. View Router: 

MainContent.jsx
Purpose: Decides whether to show Dashboard/Tabs or Settings based on hash

const [currentHash, setCurrentHash] = useState('');
useEffect(() => {
    const updateHash = () => {
        const hash = window.location.hash.slice(1); // Remove '#'
        setCurrentHash(hash);
    };
    updateHash();
    window.addEventListener('hashchange', updateHash);
    return () => window.removeEventListener('hashchange', updateHash);
}, []);
const isSettings = currentHash === 'settings' || currentHash.startsWith('settings?');
return (
    <>
        <div style={{ display: isSettings ? 'none' : 'flex' }}>
            <DashboardOrTabs />
        </div>
        <div style={{ display: isSettings ? 'flex' : 'none' }}>
            <UserSettings />
        </div>
    </>
);
Key Points:

Both DashboardOrTabs and 

UserSettings
 are always mounted
Visibility toggled with display: none/flex
Listens to hashchange events for reactive updates
Checks if hash is settings or starts with settings? (for query params)
4. Dashboard/Tab Router: 

DashboardOrTabs.jsx
Purpose: Decides whether to show Dashboard or TabContainer based on hash

const [showTabs, setShowTabs] = useState(false);
useEffect(() => {
    const checkHash = () => {
        const hash = window.location.hash.slice(1);
        
        // Auto-redirect root with no hash to /#dashboard
        if (!hash && location.pathname === '/') {
            window.location.hash = 'dashboard';
            return;
        }
        
        // Show tabs ONLY if hash is an actual tab slug
        // Exclude 'dashboard' and 'settings'
        const isTabHash = hash && 
            hash !== 'dashboard' && 
            !hash.startsWith('dashboard?') && 
            hash !== 'settings' && 
            !hash.startsWith('settings?');
        setShowTabs(isTabHash);
    };
    
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
}, [location]);
return (
    <>
        <div style={{ display: showTabs ? 'none' : 'flex' }}>
            <Dashboard />
        </div>
        <div style={{ display: showTabs ? 'flex' : 'none' }}>
            <TabContainer />
        </div>
    </>
);
Key Logic:

#dashboard → shows Dashboard
#radarr → shows TabContainer with Radarr tab
No hash → auto-redirects to #dashboard
Both components always mounted for persistence
5. Tab Manager: 

TabContainer.jsx
Purpose: Manages multiple iFrame tabs, lazy-loads them

useEffect(() => {
    const handleHashChange = () => {
        const hash = window.location.hash.slice(1);
        if (hash && hash !== 'dashboard' && hash !== 'settings') {
            setActiveSlug(hash);
            setLoadedTabs(prev => new Set([...prev, hash]));
        }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
}, [tabs]);
// Error buttons use hash navigation
<button onClick={() => window.location.hash = 'dashboard'}>
    Go Back
</button>
Key Features:

Lazy-loads iFrames (only renders once visited)
Keeps all loaded iFrames mounted, toggles visibility
Error states navigate using hash
6. Settings Page: 

UserSettings.jsx
Purpose: Manages settings sub-tabs using query parameters in hash

// Manual hash param parser (useSearchParams doesn't work with hashes!)
const getHashParams = () => {
    const hash = window.location.hash.slice(1); // Remove '#'
    const questionMarkIndex = hash.indexOf('?');
    if (questionMarkIndex === -1) return new URLSearchParams();
    const queryString = hash.slice(questionMarkIndex + 1);
    return new URLSearchParams(queryString);
};
useEffect(() => {
    const updateTabFromHash = () => {
        const params = getHashParams();
        const tabFromUrl = params.get('tab');
        if (tabFromUrl) setActiveTab(tabFromUrl);
    };
    updateTabFromHash();
    window.addEventListener('hashchange', updateTabFromHash);
    return () => window.removeEventListener('hashchange', updateTabFromHash);
}, []);
// Tab click handler
<button onClick={() => {
    const params = new URLSearchParams({ tab: tab.id });
    window.location.hash = `settings?${params.toString()}`;
}}>
Critical Fix:

React Router's useSearchParams reads from domain.com?tab=X
But we need params from domain.com/#settings?tab=X
Solution: Manual parsing with getHashParams()
7. Navigation Links: 

Sidebar.jsx
Purpose: All navigation links use hash format

// Desktop Dashboard
<a href="/#dashboard" className={...}>
    <LayoutDashboard />
    Dashboard
</a>
// Desktop Profile
<a href="/#settings?tab=profile">
    <UserCircle />
    Profile
</a>
// Desktop Settings
<a href="/#settings">
    <SettingsIcon />
    Settings
</a>
// Tab Links (generated from API)
<a href={`/#${tab.slug}`}>
    {tab.name}
</a>
// Active state detection
const hash = window.location.hash.slice(1);
const isActive = hash === 'dashboard' || !hash;
Key Changes:

All <NavLink> → <a> tags
All to="/..." → href="/#..."
Active state checks hash instead of isActive prop
📊 URL Structure
Dashboard
domain.com/#dashboard
domain.com/              (auto-redirects to /#dashboard)
Settings
domain.com/#settings                    (default tab)
domain.com/#settings?tab=profile        (profile tab)
domain.com/#settings?tab=customization  (customization tab)
domain.com/#settings?tab=users          (users tab)
Tabs
domain.com/#radarr
domain.com/#sonarr
domain.com/#plex
domain.com/#overseerr
🔄 How Navigation Works
Clicking Dashboard Link:
User clicks <a href="/#dashboard">
Browser updates hash to #dashboard
hashchange event fires
MainContent checks hash → not settings → shows DashboardOrTabs
DashboardOrTabs checks hash → is dashboard → shows Dashboard
Components never unmount, just toggle visibility
Clicking Settings Profile:
User clicks <a href="/#settings?tab=profile">
Browser updates hash to #settings?tab=profile
hashchange event fires
MainContent checks hash → starts with settings → shows 

UserSettings

UserSettings
 parses ?tab=profile → sets active tab to profile
ProfileSettings component renders
Clicking Tab:
User clicks <a href="/#radarr">
Browser updates hash to #radarr
hashchange event fires
MainContent checks hash → not settings → shows DashboardOrTabs
DashboardOrTabs checks hash → not dashboard/settings → shows 

TabContainer

TabContainer
 marks radarr as loaded and active
Radarr iFrame renders (or becomes visible if already loaded)
✨ Benefits
iFrame Persistence: Tabs stay loaded when navigating to dashboard/settings
Component State: Dashboard state preserved when viewing tabs
Browser Navigation: Back/forward buttons work correctly
Performance: No unnecessary component re-initialization
Clean URLs: Hash-based URLs are still shareable and bookmarkable
🔍 Technical Details
Why Not HashRouter?
We use BrowserRouter because:

Need path-based routing for /login and /setup
Want clean URLs for public routes
Manually manage hashes only for authenticated views
Query Parameters in Hash
Format: #view?param=value

✅ Correct: domain.com/#settings?tab=profile
❌ Wrong: domain.com/?tab=profile#settings
React Router's useSearchParams doesn't work with this format, requiring manual parsing.

Display vs Conditional Rendering
// ❌ Unmounts component
{isSettings && <UserSettings />}
// ✅ Preserves component
<div style={{ display: isSettings ? 'flex' : 'none' }}>
    <UserSettings />
</div>
This is the core technique that enables persistence.

That's the complete hash navigation system! All files work together to provide seamless navigation while keeping components mounted for state preservation. 🚀