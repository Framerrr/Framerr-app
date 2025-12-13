# CHATFLOW System - Agent Hub

**Version:** 2.0  
**Purpose:** Single source of truth for Framerr agent workflow

---

## Quick Start

```
/start-session → Read this file + TASK_CURRENT.md → Ready to work
/end-session   → Update docs + commit → Ready for next agent
/check         → Re-read context + verify alignment
```

---

## File Map

| File | Purpose | When to Read |
|------|---------|--------------|
| `.agent/AGENT.md` | This file - system hub | Every /start |
| `docs/chatflow/TASK_CURRENT.md` | Session state, end markers | Every /start, update at /end |
| `docs/chatflow/TASK_BACKLOG.md` | Planned future work | When choosing tasks |
| `docs/chatflow/COMPLETED.md` | Historical work | Reference only |
| `docs/project/STATUS.md` | Project overview | Optional context |

---

## Task Type Requirements

**Before starting work, identify task type and read required docs:**

| If task involves... | MUST read first |
|---------------------|-----------------|
| UI components/styling | `docs/reference/theming.md` |
| Component structure | `docs/reference/architecture.md` |
| Widgets | `docs/reference/widgets.md` |
| Database changes | `docs/reference/database.md` |
| Docker/deployment | `.agent/workflows/build.md` |

⚠️ **If doc doesn't exist → ASK USER before proceeding**  
⚠️ **NEVER assume patterns → READ THE DOC**

---

## Core Principle: NEVER ASSUME

```
IF UNCERTAIN ABOUT ANYTHING → ASK USER FIRST

This includes:
- How a feature should look/work
- Which approach when multiple exist  
- Whether to follow existing pattern or create new
- Anything with design/UX implications
- Any decision that's hard to reverse
```

**When HOW is ambiguous:**
1. Present 2-3 approaches with trade-offs
2. Ask which user prefers
3. Only proceed after confirmation

---

## Prohibited Behaviors

❌ **NEVER use CLI file commands:**
- `echo >> file`, `Add-Content`, `Set-Content`
- Use `replace_file_content` or `write_to_file` instead

❌ **NEVER assume file contents:**
- Always `view_file` before editing

❌ **NEVER make up patterns:**
- Always read reference docs

❌ **NEVER skip build verification:**
- Run `npm run build` after code changes

❌ **NEVER commit broken code:**
- Fix build errors before committing

---

## Critical Rules (Always Active)

Your MEMORY rules in `.agent/rules/` are injected into every message.

**Key rules:**
1. After code changes → `npm run build` (no exceptions)
2. Before editing → `view_file` first (no exceptions)
3. After successful changes → commit
4. Never: `git reset --hard`, `git clean`, `git push --force`
5. UI work → must have read theming.md
6. Never assume → ask when uncertain

**Rule files:**
- `.agent/rules/development.md` - Build, edit, commit
- `.agent/rules/git.md` - Git safety
- `.agent/rules/theming.md` - UI requirements

---

## Auto-Update Reference Docs

**When you change a system, update its doc:**

| Changed... | Update... |
|------------|-----------|
| Component structure | `architecture.md` |
| CSS/theming | `theming.md` |
| Widget behavior | `widgets.md` |
| Database schema | `database.md` |

**How:** Replace outdated info, don't just append to end.

---

## Workflows

| Command | Purpose |
|---------|---------|
| `/start-session` | Begin work - read context, identify task type |
| `/end-session` | End work - update docs, commit, verify handoff |
| `/check` | Mid-session context verification |
| `/build` | Docker deployment (dev or prod) |
| `/recover` | Emergency session recovery |

---

## Agent Responsibilities

**Do automatically (don't wait for user to remind):**
- Read reference docs based on task type
- Follow all rules
- Ask clarifying questions BEFORE starting
- Present plan for approval BEFORE executing
- Update reference docs after system changes
- Proper handoff at /end

**User only needs to:**
- `/start` and `/end`
- Say what they want done
- Answer clarifying questions
- Approve plans
