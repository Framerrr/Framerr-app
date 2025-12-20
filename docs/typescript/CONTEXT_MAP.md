# TypeScript Migration - Context Map

**Purpose:** Document what each context provides and who consumes it.  
**Last Updated:** 2025-12-19 - Session 1

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ | Fully analyzed |
| ⬜ | Not analyzed |

---

## AuthContext ✅

**File:** `src/context/AuthContext.jsx`  
**Lines:** 179  
**Hook:** `useAuth()`

### Provides

| Value | Type | Notes |
|-------|------|-------|
| `user` | `User \| null` | Current user object |
| `loading` | `boolean` | Auth check in progress |
| `error` | `string \| null` | Error message |
| `needsSetup` | `boolean` | First-time setup required |
| `login` | `(username: string, password: string, rememberMe: boolean) => Promise<LoginResult>` | |
| `loginWithPlex` | `(plexToken: string, plexUserId: string) => Promise<LoginResult>` | |
| `logout` | `() => void` | Triggers browser navigation to `/api/auth/logout` |
| `checkAuth` | `() => Promise<void>` | Re-check auth status |
| `checkSetupStatus` | `() => Promise<boolean>` | Check if setup needed |
| `isAuthenticated` | `boolean` | Derived: `!!user` |

### Types Needed

```typescript
interface User {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  avatarUrl?: string;
  // ... more fields TBD from API analysis
}

interface LoginResult {
  success: boolean;
  error?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  needsSetup: boolean;
  login: (username: string, password: string, rememberMe: boolean) => Promise<LoginResult>;
  loginWithPlex: (plexToken: string, plexUserId: string) => Promise<LoginResult>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  checkSetupStatus: () => Promise<boolean>;
  isAuthenticated: boolean;
}
```

### Dependencies In

- `react-router-dom`: `useNavigate`, `useLocation`
- `../utils/axiosSetup`: `setLogoutFunction`
- `../utils/logger`

### Consumed By

- All protected components (via `useAuth()`)
- `AppDataContext`, `NotificationContext`, `SystemConfigContext`, `ThemeContext`

---

## AppDataContext ✅

**File:** `src/context/AppDataContext.jsx`  
**Lines:** 180  
**Hook:** `useAppData()`

### Provides

| Value | Type | Notes |
|-------|------|-------|
| `userSettings` | `UserSettings` | Server name, icon, preferences |
| `services` | `Service[]` | Currently empty, placeholder |
| `groups` | `TabGroup[]` | Tab groups from system config |
| `widgets` | `Widget[]` | User's dashboard widgets |
| `integrations` | `Record<string, Integration>` | Enabled integrations |
| `integrationsLoaded` | `boolean` | |
| `integrationsError` | `Error \| null` | |
| `loading` | `boolean` | |
| `updateWidgetLayout` | `(widgets: Widget[]) => Promise<void>` | |
| `refreshData` | `() => Promise<void>` | |

### Types Needed

```typescript
interface UserSettings {
  serverName: string;
  serverIcon: string;
  // ... preferences TBD
}

interface Widget {
  i: string;        // Grid layout ID
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;     // Widget type name
  config: Record<string, any>;  // Widget-specific config
}

interface TabGroup {
  id: number;
  name: string;
  order: number;
}

interface Integration {
  enabled: boolean;
  url?: string;
  apiKey?: string;
  token?: string;
  // ... varies by integration
}

interface AppDataContextValue {
  userSettings: UserSettings;
  services: Service[];
  groups: TabGroup[];
  widgets: Widget[];
  integrations: Record<string, Integration>;
  integrationsLoaded: boolean;
  integrationsError: Error | null;
  loading: boolean;
  updateWidgetLayout: (widgets: Widget[]) => Promise<void>;
  refreshData: () => Promise<void>;
}
```

### Dependencies In

- `AuthContext`: `useAuth()`
- `../utils/permissions`: `isAdmin`
- `../utils/logger`

### Consumed By

- Dashboard, widgets, settings pages

---

## LayoutContext ✅

**File:** `src/context/LayoutContext.jsx`  
**Lines:** 87  
**Hook:** `useLayout()`

### Provides

| Value | Type | Notes |
|-------|------|-------|
| `mode` | `'mobile' \| 'desktop'` | Current layout mode |
| `isMobile` | `boolean` | Derived: `mode === 'mobile'` |
| `isDesktop` | `boolean` | Derived: `mode === 'desktop'` |

### Types Needed

```typescript
type LayoutMode = 'mobile' | 'desktop';

interface LayoutContextValue {
  mode: LayoutMode;
  isMobile: boolean;
  isDesktop: boolean;
}
```

### Dependencies In

- `../constants/layout`: `LAYOUT.MOBILE_THRESHOLD`

### Consumed By

- Sidebar, Dashboard grid, responsive components

---

## SystemConfigContext ✅

**File:** `src/context/SystemConfigContext.jsx`  
**Lines:** 73  
**Hook:** `useSystemConfig()`

### Provides

| Value | Type | Notes |
|-------|------|-------|
| `systemConfig` | `SystemConfig \| null` | Full system config (admin only) |
| `loading` | `boolean` | |
| `refreshSystemConfig` | `() => Promise<void>` | |

### Types Needed

```typescript
interface SystemConfig {
  groups: TabGroup[];
  tabGroups: TabGroup[];
  // ... more TBD from API
}

interface SystemConfigContextValue {
  systemConfig: SystemConfig | null;
  loading: boolean;
  refreshSystemConfig: () => Promise<void>;
}
```

