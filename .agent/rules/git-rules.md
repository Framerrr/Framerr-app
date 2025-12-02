---
trigger: always_on
---

# Agent Rules for Framerr-app Development

## Git Operations - Safety Rules

### ✅ SAFE - Agent Can Auto-Execute

These Git operations are safe and the agent can run them automatically:

```bash
# Viewing/Inspecting (Always Safe)
git status
git log
git log --oneline --graph
git branch
git branch -a
git diff
git show
git reflog

# Committing Changes (Safe - creates new history, doesn't destroy)
git add <file>
git add .
git commit -m "message"
git commit -am "message"

# Pushing to develop (Safe - backs up work)
git push origin develop
git push origin feature/*

# Creating/Switching Branches (Safe)
git checkout develop
git checkout -b feature/*
git branch feature/*

# Pulling Updates (Safe - gets latest)
git pull origin develop
git fetch origin
```

### ⚠️ REQUIRES USER APPROVAL - Agent Must Ask First

These operations modify state and require explicit user approval:

```bash
# Merging (Can cause conflicts)
git merge <branch>
git merge --no-ff <branch>

# Pushing to main (Protected branch)
git push origin main

# Deleting Branches (Removes references)
git branch -d <branch>
git branch -D <branch>
git push origin --delete <branch>

# Tagging (Creates releases)
git tag -a <tag> -m "message"
git push origin --tags

# Rebasing (Rewrites history)
git rebase develop
git pull --rebase
```

### 🚫 FORBIDDEN - Agent Must NEVER Execute

These operations are dangerous and can cause corruption. The agent must NEVER run these, even if the user asks:

```bash
# History Destruction
git reset --hard <commit>     # DESTROYS uncommitted work
git reset --hard HEAD~<n>     # DESTROYS commits

# File Deletion
git clean -fd                 # DELETES untracked files
git clean -fdx                # DELETES ignored files too

# Detached HEAD State
git checkout <commit-hash>    # Dangerous detached state
git checkout HEAD~<n>         # Same danger

# History Rewriting
git filter-branch             # Rewrites entire history
git rebase -i <commit>        # Interactive history rewrite (advanced)

# Repository Maintenance (Can corrupt if interrupted)
git gc                        # Garbage collection
git gc --aggressive           # Aggressive cleanup
git gc --prune=now            # Prune objects
git reflog expire             # Removes safety net

# Force Operations
git push --force              # Overwrites remote history
git push -f                   # Same as above

# Submodule Operations (Not used in this project)
git submodule deinit          # Can break workspace
```

### Special Case: Amending Commits

```bash
# ALLOWED ONLY IF:
git commit --amend            # 1. Last commit not pushed yet
                              # 2. Agent asks user first
                              # 3. User confirms it's safe
```

---

## Branch Usage Rules

### `develop` Branch (Primary Development)
- ✅ Agent can commit directly
- ✅ Agent can push automatically
- ✅ Messy commits are allowed
- ✅ Frequent commits encouraged
- ⚠️ Must be on `develop` for all active work

### `main` Branch (Production)
- 🚫 Agent NEVER commits directly
- 🚫 Agent NEVER pushes directly
- ⚠️ Only updated via Pull Requests
- ⚠️ User must manually merge or approve

### `feature/*` Branches
- ✅ Agent can create
- ✅ Agent can commit to
- ✅ Agent can push
- ⚠️ Agent must ask before merging to develop
- ⚠️ Agent must ask before deleting

---

## Commit Message Standards

The agent must use **Conventional Commits** format:

### Format
```
<type>(<scope>): <description>

[optional body]
```

### Required Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `perf`: Performance
- `test`: Testing
- `chore`: Maintenance
- `build`: Build system

### Examples
```bash
git commit -m "feat(widgets): add calendar widget"
git commit -m "fix(auth): resolve session timeout"
git commit -m "docs: update README setup instructions"
git commit -m "chore(deps): update React to 18.3.1"
```

---

## File Operations Rules

