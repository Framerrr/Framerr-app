# Framerr Workflow Reference Guide

**For User:** Quick reference to know what the agent will do when you invoke a workflow.

---

## Core Session Workflows

### `/start-session`

**When to Use:** Beginning of every chat/work session

**What It Does:**
1. ✅ **Checks** Git status (`git status`, `git branch`)
2. ✅ **Verifies** build passes (`npm run build`)
3. ✅ **Reads** documentation:
   - `docs/CHATFLOW.md` - Quick start guide
   - `docs/tasks/HANDOFF.md` - CRITICAL CONTEXT (most important!)
   - `docs/tasks/TASK_CURRENT.md` - Check for session end marker
   - `docs/architecture/ARCHITECTURE.md` - If working with files
   - `docs/theming/DEVELOPER_GUIDE.md` - If working on UI
4. ✅ **Initializes** checkpoint tracking (tool call counter = 0)
5. ✅ **Summarizes** current state back to you
6. ✅ **Waits** for task assignment

**Writes:**
- `docs/tasks/TASK_CURRENT.md` - Initialize new session section

**Requires Approval:** No

**Duration:** ~5 tool calls

---

### `/checkpoint`

**When to Use:** Auto-runs every 10 tool calls (or manually invoke)

**What It Does:**
1. ✅ **Stops** current work momentarily
2. ✅ **Re-reads** CRITICAL CONTEXT section of HANDOFF.md
3. ✅ **Verifies** context by answering:
   - What is the current task?
   - What was the last thing completed?
   - What should I do next?
   - Are there any blockers?
   - What files am I working on?
4. ✅ **Checks** Git status
5. ✅ **Updates** `docs/tasks/TASK_CURRENT.md` with checkpoint log
6. ✅ **Warns** about session length:
   - 50 tool calls: "Consider wrapping up"
   - 80 tool calls: "Strongly recommend /end-session"
   - 100 tool calls: "Must end session"
7. ✅ **Resumes** work

**Writes:**
- `docs/tasks/TASK_CURRENT.md` - Append checkpoint entry

**Requires Approval:** No

**Duration:** ~2-3 tool calls

---

### `/end-session`

**When to Use:** End of chat, natural stopping point, or after 80+ tool calls

**What It Does:**
1. ✅ **Completes** current subtask if close to done
2. ✅ **Runs** final build verification (`npm run build`)
3. ✅ **Updates** documentation:
   - `docs/tasks/TASK_CURRENT.md` - Add session end marker, achievements, next steps
   - `docs/tasks/HANDOFF.md` - Update if major changes made
   - `docs/tasks/STATUS.md` - Update progress, recent activity
   - `docs/tasks/TASK_COMPLETED.md` - Append session summary
   - `docs/tasks/TASK_BACKLOG.md` - Update if applicable
4. ✅ **Verifies** all updates succeeded
5. ✅ **Commits** work to Git (with your approval)
6. ✅ **Provides** handoff summary to you

**Writes:**
- Multiple docs in `docs/tasks/`

**Requires Approval:** Yes (for Git commit)

**Duration:** ~10-12 tool calls

---

## Build & Deployment Workflows

### `/build-develop`

**When to Use:** After making changes, want to deploy to development environment

**What It Does:**
1. ✅ **Verifies** build passes (`npm run build`)
2. ✅ **Checks** for corrupted files (file size, syntax)
3. ✅ **Builds** standard develop image:
   ```bash
   docker build -t pickels23/framerr:develop .
   ```
4. ✅ **Builds** debug image (with source maps):
   ```bash
   docker build -f Dockerfile.dev -t pickels23/framerr:develop-debug .
   ```
5. ✅ **Pushes** both to Docker Hub:
   ```bash
   docker push pickels23/framerr:develop
   docker push pickels23/framerr:develop-debug
   ```
6. ✅ **Updates** `docs/tasks/HANDOFF.md` with image digests and timestamp
7. ✅ **Commits** changes to `develop` branch

**Writes:**
- `docs/tasks/HANDOFF.md` - Docker deployment info

**Requires Approval:** Yes (before pushing to Docker Hub)

**Duration:** ~15-20 tool calls (includes Docker build time)

**Result:** Two Docker images on Hub:
- `pickels23/framerr:develop` - Production-like build (minified)
- `pickels23/framerr:develop-debug` - Same code with source maps for debugging

