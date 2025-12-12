# SQLite Migration - Session-by-Session Implementation Plan

## Overview

**Total Sessions:** 3 sessions  
**Total Estimated Effort:** 190-240 tool calls  
**Total Files Modified:** 6 files  
**Total Files Created:** 3 files  

---

## Session 1: Foundation & Infrastructure Setup

**Goal:** Create database infrastructure and schema  
**Estimated Effort:** 50-60 tool calls  
**Duration:** 1-2 hours  

### Tasks

#### 1. Install Dependencies (5-8 tool calls)
- [ ] Update `server/package.json` with `better-sqlite3` dependency
- [ ] Run `npm install` (or document for user)
- [ ] Verify installation successful
- [ ] Test import of `better-sqlite3`

#### 2. Create Database Module (15-20 tool calls)
- [ ] Create `server/database/` directory
- [ ] Create `server/database/db.js` connection singleton
    - Initialize database connection
    - Export db instance
    - Handle connection errors
    - Add WAL mode for better concurrency
- [ ] Test database initialization

#### 3. Create Complete Schema (20-25 tool calls)
- [ ] Create `server/database/schema.sql` with all 8 tables:
    - `users` table + indexes
    - `sessions` table + indexes
    - `user_preferences` table
    - `tab_groups` table
    - `notifications` table + indexes
    - `integrations` table
    - `system_config` table + seed data
    - `custom_icons` table
- [ ] Add all foreign key constraints
- [ ] Add all indexes for performance
- [ ] Test schema creation (empty database)

#### 4. Create Migration Script Skeleton (10-12 tool calls)
- [ ] Create `server/scripts/migrate-to-sqlite.js`
- [ ] Add JSON file reading logic
- [ ] Add database initialization
- [ ] Add validation/verification functions
- [ ] Add error handling framework
- [ ] Document usage

### Deliverables
✅ `server/database/db.js` - Working database connection  
✅ `server/database/schema.sql` - Complete schema with 8 tables  
✅ `server/scripts/migrate-to-sqlite.js` - Migration script skeleton  
✅ `server/package.json` - Updated with better-sqlite3  

### Testing Checklist
- [ ] Database file creates successfully
- [ ] Schema applies without errors
- [ ] All tables exist with correct columns
- [ ] All indexes created
- [ ] Foreign keys enforced

### Rollback Point
**No code changes to production files yet** - can abort safely

---

## Session 2: Users & Configuration Modules

**Goal:** Migrate users.js and userConfig.js to SQLite  
**Estimated Effort:** 70-90 tool calls  
**Duration:** 2-3 hours  

### Tasks

#### 1. Rewrite users.js (40-50 tool calls)
- [ ] Back up original `server/db/users.js`
- [ ] Import database connection from `../database/db`
- [ ] Rewrite 14 functions:
    1. `getUser()` - SELECT by username
    2. `getUserById()` - SELECT by id
    3. `createUser()` - INSERT with RETURNING
    4. `updateUser()` - UPDATE with WHERE
    5. `deleteUser()` - DELETE CASCADE
    6. `listUsers()` - SELECT all without passwords
    7. `createSession()` - INSERT into sessions
    8. `getSession()` - SELECT + expiry check
    9. `revokeSession()` - DELETE session
    10. `revokeAllUserSessions()` - DELETE WHERE userId
    11. `getUserSessions()` - SELECT active sessions
    12. `cleanupExpiredSessions()` - DELETE expired
    13. `getAllUsers()` - SELECT all with passwords
    14. `resetUserPassword()` - UPDATE password
- [ ] Remove all `readDB()` and `writeDB()` functions
- [ ] Keep exports identical (no breaking changes)

#### 2. Test users.js (10-12 tool calls)
- [ ] Test user creation
- [ ] Test user retrieval
- [ ] Test user update
- [ ] Test user deletion
- [ ] Test session management
- [ ] Test concurrent access (multiple creates)

#### 3. Rewrite userConfig.js (20-25 tool calls)
- [ ] Back up original `server/db/userConfig.js`
- [ ] Import database connection
- [ ] Rewrite 7 functions:
    1. `getUserConfig()` - SELECT + JSON.parse columns
    2. `updateUserConfig()` - UPSERT with JSON.stringify
    3. `getUserTabs()` - Extract tabs from config
    4. `addUserTab()` - Update tabs array in JSON column
    5. `updateUserTab()` - Update specific tab in array
    6. `deleteUserTab()` - Remove tab from array
    7. `reorderUserTabs()` - Update tab order