### Files Agent Can Modify
- ✅ All source code files (`src/**/*`)
- ✅ Server files (`server/**/*`)
- ✅ Configuration files (`*.config.js`, `package.json`, etc.)
- ✅ Documentation (`.md` files)
- ✅ Styles (`.css` files)

### Files Agent Must NOT Modify
- 🚫 `.git/` directory (NEVER touch)
- 🚫 `.git.backup/` (if it exists)
- 🚫 `node_modules/` (managed by npm)
- 🚫 `dist/` or build outputs (generated)

### Files Agent Should Ask Before Modifying
- ⚠️ `.gitignore` (impacts what's tracked)
- ⚠️ `package.json` dependencies (could break build)
- ⚠️ `Dockerfile` (impacts deployment)
- ⚠️ `.agent/rules.md` (this file!)

---

## Workflow Automation Rules

### Agent Can Automatically:
1. **Make commits** on `develop` after code changes
2. **Push to `develop`** to back up work
3. **Create feature branches** for isolated work
4. **Switch between branches** as needed
5. **Check status/logs** at any time

### Agent Must Ask Before:
1. **Merging** any branches
2. **Deleting** any branches
3. **Tagging** releases
4. **Pushing to `main`**
5. **Modifying Git configuration**
6. **Running any command** not in the "SAFE" list

### Agent Must NEVER (Even If Asked):
1. **Use `git reset --hard`** - SAY NO and explain why
2. **Use `git clean`** - SAY NO and explain why
3. **Delete `.git` folder** - SAY NO and explain why
4. **Run `git gc`** - SAY NO and explain why
5. **Force push to any branch** - SAY NO and explain why

---

## Recovery Safeguards

### Before Any Risky Operation

If the agent needs to perform a risky operation (after user approval), it must:

1. **Verify clean state**: `git status` (no uncommitted changes)
2. **Push to remote**: `git push origin develop` (create backup)
3. **Record current commit**: `git log --oneline -n 1` (for recovery)
4. **Ask explicit confirmation**: "This will do X. Your last backup is [commit hash]. Proceed?"

### If Something Goes Wrong

The agent must:

1. **STOP immediately** - don't make it worse
2. **Report the state**: `git status`, `git log --oneline -n 5`
3. **Ask the user** - don't try to fix automatically
4. **Remember GitHub remote** is the ultimate backup

---

## Daily Development Workflow

### Standard Agent Session Pattern

```bash
# 1. Start of work - Ensure on develop
git checkout develop
git pull origin develop

# 2. Make code changes
# ... agent edits files ...

# 3. Commit changes (automatic, no approval needed)
git add .
git commit -m "feat(component): add new feature"

# 4. Push to backup (automatic, no approval needed)
git push origin develop

# 5. Repeat 2-4 as work continues
```

### Feature Branch Pattern (When Needed)

```bash
# 1. Create feature branch (ask user for name)
git checkout develop
git checkout -b feature/user-provided-name

# 2. Work and commit (automatic)
git add .
git commit -m "feat: work on feature"
git push origin feature/user-provided-name

# 3. Merge back (MUST ASK USER)
# Agent: "Feature complete. Merge feature/name to develop?"
# User: approves
git checkout develop
git merge feature/user-provided-name
git push origin develop

# 4. Delete feature branch (MUST ASK USER)
# Agent: "Delete feature/name branch?"
# User: approves
git branch -d feature/user-provided-name
git push origin --delete feature/user-provided-name
```

---

## Error Handling

### When Git Commands Fail

The agent must:

1. **Read the error message** carefully
2. **Report to user** exactly what failed
3. **Suggest solution** based on error
4. **Ask before retrying** with different approach
5. **NEVER** escalate to more dangerous commands (no `--force`, no `--hard`)

### Example: Push Rejected

```bash
# If: git push origin develop
# Fails with: "Updates were rejected"

# Agent should:
# 1. Explain: "Someone else pushed to develop"
# 2. Suggest: "I'll pull with rebase and retry"
# 3. Ask: "Proceed?"
# 4. Only after approval:
git pull --rebase origin develop
git push origin develop
```

---

## Code Review Standards

### Before Committing, Agent Should:
1. ✅ Verify code builds (if applicable)
2. ✅ Check for obvious syntax errors
3. ✅ Ensure commit message follows convention
4. ✅ Be on correct branch

### Agent Should NOT:
- 🚫 Commit broken code knowingly
- 🚫 Commit without a meaningful message
- 🚫 Mix unrelated changes in one commit
- 🚫 Commit to `main` directly

---

## Communication Rules

### When Proposing Git Operations

The agent must clearly communicate:

1. **What branch** the operation affects
2. **What will change** (files, commits, etc.)
3. **Is it reversible** or destructive
4. **Is backup available** on GitHub
5. **Does it need approval** per these rules

### Example Good Communication

> "I've completed the authentication feature on the `develop` branch. I'm going to commit these changes with message 'feat(auth): implement OAuth login' and push to backup the work. This is safe and automatic per workflow rules."

### Example Required Approval

> "The feature branch `feature/oauth-login` is complete. I'd like to merge it into `develop`. This will combine the 5 commits from the feature into develop. All work is backed up on GitHub. Do you approve this merge?"

---

## Special Situations

### User Asks Agent to Do Something Forbidden

If the user asks the agent to run a forbidden command:

**Agent must:**
1. ✅ **Explain why it's forbidden**: "git reset --hard is forbidden because it caused your previous corruption"
2. ✅ **Offer safe alternative**: "Instead, I can revert specific commits safely with git revert"
3. ✅ **Ask for clarification**: "What are you trying to accomplish? I can help find a safe way"
4. 🚫 **NEVER execute the forbidden command**, even if user insists

### Emergency Situations

If the user reports repository corruption or critical issues:

**Agent must:**
1. 🛑 **STOP all operations immediately**
2. 📊 **Gather information**: `git status`, `git log`, current files
3. 🔍 **Check if GitHub backup exists**: remote status
4. 💬 **Ask user** before attempting any fixes
5. 🆘 **Prioritize data safety** over quick fixes

---

## Prohibited Actions Summary

The agent must **NEVER** do these, even if explicitly asked:

1. 🚫 Run `git reset --hard` for any reason
2. 🚫 Run `git clean` in any form
3. 🚫 Delete `.git` or `.git.backup` folders
4. 🚫 Run `git gc` or garbage collection
5. 🚫 Checkout old commits by hash (detached HEAD)
6. 🚫 Rewrite history with `filter-branch`
7. 🚫 Force push to any branch
8. 🚫 Modify files in `.git/` directory directly
9. 🚫 Run Git commands outside the workspace
10. 🚫 Ignore user's explicit "no" to an operation

---

## Approval Workflow

### Automatic (No Approval Needed)
- Viewing Git state
- Committing on `develop`
- Pushing `develop` to GitHub
- Creating feature branches
- Switching between branches

### User Approval Required
- Merging branches
- Deleting branches
- Tagging releases
- Pushing to `main`
- Rebasing
- Any operation marked ⚠️ in this document

### Forbidden (Never Do)
- Any operation marked 🚫 in this document
- Any Git command agent doesn't understand
- Any operation that modifies `.git/` directly

---

## Version Control for This Rules File

- This file is **critical** for safety
- Agent should ask before modifying it
- Changes should be reviewed by user
- Keep history of why rules were added

---

## Summary: Agent's Git Boundaries

**The agent's role:**
- ✅ Automate routine commits and pushes on `develop`
- ✅ Use Git as a safety net for all work
- ✅ Keep frequent backups on GitHub
- ⚠️ Ask before any state-changing operations
- 🚫 Never use destructive Git commands

**The user's role:**
- Approve merges, deletions, and special operations
- Make final decisions on releases
- Trust the agent within these boundaries
- Report any concerns immediately

---

**This rules file exists because of previous Git corruption. These rules are lessons learned. They must be followed strictly.**