---

### `/build-production`

**When to Use:** Ready to create a production release

**What It Does:**
1. ✅ **Asks** for version number (e.g., 1.1.7)
2. ✅ **Confirms** with you before proceeding
3. ✅ **Ensures** on `main` branch (`git checkout main`)
4. ✅ **Merges** `develop` → `main` (if not already)
5. ✅ **Updates** `package.json` version
6. ✅ **Creates** `CHANGELOG.md` entry
7. ✅ **Runs** build verification (`npm run build`)
8. ✅ **Builds** production images:
   ```bash
   docker build -t pickels23/framerr:1.1.7 .
   docker build -t pickels23/framerr:latest .
   ```
9. ✅ **Pushes** to Docker Hub
10. ✅ **Creates** Git tag (`v1.1.7`)
11. ✅ **Commits** and pushes to `main`
12. ✅ **Updates** documentation:
    - `docs/tasks/STATUS.md` - Production deployment info
    - `docs/tasks/HANDOFF.md` - Production version

**Writes:**
- `package.json` - Version
- `CHANGELOG.md` - Release notes
- `docs/tasks/STATUS.md` - Production status
- `docs/tasks/HANDOFF.md` - Version info

**Requires Approval:** Yes (multiple confirmations)

**Duration:** ~20-25 tool calls

**Result:** Production release on Docker Hub + Git tag

---

## Code Management Workflows

### `/code-audit`

**When to Use:** Before production releases, or periodically for code cleanup

**What It Does:**
1. ✅ **Identifies** last production build:
   ```bash
   git describe --tags --abbrev=0  # e.g., v1.1.6
   ```
2. ✅ **Finds** all changed files since then:
   ```bash
   git diff --name-only v1.1.6..HEAD
   ```
3. ✅ **Analyzes** each changed file for:
   - **Deprecated code:** Unused imports, dead functions, commented code blocks
   - **Hanging code:** Unreachable code, duplicate logic
   - **Console logging:** Raw `console.log()`, `console.warn()`, etc.
4. ✅ **Converts** console logs to logger system:
   ```javascript
   // Before
   console.log('User logged in:', user);
   
   // After
   logger.info('User login successful', { 
     userId: user.id, 
     username: user.username 
   });
   ```
5. ✅ **Assigns** proper log levels:
   - `DEBUG` - Detailed diagnostic (dev only)
   - `INFO` - General informational
   - `WARN` - Warning conditions
   - `ERROR` - Error conditions
6. ✅ **Formats** logs for production:
   - Structured logging (JSON-like)
   - No sensitive data (tokens, passwords)
   - Context included (userId, action, etc.)
7. ✅ **Removes** deprecated/dead code
8. ✅ **Tests** build after changes
9. ✅ **Commits** cleanup with descriptive message

**Reads:**
- All files changed since last production tag
- `docs/development/LOGGING_REFERENCE.md` - Logger guidelines

**Writes:**
- Modified source files (cleanup)
- Git commit

**Requires Approval:** Yes (review changes before commit)

**Duration:** ~20-30 tool calls (depends on number of files)

**Example Output:**
```
Audited 23 files changed since v1.1.6:

Cleanup Summary:
- Removed 12 console.log statements
- Converted 8 console.log to logger.info
- Converted 3 console.error to logger.error
- Removed 2 unused imports
- Removed 1 deprecated function (oldAuthCheck)
- Removed 15 lines of commented code

Files modified: 8
Build status: ✅ Passed
```

---

### `/git-workflow`

**When to Use:** Reference guide (not executable workflow)

**What It Does:**
- 📖 **Displays** comprehensive Git workflow documentation
- Shows daily development patterns
- Shows feature branch workflow
- Shows release workflow
- Shows emergency procedures
- Lists safe vs dangerous Git commands

**Writes:** Nothing

**Requires Approval:** N/A (documentation only)

---

## Emergency & Recovery Workflows

### `/recover-session`

**When to Use:** Previous session crashed, no session end marker, or Git issues

**What It Does:**
1. ✅ **Checks** for session end marker in `TASK_CURRENT.md`
2. ✅ **Checks** Git status for uncommitted changes
3. ✅ **Verifies** build status (`npm run build`)
4. ✅ **Reviews** last few commits (`git log --oneline -n 5`)
5. ✅ **Offers** recovery options:
   - **Continue:** Pick up where left off
   - **Restore:** Revert to last known good commit
   - **Manual:** User intervention needed
