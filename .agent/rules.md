# Framerr Agent Rules - Quick Reference

**For detailed rules, see the subdirectories below.**

---

##  Rules Organization

### Git Safety Rules
**Location:** `.agent/rules/git-rules.md`

Critical git command safety rules to prevent repository corruption. These rules were created after a major git corruption incident and MUST be followed strictly.

**Key Points:**
-  SAFE commands (auto-run): status, log, commit, push to develop, branch operations
-  REQUIRES APPROVAL: merging, deleting branches, tagging, rebasing
-  FORBIDDEN: reset --hard, clean, force push, garbage collection

### Development Rules
**Location:** `.agent/rules/development-rules.md`

Comprehensive development workflow rules covering:
- Build testing requirements
- Checkpoint protocol (every 10 tool calls)
- Session start/end procedures
- Documentation updates
- Logging standards
- Deployment safety
- File corruption prevention

### Theming Rules
**Location:** `.agent/rules/theming-rules.md`

UI component theming requirements:
- MUST use theme utility classes
- NEVER use hardcoded colors
- MUST test in Light theme before committing
- MUST test with flatten UI enabled

---

##  Critical Rules Summary

### P0 (BLOCKING - Must Follow)
1. **Always test builds** after code changes (`npm run build`)
2. **Execute checkpoints** every 10 tool calls
3. **Never commit corruption** - verify file integrity
4. **Session protocols** - use `/start-session` and `/end-session`
5. **Git safety** - follow forbidden command list
6. **Deployment approval** - user must confirm Docker builds
7. **Theming compliance** - use theme system for all UI

### At Session Start
1. Run `/start-session` workflow
2. Read `docs/tasks/HANDOFF.md` CRITICAL CONTEXT
3. Check for SESSION END marker in `docs/tasks/TASK_CURRENT.md`
4. Initialize checkpoint counter to 0

### Every 10 Tool Calls
1. Run `/checkpoint` workflow
2. Re-read `docs/tasks/HANDOFF.md` CRITICAL CONTEXT
3. Verify context alignment
4. Update `docs/tasks/TASK_CURRENT.md`

### At Session End
1. Run `/end-session` workflow
2. Update all documentation
3. Run final build verification
4. Add SESSION END marker to `docs/tasks/TASK_CURRENT.md`

---

## Git Command Reference

###  Safe (Auto-run)
`git status`, `git log`, `git commit`, `git push origin develop`, `git checkout develop`, `git pull origin develop`

###  Requires Approval
`git merge`, `git branch -d`, `git tag`, `git rebase`

###  Forbidden (Never Run)
`git reset --hard`, `git clean`, `git push --force`, `git gc`

---

## Workflow Quick Links

- `/start-session` - Initialize work session
- `/end-session` - End work session with documentation
- `/checkpoint` - Context verification (auto at #10, #20, etc.)
- `/git-workflow` - Git operations guide
- `/build-develop` - Deploy to develop image
- `/build-production` - Production release
- `/code-audit` - Code quality cleanup
- `/recover-session` - Emergency recovery

---

## Documentation Structure

- `docs/tasks/HANDOFF.md` - Critical context and current state
- `docs/tasks/TASK_CURRENT.md` - Active session work
- `docs/tasks/STATUS.md` - Overall progress
- `docs/architecture/` - System design docs
- `docs/development/` - Developer guides
- `docs/theming/` - Theming system docs
- `docs/recovery/` - Recovery documentation archive

---

**Last Updated:** 2025-12-02  
**System Version:** v2.0 (Comprehensive Documentation System)

**For complete details, read the specific rule files in `.agent/rules/`**
