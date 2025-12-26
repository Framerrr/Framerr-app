# Database Reference

**Quick Reference for Framerr Database Architecture**

---

## Overview

Framerr uses **SQLite** with `better-sqlite3` for data persistence.

| Location | Path |
|----------|------|
| Database File | `/config/framerr.db` (Docker) |
| Backups | `/config/backups/` |
| Schema | `server/database/schema.sql` |
| Migrations | `server/database/migrations/` |

---

## Schema Version

Tracked via `PRAGMA user_version`. Check current version:
```sql
PRAGMA user_version;
```

---

## Migration System

### On Server Startup
1. Fresh DB → Initialize schema, set version
2. Existing DB → Check version, run pending migrations
3. Downgrade detected → Refuse to start, preserve data

### Creating New Migrations

1. Create file: `server/database/migrations/NNNN_description.js`
2. Use naming convention: `0004_add_feature.js`
3. Implement `version`, `name`, `up(db)`:

```javascript
module.exports = {
    version: 4,
    name: 'add_feature',
    up(db) {
        // Add column
        db.exec(`ALTER TABLE users ADD COLUMN new_field TEXT`);
    }
};
```

### JSON Column Updates

Use `json-utils.js` for flexible columns:

```javascript
const { addDefaultToJsonColumn } = require('../json-utils');

// Add new default to all users
addDefaultToJsonColumn(db, 'user_preferences', 'preferences', 'newSetting', true);
```

---

## Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `sessions` | Active sessions |
| `user_preferences` | Per-user config (JSON columns) |
| `tab_groups` | Tab organization |
| `notifications` | User notifications |
| `integrations` | Service configs |
| `system_config` | System settings (key-value) |
| `custom_icons` | Uploaded icons |

---

## JSON Columns

Flexible data stored as JSON strings:

| Table | Column | Contains |
|-------|--------|----------|
| `user_preferences` | `dashboard_config` | Widgets, layouts |
| `user_preferences` | `tabs` | User tabs array |
| `user_preferences` | `theme_config` | Theme settings |
| `user_preferences` | `preferences` | User preferences |
| `system_config` | `value` | All system config |

---

## Backups

- Created automatically before migrations
- Stored in `/config/backups/`
- Keeps last 3 backups
- Manual restore: Copy backup file over `framerr.db`
