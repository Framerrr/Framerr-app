---
description: Emergency session recovery
---

# Recover Session

**Status:** PLACEHOLDER - Needs user collaboration to define workflow

## Purpose

Recover from crashed or corrupted sessions.

## Workflow To Be Defined

User will specify:
1. Session crash detection criteria
2. Recovery decision tree
3. Documentation repair procedures
4. Git state verification
5. Uncommitted work handling
6. Context reconstruction steps

## Temporary Manual Process

Until workflow is defined:
1. Check git status: `git status`
2. Check for uncommitted changes
3. Verify build status: `npm run build`
4. Read `docs/tasks/HANDOFF.md`
5. Read `docs/tasks/TASK_CURRENT.md`
6. Ask user for direction on:
   - Keep uncommitted changes?
   - Which task to resume?
   - Need documentation repair?

**Note:** NEVER auto-delete uncommitted work without user approval.
