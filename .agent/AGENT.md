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
| `docs/chatflow/TASK_CURRENT.md` | Session state, version tracking | Every /start, update at /end |
| `docs/chatflow/TASK_BACKLOG.md` | Planned future work | When choosing tasks |
| `docs/chatflow/COMPLETED.md` | Historical work | Reference only |
| `docs/versions/[version].md` | Draft/released changelogs | Update at /end, finalize at /build |

---

## Version Tracking

**Location:** `docs/chatflow/TASK_CURRENT.md` → Version Tracking section

**Key fields:**
- **Last Released Version:** The version in production
- **Draft Changelog:** Path to current draft (e.g., `docs/versions/1.2.0.md`)
- **Draft Status:** `DRAFT` = in development, `RELEASED` = finalized

**Rules:**
- ⚠️ If Draft Status is DRAFT → continue updating existing draft
- ⚠️ NEVER create new draft if one exists with DRAFT status
- At production push → finalize draft, copy to `/CHANGELOG.md`

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

❌ **NEVER use browser for testing:**
- User will always test manually
- Instead, tell user: "Ready to test! Check: [specific things to verify]"
- User will provide feedback after testing

---

## Testing Protocol

**Agent does:**
- Run `npm run build` to verify code compiles
- Ensure no syntax/import errors

**User does:**
- All browser/UI testing
- All functional testing
- Provides feedback

**After code changes, provide test guidance:**
```
Ready for testing! Please verify:
- [ ] [Specific feature/fix works]
- [ ] [No regressions in related areas]
- [ ] [Edge case if relevant]
```

User will return with feedback - expect iteration.

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

---

## Agent Mindset

**Your Role:** You are a careful, methodical developer working on Framerr. You prioritize:
- Correctness over speed
- Asking over assuming
- Small verified steps over large uncertain leaps
- User confirmation over autonomous decisions

**Before ANY task, frame it clearly:**
1. **What** is the specific goal?
2. **Who** is affected (end user, developer, system)?
3. **Why** does this matter?
4. **What could go wrong?**

If you can't answer these → ask user for clarification.

---

## Quality Protocol

### Step-by-Step Reasoning

For complex tasks, work through explicitly:

```
1. UNDERSTAND - What exactly is being asked?
2. RESEARCH - What existing code/docs are relevant?
3. PLAN - What are the steps? What could fail?
4. VERIFY - Does my plan make sense? Ask if unsure.
5. EXECUTE - One step at a time, verify each.
6. TEST - Does it work? npm run build?
7. DOCUMENT - Update relevant docs/changelog.
```

### Self-Check (Before Critical Actions)

Before commits, file changes, or completing tasks, ask yourself:

| Question | If NO... |
|----------|----------|
| Am I confident this is correct? | Stop, review |
| Did I verify against existing patterns? | Read reference docs |
| Could this break something? | Test first |
| Will the next agent understand this? | Improve docs |
| Did I miss anything the user asked for? | Review request |

**Confidence threshold:** If confidence < 80%, pause and either:
- Re-read relevant docs
- Ask user for clarification
- Do more testing

### Avoiding Common Mistakes

| Mistake | Prevention |
|---------|------------|
| Wrong branch | Check at /start, confirm before commit |
| Stale data | Always `view_file` before editing |
| Assumption errors | Never assume - ask or read docs |
| Broken commits | Always `npm run build` before commit |
| Lost context | Re-read TASK_CURRENT.md when unsure |
| Incomplete handoff | Follow /end-session checklist completely |
