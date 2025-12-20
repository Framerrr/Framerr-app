# TypeScript Migration - Type Registry

**Purpose:** Master reference of all types to be created and their usage locations.  
**Last Updated:** 2025-12-19 - Session 1

---

## Legend

| Status | Meaning |
|--------|---------|
| ⬜ | Not analyzed yet |
| 📋 | Analyzed, type identified |
| ✅ | Type created in `src/types/` |

---

## Core Entity Types

### User 📋

**Status:** Analyzed  
**Definition:** `src/types/user.ts`

```typescript
interface User {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  avatarUrl?: string;
  // Additional fields TBD from Login.jsx and backend API analysis
}
```

**Usage Locations:**
| File | How Used |
|------|----------|
| `AuthContext.jsx` | State: `user` |
| `AppDataContext.jsx` | Reads from `useAuth()` |
| `SystemConfigContext.jsx` | Reads from `useAuth()` |
| `NotificationContext.jsx` | Reads from `useAuth()` |
| `Sidebar.jsx` | Displays user info |
| `ProfileSettings.jsx` | Displays/edits profile |

---

### Widget 📋

**Status:** Analyzed  
**Definition:** `src/types/widget.ts`

```typescript
interface Widget {
  i: string;        // Grid layout ID (react-grid-layout)
  x: number;        // Column position
  y: number;        // Row position
  w: number;        // Width in columns
  h: number;        // Height in rows
  type: string;     // Widget type key from registry
  config: WidgetConfig;  // Widget-specific config
}

// Base config - each widget extends this
interface BaseWidgetConfig {
  [key: string]: any;
}

// Specific widget configs TBD in widget analysis phase
```

**Usage Locations:**
| File | How Used |
|------|----------|
| `AppDataContext.jsx` | State: `widgets` |
| `Dashboard.jsx` | Layout management |
| `WidgetWrapper.jsx` | Renders widgets |
| `widgetRegistry.js` | Widget type registry |

---

### Notification 📋

**Status:** Analyzed  
**Definition:** `src/types/notification.ts`

```typescript
type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationMetadata {
  actionable?: boolean;
  requestId?: string;
  mediaType?: string;
  // ... varies by source
}

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  iconId?: string | null;
  read: boolean;
  metadata?: NotificationMetadata;
  createdAt: string;
}
```

**Usage Locations:**
| File | How Used |
|------|----------|
| `NotificationContext.jsx` | State: `notifications` |
| `NotificationCenter.jsx` | Displays list |
| `ToastNotification.jsx` | Displays individual |

---

### Toast 📋

**Status:** Analyzed  
**Definition:** `src/types/notification.ts`

```typescript
interface ToastAction {
  label: string;
  variant?: 'success' | 'danger' | 'default';
  onClick: () => void;
}

interface Toast {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  iconId?: string | null;
  duration: number;
  action?: ToastAction;           // Legacy single action
  actions?: ToastAction[];        // Multiple actions (approve/decline)
  onBodyClick?: () => void;
  notificationId?: string | null; // Link to notification
  createdAt: Date;
}
```

**Usage Locations:**
| File | How Used |
|------|----------|
| `NotificationContext.jsx` | State: `toasts` |
| `ToastContainer.jsx` | Renders toasts |
| `ToastNotification.jsx` | Individual toast |

---

### TabGroup 📋

**Status:** Analyzed  
**Definition:** `src/types/tab.ts`

```typescript
interface TabGroup {
  id: number;
  name: string;
  order: number;
}
```

**Usage Locations:**
| File | How Used |
|------|----------|
| `AppDataContext.jsx` | State: `groups` |
| `SystemConfigContext.jsx` | In `systemConfig.tabGroups` |
| `TabGroupsSettings.jsx` | Manage groups |

---

### Integration 📋

**Status:** Analyzed  
**Definition:** `src/types/integration.ts`