6. ✅ **Asks** user for recovery direction
7. ✅ **Documents** recovery in `TASK_CURRENT.md`

**Reads:**
- `docs/tasks/TASK_CURRENT.md` - Check for corruption
- `docs/tasks/HANDOFF.md` - Last known state
- Git history

**Writes:**
- `docs/tasks/TASK_CURRENT.md` - Recovery log

**Requires Approval:** Yes (choose recovery strategy)

**Duration:** ~8-10 tool calls

---

## Workflow Execution Rules

### Automatic Workflows (No User Input)
- `/start-session` - Reads docs, initializes
- `/checkpoint` - Context verification

### User Approval Required
- `/end-session` - Before Git commit
- `/build-develop` - Before Docker push
- `/build-production` - Multiple confirmations (version, build, push, tag)
- `/code-audit` - Before committing cleanup
- `/recover-session` - Choose recovery strategy

### Forbidden Actions (Agent Will Never Do)
- ❌ Skip build verification before deployment
- ❌ Deploy with failing build
- ❌ Commit corrupted files
- ❌ Force push to any branch
- ❌ Use `git reset --hard`
- ❌ Delete Git history

---

## Quick Command Reference

| You Say | Workflow Invoked | What Happens |
|---------|------------------|--------------|
| "Start session" / `/start-session` | `/start-session` | Read docs, verify build, initialize |
| "Wrap up" / "End session" / `/end-session` | `/end-session` | Update docs, commit, handoff |
| "Deploy to Docker" / `/build-develop` | `/build-develop` | Build & push both Docker images |
| "Create release" / `/build-production` | `/build-production` | Production release workflow |
| "Audit code" / `/code-audit` | `/code-audit` | Cleanup logs, remove dead code |
| "Recover" / `/recover-session` | `/recover-session` | Emergency session recovery |

---

## Checkpoint System

**Automatic checkpoints every 10 tool calls:**
- Tool call #10, #20, #30, #40, etc.
- Agent pauses, re-reads CRITICAL CONTEXT
- Verifies it's on track
- Logs checkpoint in TASK_CURRENT.md
- Resumes work

**Session length limits:**
- ✅ 0-50 calls: Optimal
- ⚠️ 50-80 calls: Good, consider wrapping up
- 🔴 80-100 calls: Strongly recommend ending
- 🛑 100+ calls: Must end session

---

## Workflow Integration Flow

```mermaid
graph TD
    A[Start Chat] --> B[/start-session]
    B --> C[Read HANDOFF.md]
    C --> D[User assigns task]
    D --> E[Agent works]
    E --> F{10 tool calls?}
    F -->|Yes| G[/checkpoint]
    F -->|No| E
    G --> H{Context OK?}
    H -->|Yes| E
    H -->|No| I[Re-read docs, ask user]
    I --> E
    E --> J{Ready for deploy?}
    J -->|Yes| K[/build-develop]
    K --> L[Docker Hub]
    E --> M{Ready for release?}
    M -->|Yes| N[/code-audit]
    N --> O[/build-production]
    O --> P[GitHub + Docker Hub]
    E --> Q{Session done?}
    Q -->|Yes| R[/end-session]
    R --> S[Update docs, commit]
    S --> T[End Chat]
```

---

## Docker Image Quick Reference

| Image Tag | Purpose | Minified? | Source Maps? | Use Case |
|-----------|---------|-----------|--------------|----------|
| `develop` | Development testing | ✅ Yes | ❌ No | Test production-like build |
| `develop-debug` | Development debugging | ❌ No | ✅ Yes | Debug with DevTools |
| `1.1.7` (versioned) | Production release | ✅ Yes | ❌ No | Production deployment |
| `latest` | Latest production | ✅ Yes | ❌ No | Production (always current) |

**To deploy in Unraid:**
- Development: `pickels23/framerr:develop` or `develop-debug`
- Production: `pickels23/framerr:latest` or version tag

---

## Summary

This reference shows exactly what each workflow does, when to use it, what it reads/writes, and what approvals are needed. Keep this handy when invoking workflows so you know what the agent will do!
