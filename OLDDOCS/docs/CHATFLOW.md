# Framerr Development

**Welcome to the Framerr project!** This documentation system uses Antigravity's native **Workflows** and **Rules** for a robust, self-sufficient development experience.

---

## 🚀 Quick Start

### Starting a New Session

Use the workflow:
```
/start_session
```

Or just say: "Read CHATFLOW to get started on Framerr"

---

### Ending a Session

Use the workflow:
```
/end_session
```

Or just say: "wrap it up" or "end session"

---

## 📋 Available Workflows

| Command | Purpose | When to Use |
|---------|---------|-------------|
| **`/start_session`** | Initialize new development session | Start of every chat |
| **`/end_session`** | Wrap up session and handoff | End of chat, or natural stopping point |
| **`/execute_checkpoint`** | Execute context checkpoint | Auto-runs every 10 tool calls (or manual) |
| **`/build_develop`** | Build and push develop image | After changes, want to test |
| **`/build_latest`** | Create production release | Ready for production deployment |
| **`/recover_session`** | Emergency recovery | Previous session crashed |

**Note:** You don't need to remember slash commands - just describe what you want (e.g., "deploy to Docker" → AI uses `/build_develop`)

---

## 🔒 Critical Rules

All development rules are enforced via the **Rules system** (immutable constraints that the AI must follow).

**Key rules include:**
- **Always test** with `npm run build` after file edits
- **View before edit** - Never edit blindly
- **Small, precise edits** - One function/block at a time
- **Restore on failure** - `git checkout` if build fails
- **Checkpoint every 10 tool calls** - Prevents context drift
- **Update documentation** - TASK_CURRENT.md, HANDOFF.md, STATUS.md

See the full Rules system for complete details.

---

## 📂 Documentation Structure

### Current State & Progress

| File | Purpose | Updated By |
|------|---------|------------|
| **HANDOFF.md** | Current state, latest work, context | `/end_session`, `/build_*` workflows |
| **TASK_CURRENT.md** | Active work being done right now | `/execute_checkpoint`, `/end_session` |
| **STATUS.md** | Overall progress and statistics | `/end_session` workflow |
| **TASK_BACKLOG.md** | Upcoming work, to-do list | Manual |
| **TASK_COMPLETED.md** | History of finished items | Manual |

### Architecture & Reference

| File | Purpose |
|------|---------|
| **ARCHITECTURE.md** | Project structure, file locations |
| **PROJECT_SCOPE.md** | Vision, features, technology stack |
| **docs/MOBILE_LAYOUT_ALGORITHM.md** | Banding algorithm documentation |
| **docs/SIDEBAR_IFRAME_ARCHITECTURE.md** | Tab navigation system |
| **docs/WIDGET_DEVELOPMENT_GUIDE.md** | Widget sizing guidelines |
| **docs/API.md** | API reference |

### History

| File | Purpose |
|------|---------|
| **CHANGELOG.md** | Version history |
| **README.md** | Project overview |

---

## 🎯 Typical Workflow

### Starting Development:
1. User says: `/start_session` (or "get started on Framerr")
2. AI reads HANDOFF.md, TASK_CURRENT.md, ARCHITECTURE.md
3. AI summarizes current state
4. User assigns task

### During Development:
- AI works on task
- **Auto-checkpoint every 10 tool calls** 
- Updates TASK_CURRENT.md regularly
- Follows all Rules (build tests, small edits, etc.)

### Deploying to Develop:
- User says: `/build_develop` (or "deploy to Docker")
- AI builds and pushes `pickels23/framerr:develop`
- Updates HANDOFF.md with digest

### Creating Release:
- User says: `/build_latest` (or "create release")  
- AI asks for version number
- Waits for confirmation
- Updates package.json, CHANGELOG.md
- Creates git tag
- Builds and pushes both `pickels23/framerr:X.X.X` and `latest`

### Ending Session:
- User says: `/end_session` (or "wrap it up")
- AI updates TASK_CURRENT.md, HANDOFF.md, STATUS.md
- Provides handoff summary
- Next session can pick up seamlessly

---

## 🆘 Emergency Recovery

If a session crashes or ends unexpectedly:

```
/recover_session
```

This workflow will:
- Detect missing "Session End" marker
- Check for uncommitted changes
- Verify build status
- Offer recovery options (restore, continue, or manual)

---

## 💡 Tips

- **Start sessions with `/start_session`** - Ensures proper initialization
- **End sessions with `/end_session`** - Keeps documentation current
- **Keep sessions under 50-80 tool calls** - Better context quality
- **Checkpoints auto-run every 10 calls** - Prevents context drift
- **Use natural language** - AI recognizes intent (e.g., "deploy" → `/build_develop`)

---

## 📖 Further Reading

**To understand Framerr's current state:**
1. Read [HANDOFF.md](file:///c:/Users/Jonathan/Documents/Antigravity/Developer/dashboard2/docs/tasks/HANDOFF.md) - Start with CRITICAL CONTEXT section
2. Check [TASK_CURRENT.md](file:///c:/Users/Jonathan/Documents/Antigravity/Developer/dashboard2/docs/tasks/TASK_CURRENT.md) - See active work

**To understand project structure:**
- [ARCHITECTURE.md](file:///c:/Users/Jonathan/Documents/Antigravity/Developer/dashboard2/docs/architecture/ARCHITECTURE.md) - File locations and organization
- [PROJECT_SCOPE.md](file:///c:/Users/Jonathan/Documents/Antigravity/Developer/dashboard2/docs/reference/PROJECT_SCOPE.md) - Vision and features

**To see what's been done:**
- [TASK_COMPLETED.md](file:///c:/Users/Jonathan/Documents/Antigravity/Developer/dashboard2/docs/tasks/TASK_COMPLETED.md) - Finished work
- [CHANGELOG.md](file:///c:/Users/Jonathan/Documents/Antigravity/Developer/dashboard2/CHANGELOG/CHANGELOG.md) - Release history

---

**Ready to get started?** Use `/start_session` or just say "Read CHATFLOW to get started on Framerr"