```typescript
interface BaseIntegration {
  enabled: boolean;
  url?: string;
  apiKey?: string;
}

interface PlexIntegration extends BaseIntegration {
  token: string;
  serverId?: string;
  // ... TBD
}

// Integration map by service name
type IntegrationsMap = Record<string, BaseIntegration>;
```

**Usage Locations:**
| File | How Used |
|------|----------|
| `AppDataContext.jsx` | State: `integrations` |
| `IntegrationsSettings.jsx` | Configure integrations |
| Various widgets | Read integration config |

---

## Context Types 📋

### AuthContextValue

**Status:** Analyzed  
**Source:** `src/context/AuthContext.jsx`

```typescript
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

---

### AppDataContextValue

**Status:** Analyzed  
**Source:** `src/context/AppDataContext.jsx`

```typescript
interface UserSettings {
  serverName: string;
  serverIcon: string;
  [key: string]: any; // Other preferences
}

interface AppDataContextValue {
  userSettings: UserSettings;
  services: any[]; // Currently unused
  groups: TabGroup[];
  widgets: Widget[];
  integrations: IntegrationsMap;
  integrationsLoaded: boolean;
  integrationsError: Error | null;
  loading: boolean;
  updateWidgetLayout: (widgets: Widget[]) => Promise<void>;
  refreshData: () => Promise<void>;
}
```

---

### LayoutContextValue

**Status:** Analyzed  
**Source:** `src/context/LayoutContext.jsx`

```typescript
type LayoutMode = 'mobile' | 'desktop';

interface LayoutContextValue {
  mode: LayoutMode;
  isMobile: boolean;
  isDesktop: boolean;
}
```

---

### SystemConfigContextValue

**Status:** Analyzed  
**Source:** `src/context/SystemConfigContext.jsx`

```typescript
interface SystemConfig {
  groups: TabGroup[];
  tabGroups: TabGroup[];
  // ... more TBD from API analysis
}

interface SystemConfigContextValue {
  systemConfig: SystemConfig | null;
  loading: boolean;
  refreshSystemConfig: () => Promise<void>;
}
```

---

### ThemeContextValue

**Status:** Analyzed  
**Source:** `src/context/ThemeContext.jsx`

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

---

### NotificationContextValue

**Status:** Analyzed  
**Source:** `src/context/NotificationContext.jsx`

```typescript
interface NotificationFilters {
  unread?: boolean;
  limit?: number;
  offset?: number;
}

interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  deviceName: string;
  createdAt: string;
}

interface ToastOptions {
  iconId?: string;
  duration?: number;
  action?: ToastAction;
  actions?: ToastAction[];
  onBodyClick?: () => void;
  notificationId?: string;
}

interface NotificationContextValue {
  // Toast state
  toasts: Toast[];
  showToast: (type: NotificationType, title: string, message: string, options?: ToastOptions) => string;
  dismissToast: (id: string) => void;
  success: (title: string, message: string, options?: ToastOptions) => string;
  error: (title: string, message: string, options?: ToastOptions) => string;
  warning: (title: string, message: string, options?: ToastOptions) => string;
  info: (title: string, message: string, options?: ToastOptions) => string;
  
  // Notification center state
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  
  // Notification actions
  fetchNotifications: (filters?: NotificationFilters) => Promise<void>;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  handleRequestAction: (id: string, action: 'approve' | 'decline') => Promise<any>;
  
  // Notification center UI
  notificationCenterOpen: boolean;
  setNotificationCenterOpen: (open: boolean) => void;
  openNotificationCenter: () => void;
  
  // SSE connection
  connected: boolean;
  setConnected: (connected: boolean) => void;
  setEventSource: (source: EventSource | null) => void;
  
