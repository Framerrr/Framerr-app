-- Framerr SQLite Database Schema
-- Version: 1.0.0 (SQLite Migration)
-- Date: 2025-12-11

-- ============================================================================
-- TABLE 1: users
-- Stores user accounts with authentication credentials
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    group_id TEXT NOT NULL DEFAULT 'user',
    is_setup_admin INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    last_login INTEGER
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_group_id ON users(group_id);

-- ============================================================================
-- TABLE 2: sessions
-- Stores active user sessions with expiration
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================================
-- TABLE 3: user_preferences
-- Stores per-user configuration, tabs, widgets, themes
-- JSON columns for flexibility (tabs, widgets, dashboard)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    dashboard_config TEXT DEFAULT '{\"widgets\":[]}',   -- JSON object for dashboard + widgets
    tabs TEXT DEFAULT '[]',                             -- JSON array of tab objects
    theme_config TEXT DEFAULT '{"mode":"system","primaryColor":"#3b82f6"}',  -- JSON theme object
    sidebar_config TEXT DEFAULT '{"collapsed":false}',  -- JSON sidebar settings
    preferences TEXT DEFAULT '{"dashboardGreeting":{"enabled":true,"text":"Your personal dashboard"}}',  -- Other user preferences
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- TABLE 4: tab_groups
-- Stores tab groups and their tabs
-- JSON column for tabs array
-- ============================================================================
CREATE TABLE IF NOT EXISTS tab_groups (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    tabs TEXT DEFAULT '[]',                    -- JSON array of tab objects
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tab_groups_user_id ON tab_groups(user_id);

-- ============================================================================
-- TABLE 5: notifications
-- Stores user notifications with read status
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info',
    read INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- ============================================================================
-- TABLE 6: integrations
-- Stores service integration configurations (Plex, Sonarr, etc.)
-- JSON column for service-specific settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS integrations (
    service_name TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    url TEXT,
    api_key TEXT,
    settings TEXT DEFAULT '{}',                -- JSON object for service-specific settings
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- ============================================================================
-- TABLE 7: system_config
-- Stores system-wide configuration as key-value pairs
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,                       -- Stored as JSON string
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Seed default system configuration
INSERT OR IGNORE INTO system_config (key, value) VALUES 
    ('groups', '{"admin":{"name":"Admin","permissions":["manage_users","manage_groups","manage_system","view_tabs","manage_tabs","view_widgets","manage_widgets","view_integrations","manage_integrations"]},"user":{"name":"User","permissions":["view_tabs","manage_tabs","view_widgets","manage_widgets"]}}'),
    ('appName', '"Framerr"'),
    ('appIcon', '""'),
    ('proxyAuth', '{"enabled":false,"headerName":"Remote-User","headerGroups":"Remote-Groups","autoCreateUsers":false,"defaultGroup":"user","trustedProxies":""}'),
    ('faviconSettings', '{"enabled":false,"htmlSnippet":""}');

-- ============================================================================
-- TABLE 8: custom_icons
-- Stores custom uploaded icons (file-based storage)
-- ============================================================================
CREATE TABLE IF NOT EXISTS custom_icons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,                   -- Relative path to icon file in /config/upload/custom-icons/
    mime_type TEXT NOT NULL,
    uploaded_by TEXT,
    uploaded_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_custom_icons_uploaded_by ON custom_icons(uploaded_by);

-- ============================================================================
-- TRIGGERS: Update timestamps
-- ============================================================================
CREATE TRIGGER IF NOT EXISTS update_user_preferences_timestamp 
AFTER UPDATE ON user_preferences
BEGIN
    UPDATE user_preferences SET updated_at = strftime('%s', 'now') WHERE user_id = NEW.user_id;
END;

CREATE TRIGGER IF NOT EXISTS update_integrations_timestamp 
AFTER UPDATE ON integrations
BEGIN
    UPDATE integrations SET updated_at = strftime('%s', 'now') WHERE service_name = NEW.service_name;
END;

CREATE TRIGGER IF NOT EXISTS update_system_config_timestamp 
AFTER UPDATE ON system_config
BEGIN
    UPDATE system_config SET updated_at = strftime('%s', 'now') WHERE key = NEW.key;
END;

-- ============================================================================
-- TABLE 9: linked_accounts
-- Stores user's linked external service accounts (Plex, Overseerr, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS linked_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    service TEXT NOT NULL,
    external_id TEXT NOT NULL,
    external_username TEXT,
    external_email TEXT,
    metadata TEXT DEFAULT '{}',
    linked_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_linked_accounts_user_id ON linked_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_accounts_service ON linked_accounts(service);
CREATE INDEX IF NOT EXISTS idx_linked_accounts_external_id ON linked_accounts(external_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_linked_accounts_user_service ON linked_accounts(user_id, service);

-- ============================================================================
-- SCHEMA VERSION
-- ============================================================================
-- Schema version 2: Added linked_accounts table
PRAGMA user_version = 2;
