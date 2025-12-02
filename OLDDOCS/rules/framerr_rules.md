---
description: Immutable development rules for Framerr project - enforced by Antigravity
---

# Framerr Development Rules

**CRITICAL: These rules are IMMUTABLE and MUST be followed by all AI agents working on Framerr.**

---

## 🔒 RULE 1: Always Test After Code Changes

**Enforcement:** BLOCKING - Agent MUST NOT proceed without passing build

- After ANY file edit, MUST run `npm run build`
- Build MUST pass before proceeding to next change
- If build fails → MUST restore from git immediately using `git checkout -- .`
- NEVER commit code that doesn't build
- NEVER skip this step "to save time"

**Workflow Integration:** 
- `/end_session` requires final build verification
- `/build_develop` requires passing build before Docker

---

## 🔒 RULE 2: View Before Edit

**Enforcement:** BLOCKING - Agent MUST view file before editing

- MUST use `view_file` or `view_file_outline` before ANY edit
- MUST understand context of specific file, as well as any related files or systems that may be affected, before making changes
- MUST understand current systems in place to avoid duplicate, confliciting, or otherwise unnecessary functionality when creating or editing systems 
- NEVER edit files blindly
- NEVER assume file structure without viewing

**Exceptions:** NONE

---

## 🔒 RULE 3: Small, Precise Edits

**Enforcement:** ADVISORY - Agent should follow unless technically impossible

- Edit ONE function or block at a time
- NEVER replace entire files unless absolutely necessary
- Use targeted `replace_file_content` calls
- Keep changes reviewable and reversible
- Multiple small commits > One large commit

**Rationale:** Easier to debug, review, and revert if needed

---

## 🔒 RULE 4: Checkpoint Protocol (CRITICAL)

**Enforcement:** BLOCKING - Agent MUST execute checkpoints

- Execute `/execute_checkpoint` workflow at tool calls #10, #20, #30, etc.
- Re-read `docs/tasks/HANDOFF.md` CRITICAL CONTEXT section at each checkpoint
- Verify context alignment with current task
- Update `docs/tasks/TASK_CURRENT.md` regularly
- If tool calls >= 80 → MUST strongly recommend `/end_session` to user
- If tool calls >= 100 → MUST alert user and insist on session end

**Workflow Integration:**
- `/execute_checkpoint` is auto-triggered every 10 tool calls
- Prevents context drift
- Maintains session quality

---

## 🔒 RULE 5: Git Discipline

**Enforcement:** BLOCKING for corruption, ADVISORY for commits

- Check for file corruption before committing:
  - Unusually large file sizes
  - Syntax errors
  - Build failures
- If corruption detected → MUST alert user, MUST NOT commit
- MUST NOT proceed with Docker deployment if corruption exists
- Use descriptive commit messages: `feat:`, `fix:`, `chore:`
- Auto-commit after successful changes (when clean)

**Corruption Detection:**
- Files >10MB (unexpected for this project)
- Changes shows + and - many more lines than expected
- Build errors after edit
- Syntax errors reported by IDE

---

## 🔒 RULE 6: Documentation Updates

**Enforcement:** BLOCKING for session end, ADVISORY during work

- Update `docs/tasks/TASK_CURRENT.md` after completing subtasks
- Update `docs/tasks/HANDOFF.md` when making architectural changes
- Update `docs/tasks/STATUS.md` at session end (via `/end_session`)
- NEVER let documentation fall out of sync with code

**Workflow Integration:**
- `/end_session` REQUIRES documentation updates
- `/execute_checkpoint` verifies documentation is current

---

## 🔒 RULE 7: Session Start/End Protocol

**Enforcement:** BLOCKING

### Session Start (MUST USE `/start_session`)
- MUST invoke `/start_session` at beginning of work
- MUST read `docs/tasks/HANDOFF.md` CRITICAL CONTEXT first
- MUST check for "SESSION END" marker in `docs/tasks/TASK_CURRENT.md`
- If no marker → MUST invoke `/recover_session`
- MUST initialize checkpoint counter to 0

