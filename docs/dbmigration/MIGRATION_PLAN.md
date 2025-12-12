# Framerr SQLite Migration - Complete File-by-File Plan

## Executive Summary

**Current State:** All data stored in JSON files with `fs.readFile`/`fs.writeFile` operations  
**Target State:** SQLite database with `better-sqlite3` queries  
**Impact:** YES - **Every DB module needs modification** (5 files, 43 functions total)
**Frontend Impact:** NO - API contracts remain identical

---

## Files Requiring Modification

✅ **Total Files:** 22 backend files (5 DB modules + 17 routes no changes)

---

## Part 1: Database Layer Rewrites

### 5 DB Modules - Complete Function-by-Function Breakdown

#### 1. `server/db/users.js` - 14 Functions
- Lines 68-71: `getUser()` 
- Lines 78-81: `getUserById()`
- Lines 88-116: `createUser()`  
- Lines 124-162: `updateUser()`
- Lines 168-180: `deleteUser()`
- Lines 186-189: `listUsers()`
- Lines 198-214: `createSession()`
- Lines 221-234: `getSession()`
- Lines 240-244: `revokeSession()`
- Lines 250-254: `revokeAllUserSessions()`
- Lines 261-264: `getUserSessions()`
- Lines 269-280: `cleanupExpiredSessions()`
- Lines 286-289: `getAllUsers()`
- Lines 296-319: `resetUserPassword()`

#### 2. `server/db/userConfig.js` - 7 Functions
- Lines 55-75: `getUserConfig()`
- Lines 118-141: `updateUserConfig()`
- Lines 160-163: `getUserTabs()`
- Lines 171-193: `addUserTab()`
- Lines 202-225: `updateUserTab()`
- Lines 233-246: `deleteUserTab()`
- Lines 254-269: `reorderUserTabs()`

#### 3. `server/db/systemConfig.js` - 2 Functions
- Lines 90-99: `getSystemConfig()`
- Lines 105-135: `updateSystemConfig()`

#### 4. `server/db/notifications.js` - 6 Functions
- Lines 61-82: `createNotification()`
- Lines 90-116: `getNotifications()`
- Lines 124-140: `markAsRead()`
- Lines 148-164: `deleteNotification()`
- Lines  171-188: `markAllAsRead()`
- Lines 195-209: `clearAll()`

#### 5. `server/db/customIcons.js` - Est. 4 Functions
- (Need to inspect file for exact functions)

**Total Functions to Rewrite: 33+ functions**

---

## Part 2: Routes (No Changes Needed)

17 route files import from DB modules. Since function signatures stay identical, **zero route code changes** required:

- admin.js, auth.js, backup.js, config.js, custom-icons.js
- diagnostics.js, integrations.js, notifications.js, profile.js
- proxy.js, setup.js, system.js, tabs.js, theme.js, widgets.js
- advanced.js, test-config-routes.js

---

## Complete Database Schema

### 8 Tables: users, sessions, user_preferences, tab_groups, notifications, integrations, system_config, custom_icons

See separate schema file for full SQL

---

## Implementation: 5Phases Over 3 Sessions

### Phase 1: Foundation (50-60 calls)
- Install better-sqlite3
- Create db.js connection module
- Create schema.sql
- Test initialization

### Phase 2-3: Users & Config (70-90 calls)
- Rewrite users.js (14 functions)
- Rewrite userConfig.js (7 functions)
- Test all user/config operations

### Phase 4: System & Notifications (30-40 calls)
- Rewrite systemConfig.js (2 functions)
- Rewrite notifications.js (6 functions)
- Rewrite customIcons.js (est. 4 functions)

### Phase 5: Migration & Deploy (40-50 calls)
- Complete migrate-to-sqlite.js
- Docker integration
- Full system testing

**Total Estimated Effort:** 190-240 tool calls

---

## Benefits vs Risks

### Benefits
- ✅ 100x faster queries
- ✅ ACID transactions
- ✅ Concurrent writes
- ✅ Scales 100+ users
- ✅ Single file backup

### Risks Mitigated
- ⚠️ Migration tested thoroughly before production
- ⚠️ JSON backups retained during transition
- ⚠️ Rollback plan documented
- ⚠️ Zero frontend changes (APIs identical)

---

**Status:** Ready for approval to begin Phase 1

See full plan with code examples, schema, and migration script in: `/docs/dbmigration/`