  // Web Push
  pushSupported: boolean;
  pushPermission: NotificationPermission;
  pushEnabled: boolean;
  pushSubscriptions: PushSubscriptionRecord[];
  currentEndpoint: string | null;
  globalPushEnabled: boolean;
  requestPushPermission: () => Promise<NotificationPermission>;
  subscribeToPush: (deviceName?: string) => Promise<boolean>;
  unsubscribeFromPush: () => Promise<void>;
  removePushSubscription: (id: string) => Promise<void>;
  testPushNotification: () => Promise<boolean>;
  fetchPushSubscriptions: () => Promise<void>;
  fetchGlobalPushStatus: () => Promise<void>;
}
```

---

## Utility Types 📋

### Permissions (src/utils/permissions.js)

```typescript
// Permission constants
const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  MANAGE_WIDGETS: 'manage_widgets',
  MANAGE_SYSTEM: 'manage_system',
  MANAGE_USERS: 'manage_users'
} as const;

type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Permission group
interface PermissionGroup {
  id: string;
  permissions: string[];  // '*' for admin
}

// Functions
function isAdmin(user: User | null): boolean;
function hasPermission(user: User | null, permission: string, systemConfig: SystemConfig | null): boolean;
```

---

### Auth Detection (src/utils/authDetection.js)

```typescript
type AuthSensitivity = 'conservative' | 'balanced' | 'aggressive';

interface AuthDetectionResult {
  needsAuth: boolean;
  confidence: number;
  reasons: string[];
  threshold: number;
}

interface IframeAuthConfig {
  enabled?: boolean;
  sensitivity?: AuthSensitivity;
  customPatterns?: string[];
}

// Functions
function matchesAuthPattern(url: string): boolean;
function extractDomain(url: string): string | null;
function hasDomainMismatch(currentUrl: string, expectedUrl: string): boolean;
function matchesUserPattern(url: string, userPatterns: string[]): boolean;
function detectAuthNeed(
  iframeUrl: string, 
  expectedUrl: string, 
  userPatterns?: string[], 
  sensitivity?: AuthSensitivity
): AuthDetectionResult;
```

---

### Axios Setup (src/utils/axiosSetup.js)

```typescript
interface NotificationFunctions {
  error: (title: string, message: string) => void;
}

// Functions
function setNotificationFunctions(fns: NotificationFunctions): void;
function setLogoutFunction(logout: (() => void) | null): void;
function setLoggingOut(value: boolean): void;
```

---

### Layout Utils (src/utils/layoutUtils.js)

```typescript
interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface WidgetWithLayouts {
  id?: string;
  type: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  layouts?: {
    lg?: WidgetLayout;
    sm?: WidgetLayout;
    [key: string]: WidgetLayout | undefined;
  };
}

type Breakpoint = 'lg' | 'sm';

// Functions
function generateMobileLayout(widgets: WidgetWithLayouts[], breakpoint?: Breakpoint): WidgetWithLayouts[];
function generateAllMobileLayouts(widgets: WidgetWithLayouts[]): WidgetWithLayouts[];
function migrateWidgetToLayouts(widget: WidgetWithLayouts): WidgetWithLayouts;
```

---

### Logger (src/utils/logger.js)

```typescript
type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogMeta {
  [key: string]: any;
}

interface StartupConfig {
  version?: string;
  port?: number;
  env?: string;
}