### Session End (MUST USE `/end_session`)
- MUST invoke `/end_session` when wrapping up
- MUST add explicit session end marker to `docs/tasks/TASK_CURRENT.md`:
  ```markdown
  ---
  ## Session End Marker
  ✅ **SESSION END**
  - Session ended: [timestamp]
  - Status: Ready for next session
  ```
- MUST update all documentation before marking session end
- MUST run final `npm run build` verification

**Workflow Integration:**
- Ensures clean handoffs between sessions
- Prevents work loss or confusion

---

## 🔒 RULE 8: Logging Standards

**Enforcement:** ADVISORY for new code, BLOCKING for centralized logging changes

- Use centralized logger:
  - Frontend: `src/utils/logger.js`
  - Backend: `server/utils/logger.js`
- NEVER use raw `console.log` in production code
- Respect LOG_LEVEL environment variable
- Use appropriate levels: ERROR, WARN, INFO, DEBUG
- NEVER log sensitive data (tokens, passwords, API keys)

**Exception:** Development/debugging (must remove before commit)

---

## 🔒 RULE 9: Deployment Safety

**Enforcement:** BLOCKING

### Before Deployment
- Build MUST pass
- NO corrupted files
- User MUST approve Docker deployments
- User MUST confirm production releases

### Workflow Usage
- Use `/build_develop` for development deployments
- Use `/build_latest` for production releases
- NEVER deploy without workflow
- NEVER deploy manually without user approval

### Version Control
- Production releases MUST have git tags
- MUST update `package.json` version
- MUST update `CHANGELOG.md`
- MUST create changelog in `CHANGELOG/[VERSION].md`

---

## 🔒 RULE 10: File Corruption Prevention

**Enforcement:** BLOCKING

### Detection
Agent MUST check for:
- File sizes >10MB (unusual for this project)
- Syntax errors after edits
- Build failures
- IDE error reports

### Response
If corruption detected:
1. MUST alert user immediately
2. MUST NOT commit corrupted files
3. MUST NOT proceed with deployment
4. MUST restore from git: `git checkout -- [file]`
5. MUST NOT try to "fix forward"

**Rationale:** Clean slate safer than risky repairs

---

## 🔒 RULE 11: User Approval Required

**Enforcement:** BLOCKING

Agent MUST get user approval for:
- Docker deployments (develop or production)
- Production version numbers
- Breaking changes
- File deletions
- Risky operations (database changes, etc.)

Agent MUST NOT:
- Auto-deploy without confirmation
- Make assumptions about version numbers
- Delete files without verification

---

## 🔒 RULE 12: Context Maintenance

**Enforcement:** BLOCKING at checkpoints

### At Every Checkpoint
Agent MUST answer these questions:
1. What is the current task?
2. What was the last thing completed?
3. What should I do next?
4. Are there any blockers?
5. What files am I working on?

If ANY answer is uncertain → MUST re-read full `docs/tasks/HANDOFF.md` + ask user

### If Context Drift Detected
1. MUST stop current work
2. MUST re-read `docs/tasks/HANDOFF.md` fully
3. MUST re-read `docs/tasks/TASK_CURRENT.md`
4. MUST ask user for clarification
5. MUST reset checkpoint counter

---

## 🔒 RULE 14: Theming System Compliance (MANDATORY)

**Enforcement:** BLOCKING - Agent MUST follow theming rules when creating/editing UI

### Required Actions

**Before creating/editing ANY UI component:**
1. Read `docs/legacy/framerr_theming_rules.md` (MANDATORY)
2. Read `docs/theme/DEVELOPER_GUIDE.md`
3. Use ONLY theme utilities (`.bg-theme-primary`, `.text-theme-secondary`, etc.)
4. Test in Light theme BEFORE committing
5. Test with flatten UI enabled

### Absolute Prohibitions
- ❌ NEVER use hardcoded Tailwind colors (`text-white`, `bg-slate-900`, etc.)
- ❌ NEVER use hardcoded hex/RGB colors (`#3b82f6`, `rgb(59,130,246)`, etc.)
- ❌ NEVER mix theme and non-theme classes

