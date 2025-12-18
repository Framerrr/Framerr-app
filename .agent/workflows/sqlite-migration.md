---
description: SQLite Database Migration - Complete transition from JSON to SQLite
---

# SQLite Migration Workflow

## Status: PLANNING COMPLETE - Ready for Session 1

## Quick Start for Next Session

Read these files IN ORDER:
1. `docs/dbmigration/SESSION_PLAN.md` - **Main implementation guide**
2. `docs/dbmigration/COMPLETE_FILE_AUDIT.md` - All files requiring changes
3. `docs/dbmigration/MIGRATION_PLAN.md` - Overview and architecture

## Current Progress

**Planning:** ✅ Complete (100%)
- [x] All 30 files audited
- [x] 6 files identified for modification
- [x] 3-session plan created
- [x] Schema designed (8 tables)
- [ ] User approval pending

**Implementation:** Not started
- [ ] Session 1: Foundation
- [ ] Session 2: Core Modules  
- [ ] Session 3: Completion

## Session Roadmap

### Session 1: Foundation (50-60 tool calls)
**Goal:** Create infrastructure, no production changes yet

Tasks:
1. Install `better-sqlite3` package
2. Create `server/database/db.js` connection
3. Create `server/database/schema.sql` (8 tables)
4. Create migration script skeleton
5. Test database initialization

**Safe Point:** No production code changed, can abort

### Session 2: Core Modules (70-90 tool calls)
**Goal:** Migrate users and config modules

Tasks:
1. Rewrite `server/db/users.js` (14 functions)
2. Rewrite `server/db/userConfig.js` (7 functions)
3. Test all auth/config flows
4. Verify all 17 routes still work

**Rollback:** Restore 2 backup files if needed

### Session 3: Completion (70-90 tool calls)
**Goal:** Finish migration, deploy

Tasks:
1. Rewrite remaining 3 DB modules
2. Fix check-users.js script
3. Complete migration script
4. Docker integration
5. Full system testing

**Rollback:** Full restoration available

## Critical: User Data Preserved

**✅ ALL USER DATA AUTOMATICALLY TRANSFERRED**
- Migration script reads existing JSON files
- Transfers ALL users, configs, tabs, widgets, notifications
- Zero data loss
- Users keep everything (tabs, widgets, themes, settings)
- No manual reconfiguration needed

## Files Modified: 6
1. `server/db/users.js`
2. `server/db/userConfig.js`
3. `server/db/systemConfig.js`
4. `server/db/notifications.js`
5. `server/db/customIcons.js`
6. `server/scripts/check-users.js`

## Files Created: 3
1. `server/database/db.js`
2. `server/database/schema.sql`
3. `server/scripts/migrate-to-sqlite.js`

## No Changes: 25 files
All routes, middleware, utils work automatically

## Next Steps

1. User reviews and approves plan
2. Start Session 1: Foundation setup
3. Continue with Session 2 and 3
4. Deploy to develop Docker tag
5. User testing
6. Production release

**Total Time:** 5-8 hours across 3 sessions