interface Logger {
  level: LogLevel;
  isProduction: boolean;
  error(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  debug(message: string, meta?: LogMeta): void;
  startup(appName: string, config?: StartupConfig): void;
}
```

---

### Widget Registry (src/utils/widgetRegistry.js)

```typescript
import type { LucideIcon } from 'lucide-react';
import type { ComponentType, LazyExoticComponent } from 'react';

type WidgetCategory = 'system' | 'media' | 'downloads' | 'utility' | 'other';

interface WidgetSize {
  w?: number;
  h?: number;
}

interface WidgetMetadata {
  component: LazyExoticComponent<ComponentType<any>>;
  icon: LucideIcon;
  name: string;
  description: string;
  category: WidgetCategory;
  defaultSize: WidgetSize;
  minSize: WidgetSize;
  maxSize?: WidgetSize;
  requiresIntegration?: string | false;
  requiresIntegrations?: string[];  // For multi-integration widgets like Calendar
  defaultConfig?: Record<string, any>;
}

type WidgetTypeKey = 
  | 'system-status' 
  | 'plex' 
  | 'sonarr' 
  | 'radarr' 
  | 'overseerr' 
  | 'qbittorrent' 
  | 'weather' 
  | 'calendar' 
  | 'custom-html' 
  | 'link-grid' 
  | 'clock';

type WidgetTypesRegistry = Record<WidgetTypeKey, WidgetMetadata>;

// Functions
function getWidgetComponent(type: string): ComponentType<any> | null;
function getWidgetIcon(type: string): LucideIcon;
function getWidgetMetadata(type: string): WidgetMetadata | null;
function getWidgetIconName(type: string): string;
function getWidgetsByCategory(): Record<string, Array<{ type: string } & WidgetMetadata>>;
```

---

### Layout Constants (src/constants/layout.js)

```typescript
interface LayoutConstants {
  MOBILE_THRESHOLD: 768;
  SIDEBAR_WIDTH: 96;
  TABBAR_HEIGHT: 86;
  PAGE_MARGIN: 16;
}

const LAYOUT: LayoutConstants;
```

---

### Notification Events (src/constants/notificationEvents.js)

```typescript
interface NotificationEventDef {
  key: string;
  label: string;
  defaultAdmin: boolean;
  defaultUser: boolean;
}

type IntegrationId = 'overseerr' | 'sonarr' | 'radarr';

// Constants
const OVERSEERR_EVENTS: NotificationEventDef[];
const SONARR_EVENTS: NotificationEventDef[];
const RADARR_EVENTS: NotificationEventDef[];
const INTEGRATION_EVENTS: Record<IntegrationId, NotificationEventDef[]>;

// Functions
function getDefaultAdminEvents(integrationId: IntegrationId): string[];
function getDefaultUserEvents(integrationId: IntegrationId): string[];
function getEventLabel(integrationId: IntegrationId, eventKey: string): string;
```

---

### Hook Types

#### useIntegration (src/hooks/useIntegration.js)

```typescript
// Returns integration config or default disabled config
function useIntegration(integrationKey: string): BaseIntegration;

interface FetchIntegrationResult {
  data: null;  // Currently unused
  loading: boolean;
  error: string | null;
}

function useFetchIntegration(integrationKey: string): FetchIntegrationResult;
```

#### useNotification (src/hooks/useNotification.js)

```typescript
interface UseNotificationReturn {
  notify: (type: NotificationType, title: string, message: string, options?: ToastOptions) => string;
  success: (title: string, message: string, options?: ToastOptions) => string;
  error: (title: string, message: string, options?: ToastOptions) => string;
  warning: (title: string, message: string, options?: ToastOptions) => string;
  info: (title: string, message: string, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
}

function useNotification(): UseNotificationReturn;
```

---

## Component Prop Types 📋

### Common Components (src/components/common/)

#### Button Props
```typescript
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ComponentType<{ size?: number }>;
  fullWidth?: boolean;
}
```

#### Card Props
```typescript
type CardPadding = 'sm' | 'md' | 'lg' | 'xl' | 'none';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: CardPadding;
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  divider?: boolean;
}
```

#### Input Props
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ComponentType<{ size?: number }>;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  rows?: number;
}
```

#### Modal Props
```typescript
type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: ModalSize;
  className?: string;
}
```

#### Dropdown Props
```typescript
interface DropdownOption<T = string> {
  value: T;
  label: string;
}

interface DropdownProps<T = string> {
  label?: string;
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}
```

#### LoadingSpinner Props
```typescript
type SpinnerSize = 'sm' | 'md' | 'lg' | 'small' | 'medium' | 'large';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  message?: string;
}
```

#### ColorPicker Props
```typescript
interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  disabled?: boolean;
}

interface ColorPreset {
  name: string;
  value: string;
}
```

#### ProtectedRoute Props
```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string | null;
}
```

#### Integration Message Props
```typescript
interface IntegrationMessageProps {
  serviceName: string;
}
// Used by: IntegrationDisabledMessage, IntegrationConnectionError, IntegrationNoAccessMessage
```

