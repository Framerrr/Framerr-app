---
description: TypeScript migration workflow - integrates with /start-session and /end-session
---

# /tsx-migration

## Overview

This workflow manages the JSX → TSX migration across multiple chat sessions. 
It integrates with the standard `/start-session` and `/end-session` workflows.

---

## Starting a Migration Session

When user invokes `/start-session` and mentions TypeScript migration:

1. **Follow standard `/start-session` steps first**
   - Check branch (should be `feature/typescript-migration`)
   - Read system hub

2. **Read migration state**
   ```
   Read docs/typescript/MIGRATION_STATUS.md
   ```
   - Know current phase (Analysis, Conversion, etc.)
   - Know which folders are complete
   - Know what's next

3. **Read relevant tracking docs**
   ```
   Read docs/typescript/TYPE_REGISTRY.md (if doing analysis)
   Read docs/typescript/CONTEXT_MAP.md (if doing context work)
   Read docs/typescript/FILE_INVENTORY.md (to find next files)
   ```

4. **Report to user:**
   - Current migration progress
   - What was done last session
   - What's next
   - Ready to continue

---

## Analysis Phase Workflow

### Per-Folder Analysis

For each folder being analyzed:

1. **List all files** in the folder
2. **For each file:**
   - `view_file` to see full contents
   - Extract:
     - Component name
     - Props (all parameters)
     - State (useState, useReducer)
     - Contexts used (useContext, custom hooks)
     - Functions that need typing
     - API calls (what responses expected)
   - Document in TYPE_REGISTRY.md

3. **Update FILE_INVENTORY.md**
   - Mark files as analyzed: ⬜ → ✅

4. **Update MIGRATION_STATUS.md**
   - Update folder status
   - Update session log

5. **Checkpoint: Report to user**
   - What was analyzed
   - Key types identified
   - Any issues or questions
   - Wait for confirmation before next folder

### Analysis Order

1. `src/context/` — FIRST (everything depends on these)
2. `src/hooks/` — Small, uses contexts
3. `src/utils/` — Utility functions
4. `src/constants/` — Constants and enums
5. `src/pages/` — Entry points
6. `src/components/` — All remaining components

---

## Conversion Phase Workflow

### Setup (Once)

1. Create `tsconfig.json` with strict mode
2. Install TypeScript dependencies
3. Update ESLint for TypeScript
4. Create `src/types/` folder with core types
5. Verify build still works

### Per-File Conversion

1. **Check dependencies first**
   - If file imports from unconverted files, note it
   - Convert dependencies first when possible

2. **Rename file:** `.jsx` → `.tsx` or `.js` → `.ts`

3. **Add type annotations:**
   - Props interface
   - State types
   - Event handler types
   - Return types where needed

4. **Fix any TypeScript errors**

5. **After each folder: `npm run build`**
   - Must pass before continuing
   - If fails, fix before proceeding

6. **Commit after each folder:**
   ```bash
   git add .
   git commit -m "chore(ts): convert src/[folder]/ to TypeScript"
   ```

7. **Update FILE_INVENTORY.md**
   - Mark files as converted: ⬜ → ✅

---

## Ending a Migration Session

When ending work:

1. **Follow standard `/end-session` steps**

2. **Update migration-specific docs:**
   - `MIGRATION_STATUS.md` — Current progress
   - `FILE_INVENTORY.md` — Mark completed files
   - `TYPE_REGISTRY.md` — Add any new types discovered
   - `CONVERSION_LOG.md` — Session summary

3. **Commit all documentation updates**

4. **Clear handoff:**
   - Exactly where we stopped
   - What's next
   - Any blockers or questions

---

## Key Rules

### During Analysis
- View every file manually — don't just rely on grep
- Document EVERYTHING - props, state, hooks, API calls
- If uncertain about a type, note it for clarification

### During Conversion
- Convert in dependency order
- Build after every folder
- Commit after every successful folder conversion
- Never leave a broken build

### Both Phases
- 1-2 folders per response (checkpoint often)
- Report findings/progress after each folder
- Ask before making major decisions
- Keep documentation in sync with work

---

## Quick Reference

| Doc | Purpose | Update When |
|-----|---------|-------------|
| MIGRATION_STATUS.md | Overall progress | Every session |
| FILE_INVENTORY.md | File-level tracking | After each file analyzed/converted |
| TYPE_REGISTRY.md | Type definitions | When identifying/creating types |
| CONTEXT_MAP.md | Context analysis | During context folder work |
| CONVERSION_LOG.md | Session history | End of each session |

---

## Emergency Recovery

If something breaks:

1. Git is the backup — `feature/typescript-migration` branch
2. Never force push
3. If build breaks, fix before continuing
4. If stuck, ask user before proceeding