### Dependencies In

- `AuthContext`: `useAuth()`
- `../utils/permissions`: `isAdmin`
- `../utils/logger`

### Consumed By

- Settings pages, admin functionality

---

## ThemeContext ✅

**File:** `src/context/ThemeContext.jsx`  
**Lines:** 99  
**Hook:** `useTheme()`

### Provides

| Value | Type | Notes |
|-------|------|-------|
| `theme` | `string` | Current theme ID (e.g., 'dark-pro') |
| `themes` | `ThemeOption[]` | Available theme options |
| `changeTheme` | `(themeId: string) => Promise<void>` | |
| `loading` | `boolean` | |

### Types Needed

```typescript
interface ThemeOption {
  id: string;
  name: string;
  description: string;
}

interface ThemeContextValue {
  theme: string;
  themes: ThemeOption[];
  changeTheme: (themeId: string) => Promise<void>;
  loading: boolean;
}
```

### Dependencies In

- `AuthContext`: `useAuth()`
- `../utils/logger`
- Theme CSS imports

### Consumed By

- ThemeSettings, any component needing theme info

---

## NotificationContext ✅

**File:** `src/context/NotificationContext.jsx`  
**Lines:** 831 (largest context!)  
**Hook:** `useNotifications()`

### Provides

| Value | Type | Notes |
|-------|------|-------|
| **Toast State** | | |
| `toasts` | `Toast[]` | Active toast notifications |
| `showToast` | `(type, title, message, options?) => string` | Returns toast ID |
| `dismissToast` | `(id: string) => void` | |
| `success` | `(title, message, options?) => string` | Convenience |
| `error` | `(title, message, options?) => string` | Convenience |
| `warning` | `(title, message, options?) => string` | Convenience |
| `info` | `(title, message, options?) => string` | Convenience |
| **Notification Center** | | |
| `notifications` | `Notification[]` | All notifications |
| `unreadCount` | `number` | Computed from notifications |
| `loading` | `boolean` | |
| `fetchNotifications` | `(filters?) => Promise<void>` | |
| `addNotification` | `(notification) => void` | Internal |
| `markAsRead` | `(id: string) => Promise<void>` | |
| `deleteNotification` | `(id: string) => Promise<void>` | |
| `markAllAsRead` | `() => Promise<void>` | |
| `clearAll` | `() => Promise<void>` | |
| `handleRequestAction` | `(id, action) => Promise<any>` | Overseerr approve/decline |
| **Notification Center UI** | | |
| `notificationCenterOpen` | `boolean` | |
| `setNotificationCenterOpen` | `(open: boolean) => void` | |
| `openNotificationCenter` | `() => void` | |
| **SSE/Real-time** | | |
| `connected` | `boolean` | SSE connection status |
| `setConnected` | `(connected: boolean) => void` | Internal |
| `setEventSource` | `(source) => void` | Internal |
| **Web Push** | | |
| `pushSupported` | `boolean` | Browser supports push |
| `pushPermission` | `NotificationPermission` | 'default'/'granted'/'denied' |
| `pushEnabled` | `boolean` | This device subscribed |
| `pushSubscriptions` | `PushSubscription[]` | All user's subscriptions |
| `currentEndpoint` | `string \| null` | This device's endpoint |
| `globalPushEnabled` | `boolean` | Admin toggle |
| `requestPushPermission` | `() => Promise<NotificationPermission>` | |
| `subscribeToPush` | `(deviceName?) => Promise<boolean>` | |
| `unsubscribeFromPush` | `() => Promise<void>` | |
| `removePushSubscription` | `(id: string) => Promise<void>` | |
| `testPushNotification` | `() => Promise<boolean>` | |
| `fetchPushSubscriptions` | `() => Promise<void>` | |
| `fetchGlobalPushStatus` | `() => Promise<void>` | |

### Types Needed

```typescript
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastAction {
  label: string;
  variant?: 'success' | 'danger' | 'default';
  onClick: () => void;
}

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  iconId?: string | null;
  duration: number;
  action?: ToastAction;
  actions?: ToastAction[];
  onBodyClick?: () => void;
  notificationId?: string | null;
  createdAt: Date;
}

interface NotificationMetadata {
  actionable?: boolean;
  requestId?: string;
  // ... varies by notification source
}

interface Notification {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  iconId?: string | null;
  read: boolean;
  metadata?: NotificationMetadata;
  createdAt: string;
}

interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  deviceName: string;
  createdAt: string;
}

interface NotificationFilters {
  unread?: boolean;
  limit?: number;
  offset?: number;
}

interface NotificationContextValue {
  // ... all the values above
}
```

### Dependencies In

- `AuthContext`: `useAuth()`
- `../utils/axiosSetup`: `setNotificationFunctions`
- `../utils/logger`

### Consumed By

- ToastContainer, NotificationCenter, any component showing toasts

---

## Context Dependency Graph

```
AuthContext (Base - no context dependencies)
    ↓
├── AppDataContext (depends on AuthContext)
├── SystemConfigContext (depends on AuthContext)
├── ThemeContext (depends on AuthContext)
└── NotificationContext (depends on AuthContext)

LayoutContext (Independent - no context dependencies)
```

**Conversion Order:**
1. AuthContext (base)
2. LayoutContext (independent)
3. ThemeContext (simpler)
4. SystemConfigContext (simpler)
5. AppDataContext (moderate)
6. NotificationContext (complex - save for last)