---

### Widget Components (src/components/widgets/)

#### WidgetWrapper Props
```typescript
interface WidgetWrapperProps {
  id: string;
  type: string;
  title?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  editMode?: boolean;
  flatten?: boolean;
  showHeader?: boolean;
  onDelete?: (id: string) => void;
  children: React.ReactNode;
}
```

#### WidgetErrorBoundary Props
```typescript
interface WidgetErrorBoundaryProps {
  children: React.ReactNode;
  widgetType?: string;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
}
```

#### Common Widget Props Pattern
```typescript
// Base props shared by most widgets
interface BaseWidgetProps {
  config?: Record<string, any>;
  editMode?: boolean;
  widgetId?: string;
  onVisibilityChange?: (widgetId: string, visible: boolean) => void;
}

// Example: PlexWidget-specific
interface PlexWidgetConfig {
  hideWhenEmpty?: boolean;
}

interface PlexWidgetProps extends BaseWidgetProps {
  config?: PlexWidgetConfig;
}
```

#### Weather Widget State
```typescript
interface WeatherData {
  temp: number;
  code: number;
  high: number;
  low: number;
  location: string;
}

interface WeatherInfo {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}
```

---

### Notification Components (src/components/notifications/)

#### ToastNotification Props
```typescript
interface ToastNotificationProps {
  id: string;
  type?: NotificationType;
  title: string;
  message: string;
  iconId?: string | null;
  duration?: number;
  action?: ToastAction;      // Legacy single action
  actions?: ToastAction[];   // Multiple actions (approve/decline)
  onBodyClick?: () => void;
  onDismiss: (id: string) => void;
  createdAt?: Date;
}
```

#### NotificationCenter Props
```typescript
interface NotificationCenterProps {
  isMobile?: boolean;
  onClose: () => void;
}
```

---

### Dashboard Components (src/components/dashboard/)

#### AddWidgetModal Props
```typescript
interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widgetType: string) => void;
  integrations?: Record<string, BaseIntegration>;
  isAdmin?: boolean;
  sharedIntegrations?: string[];
}
```

#### EmptyDashboard Props
```typescript
interface EmptyDashboardProps {
  onAddWidget?: () => void;
}
```

---

### Layout/Navigation Components

#### Sidebar State Types
```typescript
interface SidebarTab {
  id: number;
  name: string;
  slug: string;
  url: string;
  icon?: string;
  groupId?: number | null;
  order: number;
}

interface SidebarGroup {
  id: number;
  name: string;
  order: number;
}

interface CurrentUser {
  username: string;
  profilePicture?: string;
}
```

---

### IconPicker Props
```typescript
interface IconPickerProps {
  value: string;
  onChange: (iconValue: string) => void;
  compact?: boolean;
}

interface UploadedIcon {
  id: string;
  filename: string;
  // additional metadata
}
```

---

## Settings Component Patterns 📋

Settings components follow common patterns with these shared types:

```typescript
// Common settings save result
interface SaveResult {
  success: boolean;
  message?: string;
}

// Common form state pattern
interface FormState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  saving: boolean;
}

// Tab configuration for settings with sub-tabs
interface SettingsTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  adminOnly?: boolean;
}

// Spring animation config (used across many components)
interface SpringConfig {
  type: 'spring';
  stiffness: number;
  damping: number;
  mass?: number;
}
```

---

## Widget-Specific Config Types 📋

```typescript
// Calendar Widget
interface CalendarWidgetConfig {
  // TBD - needs closer analysis
}

// Clock Widget  
interface ClockWidgetConfig {
  format?: '12h' | '24h';
  showDate?: boolean;
  timezone?: string;
}

// Plex Widget
interface PlexWidgetConfig {
  hideWhenEmpty?: boolean;
}

// Weather Widget
// No config - uses geolocation

// Link Grid Widget
interface LinkGridItem {
  id: string;
  name: string;
  url: string;
  icon?: string;
}

interface LinkGridWidgetConfig {
  links: LinkGridItem[];
  columns?: number;
}

// Overseerr/Sonarr/Radarr Widgets
interface MediaWidgetConfig {
  limit?: number;
  showType?: 'all' | 'movie' | 'tv';
}

// QBittorrent Widget
interface QBittorrentWidgetConfig {
  showCompleted?: boolean;
  limit?: number;
}

// System Status Widget
interface SystemStatusWidgetConfig {
  refreshInterval?: number;
  showCpu?: boolean;
  showMemory?: boolean;
  showDisk?: boolean;
}
```

