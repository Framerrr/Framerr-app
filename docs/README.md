# Framerr Documentation

---

## Quick Start

**New to Framerr development?** Read `.agent/AGENT.md` first.

---

## Structure

```
docs/
├── chatflow/         # Session management (CHATFLOW v2.0)
│   ├── TASK_CURRENT.md   # Where we left off
│   ├── TASK_BACKLOG.md   # Planned work
│   └── COMPLETED.md      # Historical work
├── reference/        # Technical reference
│   ├── architecture.md   # System architecture
│   ├── theming.md        # Theming quick ref
│   └── widgets.md        # Widget development
├── theming/          # Full theming documentation
├── development/      # Developer guides
├── dashboard/        # Dashboard implementation docs
├── dbmigration/      # SQLite migration docs
└── versions/         # Version history
```

---

## Key Files

| File | Purpose |
|------|---------|
| `.agent/AGENT.md` | Master hub - start here |
| `docs/chatflow/TASK_CURRENT.md` | Current session state |
| `docs/reference/*` | Quick reference docs |
| `docs/theming/THEMING_ENGINE.md` | Full theming docs |

---

## Workflows

| Command | Purpose |
|---------|---------|
| `/start-session` | Begin work |
| `/end-session` | End work, prepare handoff |
| `/check` | Context verification |
| `/build` | Docker deployment |