### Testing Checklist (BLOCKING)
- [ ] Tested in Light theme
- [ ] Tested with flatten UI enabled  
- [ ] No hardcoded colors (run grep checks)
- [ ] Build passes

**Full Details**: See `docs/legacy/framerr_theming_rules.md`

---

## 🔒 RULE 13: Emergency Procedures

**Enforcement:** BLOCKING when invoked

### Session Crashed
- MUST invoke `/recover_session`
- MUST check git status
- MUST verify build status
- MUST ask user for recovery direction
- NEVER auto-delete uncommitted work

### Build Failures
1. MUST stop immediately
2. MUST restore from git
3. MUST identify failing change
4. MUST fix before proceeding
5. MUST test incrementally

---

## 🚫 NEVER DO THIS (Absolute Prohibitions)

**Enforcement:** BLOCKING - These actions are FORBIDDEN

1. ❌ Edit files without viewing them first
2. ❌ Commit without running `npm run build`
3. ❌ Deploy Docker without user confirmation
4. ❌ Skip checkpoint protocol
5. ❌ Edit multiple files in parallel blindly
6. ❌ Replace entire files when small edits suffice
7. ❌ Commit corrupted files
8. ❌ Continue past 80 tool calls without recommending `/end_session`
9. ❌ Make breaking changes without user approval
10. ❌ Use raw `console.log` instead of centralized logger (in production)
11. ❌ Deploy with build failures
12. ❌ Work without invoking `/start_session` first
13. ❌ End work without invoking `/end_session`
14. ❌ Proceed when context is unclear
15. ❌ **Create/edit UI without reading theming documentation**
16. ❌ **Use hardcoded colors (Tailwind classes, hex, RGB) in UI components**
17. ❌ **Commit UI code without testing in Light theme**
18. ❌ **Skip flatten UI testing for components using glassmorphism**

---

## 📋 Rule Enforcement Levels

### BLOCKING
- Agent MUST NOT proceed if rule is violated
- System should prevent action
- User intervention required to override

### ADVISORY
- Agent SHOULD follow rule unless technically impossible
- Agent should explain if deviating
- User can override more easily

---

## 🔄 Workflow Integration Summary

These rules work seamlessly with workflows:

| Workflow | Rules Enforced |
|----------|----------------|
| `/start_session` | 7 (Session Start), 4 (Checkpoint Init), 14 (Theming Docs) |
| `/end_session` | 7 (Session End), 6 (Documentation), 1 (Build Test) |
| `/execute_checkpoint` | 4 (Checkpoint), 12 (Context Maintenance) |
| `/build_develop` | 1 (Build Test), 5 (Git), 9 (Deployment), 10 (Corruption) |
| `/build_latest` | 1 (Build Test), 5 (Git), 9 (Deployment), 11 (Approval) |
| `/recover_session` | 13 (Emergency) |

---

## 🎯 Rule Priority

**P0 (Critical - BLOCKING):**
- Rule 1: Always Test
- Rule 4: Checkpoint Protocol
- Rule 5: No Corruption Commits
- Rule 7: Session Start/End
- Rule 9: Deployment Safety
- Rule 10: Corruption Prevention
- Rule 11: User Approval
- **Rule 14: Theming System Compliance**

**P1 (Important - BLOCKING at specific times):**
- Rule 6: Documentation Updates
- Rule 12: Context Maintenance
- Rule 13: Emergency Procedures

**P2 (Best Practice - ADVISORY):**
- Rule 2: View Before Edit
- Rule 3: Small Edits
- Rule 8: Logging Standards

---

**These rules ensure code quality, prevent context drift, maintain project stability, and enable safe collaboration between agents and humans.**

**Last Updated:** 2025-11-30  
**Compatible With:** Antigravity Rules System v1.0+  
**Theming System:** Mandatory enforcement as of 2025-11-30