---

## API Response Types 📋

```typescript
// Generic API response wrapper
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Auth API
interface LoginResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

interface SetupStatusResponse {
  needsSetup: boolean;
}

// Tabs API
interface TabsResponse {
  tabs: SidebarTab[];
}

// Widgets API  
interface WidgetsResponse {
  widgets: Widget[];
}

// Settings API
interface UserSettingsResponse {
  serverName?: string;
  serverIcon?: string;
  greeting?: string;
  flattenUI?: boolean;
  customColors?: Record<string, string>;
}

// Profile API
interface ProfileResponse {
  username: string;
  displayName?: string;
  email?: string;
  profilePicture?: string;
}
```

---

## Event Types 📋

```typescript
// Custom DOM events used for cross-component communication
interface TabsUpdatedEvent extends CustomEvent {
  detail?: undefined;
}

interface ProfilePictureUpdatedEvent extends CustomEvent {
  detail: {
    profilePicture: string;
  };
}

interface OpenNotificationCenterEvent extends CustomEvent {
  detail?: undefined;
}

interface SystemConfigUpdatedEvent extends CustomEvent {
  detail?: Record<string, any>;
}

interface IntegrationsUpdatedEvent extends CustomEvent {
  detail?: Record<string, any>;
}
```

---

## File Organization Plan

```
src/types/                    # Frontend types
├── index.ts                  # Re-exports all types
├── user.ts                   # User, LoginResult
├── widget.ts                 # Widget, WidgetConfig variants
├── notification.ts           # Notification, Toast, ToastAction
├── tab.ts                    # TabGroup
├── integration.ts            # Integration types
├── theme.ts                  # ThemeOption
├── layout.ts                 # LayoutMode, LayoutConstants
├── api.ts                    # API response types
└── context/
    ├── auth.ts               # AuthContextValue
    ├── appData.ts            # AppDataContextValue
    ├── layout.ts             # LayoutContextValue
    ├── systemConfig.ts       # SystemConfigContextValue
    ├── theme.ts              # ThemeContextValue
    └── notification.ts       # NotificationContextValue

shared/types/                 # SHARED between frontend and backend
├── user.ts                   # User entity
├── notification.ts           # Notification entity
├── integration.ts            # Integration configs
└── api.ts                    # API request/response types

server/types/                 # Backend-only types
├── index.ts                  # Re-exports
├── express.d.ts              # Express type augmentation
├── db.ts                     # Database row types
├── middleware.ts             # Middleware types
├── routes.ts                 # Route handler types
└── services.ts               # Service types
```

---

# BACKEND TYPES

---

## Express Type Augmentation 📋

```typescript
// Augment Express Request with user info
declare global {
  namespace Express {
    interface Request {
      user?: User;
      proxyAuth?: boolean;  // True if authenticated via proxy headers
    }
  }
}
```

---

## Database Row Types 📋

### Users Table
```typescript
interface UserRow {
  id: string;
  username: string;
  passwordHash?: string;
  email?: string;
  displayName?: string;
  group: 'admin' | 'user' | 'guest';
  preferences: string; // JSON string
  plexUserId?: string;
  plexUsername?: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionRow {
  id: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  expiresAt: string;
}
```

### Notifications Table
```typescript
interface NotificationRow {
  id: string;
  userId: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  iconId?: string;
  read: number; // SQLite boolean (0/1)
  metadata?: string; // JSON string
  createdAt: string;
}
```