- [ ] Handle JSON serialization/deserialization
- [ ] Maintain deep merge behavior
- [ ] Keep exports identical

#### 4. Test userConfig.js (8-10 tool calls)
- [ ] Test config get/update
- [ ] Test tabs CRUD operations
- [ ] Test theme updates
- [ ] Test dashboard widgets
- [ ] Test user isolation (user1 ≠ user2)

### Deliverables
✅ `server/db/users.js` - Fully migrated to SQLite  
✅ `server/db/userConfig.js` - Fully migrated to SQLite  
✅ All routes still working (no API changes)  

### Testing Checklist
- [ ] Login works (uses users.js)
- [ ] Session validation works
- [ ] User creation via setup works
- [ ] Tabs CRUD via API works
- [ ] Widget save/load works
- [ ] Theme changes persist
- [ ] No route modifications needed

### Rollback Point
**Can revert users.js and userConfig.js if issues found**  
- Restore backup files
- Restart server
- JSON files still intact

---

## Session 3: Remaining Modules & Deployment

**Goal:** Complete migration, test, deploy  
**Estimated Effort:** 70-90 tool calls  
**Duration:** 2-3 hours  

### Tasks

#### 1. Rewrite systemConfig.js (12-15 tool calls)
- [ ] Back up original `server/db/systemConfig.js`
- [ ] Import database connection
- [ ] Rewrite 2 functions:
    1. `getSystemConfig()` - SELECT all keys, rebuild object
    2. `updateSystemConfig()` - UPDATE specific keys
- [ ] Handle key-value storage pattern
- [ ] Maintain validation logic
- [ ] Keep exports identical

#### 2. Rewrite notifications.js (15-20 tool calls)
- [ ] Back up original `server/db/notifications.js`
- [ ] Import database connection
- [ ] Rewrite 6 functions:
    1. `createNotification()` - INSERT
    2. `getNotifications()` - SELECT with filters, pagination
    3. `markAsRead()` - UPDATE read status
    4. `deleteNotification()` - DELETE by id
    5. `markAllAsRead()` - UPDATE all for user
    6. `clearAll()` - DELETE all for user
- [ ] Add index usage (userId, read, timestamp)
- [ ] Keep exports identical

#### 3. Rewrite customIcons.js (12-15 tool calls)
- [ ] Inspect current implementation
- [ ] Back up original
- [ ] Rewrite functions (estimated 4):
    - Store icons as BLOB or base64 TEXT
    - Handle upload/retrieval
    - Track uploader
- [ ] Keep exports identical

#### 4. Fix check-users.js Script (3-5 tool calls)
- [ ] Update `server/scripts/check-users.js`
- [ ] Replace direct JSON read with `listUsers()` import
- [ ] Test script works with SQLite

#### 5. Complete Migration Script (20-25 tool calls)
- [ ] Finish `server/scripts/migrate-to-sqlite.js`
- [ ] Add users migration (JSON → SQLite)
- [ ] Add sessions migration
- [ ] Add user configs migration (per-user files → user_preferences)
- [ ] Add system config migration (config.json → system_config)
- [ ] Add notifications migration
- [ ] Add validation checks (count verification)
- [ ] Add dry-run mode (preview without changes)
- [ ] Add progress reporting

#### 6. Docker Integration (8-10 tool calls)
- [ ] Update `Dockerfile` if needed (better-sqlite3 native deps)
- [ ] Create/update `docker-entrypoint.sh`:
    - Check for JSON files
    - Auto-run migration if detected
    - Start server
- [ ] Test Docker build locally
- [ ] Verify migration runs in container

#### 7. Full System Testing (15-20 tool calls)
- [ ] Test complete user flow (signup → login → use app)
- [ ] Test all CRUD operations (tabs, widgets, users)
- [ ] Test notification system
- [ ] Test system settings
- [ ] Test concurrent users (open 3+ browser tabs)
- [ ] Test migration script with real data
- [ ] Verify data integrity (all records migrated)
- [ ] Test rollback procedure

#### 8. Documentation (5-8 tool calls)
- [ ] Update `README.md` with SQLite info
- [ ] Document backup procedure (copy framerr.db)
- [ ] Document migration process
- [ ] Update environment variables docs if needed
- [ ] Create `docs/dbmigration/DEPLOYMENT.md` guide

