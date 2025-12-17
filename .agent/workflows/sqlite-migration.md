---
description: How to add new database tables or modify schema
---

# Database Schema Changes

## When to Use

- Adding new SQLite tables
- Modifying existing tables (ALTER TABLE)
- Adding indexes
- Schema version bumps

---

## Steps

### 1. Read Reference Doc
```
Read docs/reference/database.md
```
- Understand migration system
- Know current schema version

### 2. Check Current Schema Version
```bash
# In SQLite:
PRAGMA user_version;
```
Or check `server/database/schema.sql` header comment.

### 3. Create Migration File

**Location:** `server/database/migrations/NNNN_description.js`

**Naming:** Increment version number (e.g., `0002_add_linked_accounts.js`)

**Template:**
```javascript
module.exports = {
    version: 2, // Must match NNNN in filename
    name: 'add_linked_accounts',
    up(db) {
        db.exec(`
            CREATE TABLE IF NOT EXISTS linked_accounts (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                service TEXT NOT NULL,
                external_id TEXT NOT NULL,
                external_username TEXT,
                linked_at INTEGER DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_linked_accounts_user_id ON linked_accounts(user_id);
            CREATE INDEX IF NOT EXISTS idx_linked_accounts_service ON linked_accounts(service);
        `);
    }
};
```

### 4. Update Base Schema

Also add table to `server/database/schema.sql` for fresh installs.

Increment `PRAGMA user_version` at end of schema.sql.

### 5. Create DB Module (if needed)

**Location:** `server/db/linkedAccounts.js`

**Pattern:** Follow existing modules (users.js, notifications.js):
- Import db connection
- Export CRUD functions
- Use parameterized queries

### 6. Test Migration

```bash
# Delete local DB to test fresh install
rm -f config/framerr.db

# Or test migration on existing DB
npm run dev
# Check logs for migration messages
```

### 7. Build and Commit

```bash
npm run build
git add .
git commit -m "feat(db): add linked_accounts table"
```

---

## For JSON Columns (system_config)

If adding data to existing `system_config` table:

```javascript
// No migration needed - just add default in code
const defaultValue = JSON.stringify({ ... });
// INSERT OR IGNORE handles fresh installs
```

---

## Rollback

- Migrations run on startup
- If migration fails → server won't start
- Restore backup from `/config/backups/`
- Or manually fix and retry

---

## Quick Reference

| Task | Location |
|------|----------|
| Schema definition | `server/database/schema.sql` |
| Migrations | `server/database/migrations/*.js` |
| DB connection | `server/database/db.js` |
| DB modules | `server/db/*.js` |
| Backups | `/config/backups/` |