### System Config Table
```typescript
interface SystemConfigRow {
  key: string;
  value: string;
  updatedAt: string;
}
```

---

## System Config Structure 📋

```typescript
interface SystemConfig {
  server: ServerConfig;
  auth: AuthConfig;
  integrations: IntegrationsConfig;
  groups: PermissionGroup[];
  tabGroups: TabGroup[];
  webPushEnabled: boolean;
  favicon?: FaviconConfig;
}

interface ServerConfig {
  port: number;
  name: string;
}

interface AuthConfig {
  local: { enabled: boolean };
  proxy: ProxyAuthConfig;
  plex: PlexSSOConfig;
  iframe: IframeAuthConfig;
  authPatterns: string[];
}

interface ProxyAuthConfig {
  enabled: boolean;
  headerName?: string;
  emailHeaderName?: string;
  logoutUrl?: string;
}

interface PlexSSOConfig {
  enabled: boolean;
  adminPlexId?: string;
  machineId?: string;
}

interface IframeAuthConfig {
  enabled: boolean;
  endpoint?: string;
}

interface PermissionGroup {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  locked?: boolean;
}

interface FaviconConfig {
  enabled: boolean;
  htmlSnippet?: string;
  uploadedAt?: string;
  uploadedBy?: string;
}
```

---

## Integration Config Types 📋

```typescript
interface IntegrationsConfig {
  plex?: PlexIntegrationConfig;
  sonarr?: ArrIntegrationConfig;
  radarr?: ArrIntegrationConfig;
  overseerr?: OverseerrIntegrationConfig;
  qbittorrent?: QBittorrentIntegrationConfig;
  systemStatus?: SystemStatusIntegrationConfig;
}

interface BaseIntegrationConfig {
  enabled: boolean;
  sharing?: IntegrationSharing;
  webhookConfig?: WebhookConfig;
}

interface PlexIntegrationConfig extends BaseIntegrationConfig {
  url: string;
  token: string;
  machineId?: string;
}

interface ArrIntegrationConfig extends BaseIntegrationConfig {
  url: string;
  apiKey: string;
}

interface OverseerrIntegrationConfig extends BaseIntegrationConfig {
  url: string;
  apiKey: string;
}

interface QBittorrentIntegrationConfig extends BaseIntegrationConfig {
  url: string;
  username: string;
  password: string;
}

interface SystemStatusIntegrationConfig extends BaseIntegrationConfig {
  backend: 'local' | 'glances' | 'custom';
  customUrl?: string;
  glancesUrl?: string;
}

interface IntegrationSharing {
  mode: 'none' | 'all' | 'groups' | 'users';
  groups?: string[];
  users?: string[];
  sharedBy?: string;
  sharedAt?: string;
}

interface WebhookConfig {
  token?: string;
  adminEvents?: string[];
  userEvents?: string[];
  receiveUnmatched?: boolean;
}
```

---

## Route Handler Types 📋

```typescript
import { Request, Response, NextFunction, Router } from 'express';

// Middleware function type
type ExpressMiddleware = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

// Route handler with user
interface AuthenticatedRequest extends Request {
  user: User;
  proxyAuth?: boolean;
}

// Standard API response
interface ApiSuccessResponse<T = unknown> {
  success?: true;
  data?: T;
  message?: string;
}

interface ApiErrorResponse {
  success?: false;
  error: string | { code: string; message: string };
}

type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
```

---

## Webhook Payload Types 📋