### Deliverables
✅ `server/db/systemConfig.js` - Migrated  
✅ `server/db/notifications.js` - Migrated  
✅ `server/db/customIcons.js` - Migrated  
✅ `server/scripts/check-users.js` - Updated  
✅ `server/scripts/migrate-to-sqlite.js` - Complete & tested  
✅ `docker-entrypoint.sh` - Auto-migration support  
✅ `Dockerfile` - Updated if needed  
✅ Documentation updated  

### Testing Checklist
- [ ] All 17 routes work unchanged
- [ ] Login/logout works
- [ ] User management works (admin)
- [ ] Tabs/widgets fully functional
- [ ] Notifications create/read/delete
- [ ] System settings persist
- [ ] Migration script succeeds
- [ ] Docker build succeeds
- [ ] Docker runs with auto-migration
- [ ] Concurrent access tested (5+ users)
- [ ] Performance acceptable (<50ms queries)

### Rollback Point
**Full rollback available:**
- Revert all 6 modified files to backups
- Remove `server/database/` directory
- Restore JSON files from backup
- Remove `better-sqlite3` from package.json
- Restart server

---

## Master Checklist

### Pre-Session 1
- [ ] User approval obtained
- [ ] Backup entire `/config` directory
- [ ] Commit current code to git
- [ ] Tag current version (e.g., `v1.1.9-pre-sqlite`)

### After Session 1
- [ ] Database infrastructure working
- [ ] Schema validated
- [ ] Migration script skeleton created
- [ ] No production code changed yet ✅

### After Session 2
- [ ] 2 DB modules migrated (users, userConfig)
- [ ] 21 functions rewritten
- [ ] All routes still work
- [ ] User/auth/config flows tested ✅

### After Session 3
- [ ] All 6 DB modules migrated
- [ ] Migration script complete
- [ ] Docker integration done
- [ ] Full system tested ✅
- [ ] Documentation updated ✅

### Deployment
- [ ] Build Docker image: `pickels23/framerr:1.2.0-sqlite`
- [ ] Tag as `develop` first for testing
- [ ] User tests in own environment
- [ ] Tag as `latest` after confirmation
- [ ] Update GitHub README
- [ ] Announce migration in changelog

---

## Emergency Procedures

### If Session 1 Fails
**Impact:** None - just infrastructure  
**Action:** Delete `server/database/` folder, remove dependency, retry

### If Session 2 Fails
**Impact:** Users/config might not work  
**Rollback:**
1. Restore `server/db/users.js` from backup
2. Restore `server/db/userConfig.js` from backup
3. Restart server
4. JSON files still intact, app works

### If Session 3 Fails
**Impact:** Some modules on SQLite, some on JSON  
**Rollback:**
1. Restore all 6 DB files from backups
2. Delete `server/database/` directory
3. Restart server
4. Full JSON mode restored

### If Migration Script Corrupts Data
**Impact:** Data loss risk  
**Prevention:**
- Migration script has dry-run mode (test first)
- Validation checks count mismatches
- Auto-backup before migration
- User explicitly confirms migration

**Recovery:**
1. Restore `/config` from backup
2. Restore code from git tag
3. Restart server
4. Diagnose migration issue before retry

---

## Success Criteria

### Performance
- ✅ User login: <50ms (was <200ms)
- ✅ Load 100 notifications: <10ms (was ~100ms)
- ✅ Create tab: <5ms (was ~50ms)
- ✅ Concurrent writes: No errors (was file lock issues)

### Functionality
- ✅ All 17 routes work unchanged
- ✅ Zero frontend changes needed
- ✅ Migration script succeeds on real data
- ✅ Docker auto-migration works

### Reliability
- ✅ ACID transactions (no partial writes)
- ✅ Concurrent access (10+ users)
- ✅ Crash recovery (no corruption)
- ✅ Backup/restore simple (1 file)

---

## Timeline Estimate

**Session 1:** 1-2 hours (infrastructure)  
**Session 2:** 2-3 hours (core modules)  
**Session 3:** 2-3 hours (completion)  

**Total Time:** 5-8 hours of agent work  
**Across:** 3 separate user sessions  
**Over:** 1-3 days (depending on user availability)

---

**Status:** Ready for Session 1  
**Next Step:** User approval, then start Session 1 infrastructure setup  
**Last Updated:** 2025-12-11
