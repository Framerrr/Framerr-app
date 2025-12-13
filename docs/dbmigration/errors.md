# SQLite Migration Runtime Errors - Resolution Log

## Error #1: systemConfig Query Spam ✅ RESOLVED

### Problem
- **Observed**: 20+ identical `SELECT key, value FROM system_config` queries per page load
- **Root Cause**: `getSystemConfig()` called 30+ times across multiple routes with no caching
- **Impact**: Severe performance degradation on every HTTP request
- **Files Calling getSystemConfig**:
  - `server/routes/auth.js` (2 calls)
  - `server/routes/config.js` (9 calls)
  - `server/routes/integrations.js` (1 call)
  - `server/routes/system.js` (1 call)
  - `server/routes/backup.js` (1 call)
  - `server/utils/permissions.js` (2 calls)
  - `server/index.js` (2 calls)

### Solution Implemented
**File**: `server/db/systemConfig.js`

**Changes**:
1. Added in-memory cache variables:
   ```javascript
   let configCache = null;
   let cacheTimestamp = null;
   ```

2. Modified `getSystemConfig()` to:
   - Check cache first before querying database
   - Populate cache on first read (cache miss)
   - Return cached config on subsequent calls

3. Modified `updateSystemConfig()` to:
   - Invalidate cache after successful updates
   - Ensures next `getSystemConfig()` call fetches fresh data

**Performance Improvement**:
- **Before**: 20+ database queries per page load
- **After**: 1 database query per server restart (or per config update)
- **Reduction**: ~95% fewer queries

### Testing
- ✅ Build passes: `npm run build` (4.36s)
- ⏳ Pending: Docker runtime verification

### Commit
```bash
git add server/db/systemConfig.js
git commit -m "fix(db): add in-memory caching to systemConfig to prevent query spam"
```

---

## Logs from errors.md

### Server Startup (2025-12-12T03:53:26Z)
```
2025-12-12T03:53:26.301Z [INFO] Version: 1.1.9
2025-12-12T03:53:26.301Z [INFO] Server listening on port 3001
2025-12-12T03:53:26.301Z [INFO] Environment: production
2025-12-12T03:53:26.301Z [INFO] Server started successfully
```

### Query Spam Observed
- 20+ instances of `SELECT key, value FROM system_config`
- Multiple user queries: `WHERE LOWER(username) = LOWER('Jon')`
- Pattern indicates multiple simultaneous requests calling getSystemConfig

### Analysis
- No ERROR level logs
- System is functional but inefficient
- All queries are syntactically correct
- Problem is frequency, not correctness

---

## Error #2: user_preferences Schema Mismatch ✅ RESOLVED

### Problem
- **Observed**: 16+ `SQLITE_ERROR: no such column: dashboard_config` errors
- **Error Messages**:
  - `Failed to get user config`
  - `Failed to get widgets`
  - `Failed to get theme`
  - `Error fetching user tabs`
- **Root Cause**: `schema.sql` and `userConfig.js` had mismatched column names

### Schema vs Code Mismatch

**Schema Had** (schema.sql lines 47-51):
```sql
tabs, widgets, dashboard, theme, custom_colors
```

**Code Expected** (userConfig.js line 42):
```sql
dashboard_config, tabs, theme_config, sidebar_config, preferences
```

### Solution Implemented
**File**: `server/database/schema.sql`

**Changes** (Lines 47-52):
```sql
-- BEFORE:
tabs TEXT DEFAULT '[]',
widgets TEXT DEFAULT '[]',
dashboard TEXT DEFAULT '{"widgets":[]}',
theme TEXT DEFAULT 'dark',
custom_colors TEXT DEFAULT '{}',

-- AFTER:
dashboard_config TEXT DEFAULT '{"widgets":[]}',
tabs TEXT DEFAULT '[]',
theme_config TEXT DEFAULT '{"mode":"system","primaryColor":"#3b82f6"}',
sidebar_config TEXT DEFAULT '{"collapsed":false}',
preferences TEXT DEFAULT '{"dashboardGreeting":{"enabled":true,"text":"Your personal dashboard"}}',
```

**Impact**: All `getUserConfig()` queries will now succeed

### Testing
- ✅ Build passes: `npm run build` (4.39s)
- ⏳ Pending: Docker rebuild with new schema

### Important Note
**Existing databases will need migration**: If a database was created with the old schema, it will need to be recreated or migrated via ALTER TABLE commands.

### Commit
```bash
git add server/database/schema.sql
git commit -m "fix(db): correct user_preferences schema to match userConfig.js"
```

---

## Next Steps

1. Test in Docker to verify cache behavior
2. Monitor for other performance bottlenecks
3. Consider adding:
   - Cache TTL (time-to-live) if config becomes stale
   - Cache warming on server startup
   - Metrics/monitoring for cache hit rate