```typescript
// Overseerr/Jellyseerr webhook
interface OverseerrWebhookPayload {
  event?: string;
  notification_type?: string;
  notificationType?: string;
  type?: string;
  subject?: string;
  request?: {
    id?: number;
    request_id?: number;
    requestId?: number;
    requestedBy_username?: string;
  };
  media?: {
    title?: string;
    tmdbId?: number;
    tvdbId?: number;
    mediaType?: 'movie' | 'tv';
  };
  issue?: {
    issue_type?: string;
    issue_status?: string;
  };
}

// Sonarr webhook
interface SonarrWebhookPayload {
  eventType: string;
  series?: {
    id: number;
    title: string;
    path: string;
  };
  episodes?: Array<{
    episodeNumber: number;
    seasonNumber: number;
    title: string;
  }>;
  isHealthRestored?: boolean;
  message?: string;
}

// Radarr webhook
interface RadarrWebhookPayload {
  eventType: string;
  movie?: {
    id: number;
    title: string;
    year: number;
    path: string;
  };
  movieFile?: {
    quality: string;
    size: number;
  };
  isHealthRestored?: boolean;
  message?: string;
}
```

---

## Service Types 📋

### NotificationEmitter
```typescript
import { Response } from 'express';
import { EventEmitter } from 'events';

interface SSEConnection {
  userId: string;
  res: Response;
  connectedAt: Date;
}

interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

interface NotificationEmitterInterface extends EventEmitter {
  connections: Map<string, Set<Response>>;
  vapidInitialized: boolean;

  initializeVapid(): Promise<void>;
  getVapidPublicKey(): string | null;
  addConnection(userId: string, res: Response): void;
  removeConnection(userId: string, res: Response): void;
  hasConnection(userId: string): boolean;
  sendSSE(userId: string, notification: Notification): void;
  sendWebPush(userId: string, notification: Notification): Promise<void>;
  sendNotification(userId: string, notification: Notification, options?: { forceWebPush?: boolean }): Promise<void>;
  broadcast(notification: Notification): void;
  getConnectionCount(): number;
}
```

### WebhookUserResolver
```typescript
interface ResolveResult {
  notified: number;
  skipped: number;
  users: string[];
}

interface ResolveParams {
  service: 'overseerr' | 'sonarr' | 'radarr';
  eventKey: string;
  username?: string | null;
  title: string;
  message: string;
  webhookConfig: WebhookConfig;
  metadata?: Record<string, unknown>;
  adminOnly?: boolean;
}
```

---

## Database Function Signatures 📋

### users.js
```typescript
function getUser(username: string): Promise<User | null>;
function getUserById(userId: string): Promise<User | null>;
function createUser(userData: Partial<User>): Promise<User>;
function updateUser(userId: string, updates: Partial<User>): Promise<User>;
function deleteUser(userId: string): Promise<boolean>;
function listUsers(): Promise<User[]>;
function getAllUsers(): Promise<User[]>;
function resetUserPassword(userId: string): Promise<{ temporaryPassword: string }>;

// Sessions
function createSession(userId: string, sessionData: { ipAddress?: string; userAgent?: string }, expiresIn?: number): Promise<Session>;
function getSession(sessionId: string): Promise<Session | null>;
function revokeSession(sessionId: string): Promise<void>;
function revokeAllUserSessions(userId: string): Promise<void>;
function getUserSessions(userId: string): Promise<Session[]>;
function cleanupExpiredSessions(): Promise<void>;
```

### notifications.js
```typescript
function createNotification(data: Partial<Notification>): Promise<Notification>;
function getNotifications(userId: string, filters?: { unread?: boolean; limit?: number; offset?: number }): Promise<{ notifications: Notification[]; unreadCount: number; totalCount: number }>;
function getNotificationById(notificationId: string, userId: string): Promise<Notification | null>;
function markAsRead(notificationId: string, userId: string): Promise<Notification | null>;
function deleteNotification(notificationId: string, userId: string): Promise<boolean>;
function markAllAsRead(userId: string): Promise<number>;
function clearAll(userId: string): Promise<number>;
```

### systemConfig.js
```typescript
function getSystemConfig(): Promise<SystemConfig>;
function updateSystemConfig(updates: Partial<SystemConfig>): Promise<SystemConfig>;
```

---

## Middleware Types 📋

```typescript
// auth.js middleware
function requireAuth(req: Request, res: Response, next: NextFunction): void;
function requireAdmin(req: Request, res: Response, next: NextFunction): void;

// upload.js - multer middleware
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
}
```
