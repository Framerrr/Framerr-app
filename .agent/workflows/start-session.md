---
description: Begin a new Framerr development session
---

# /start-session

## Steps

1. **Check current branch**
   ```bash
   git branch --show-current
   git status
   ```
   
   **Report to user:**
   - Current branch name
   - Whether there are uncommitted changes
   
   | Branch | Expected Work |
   |--------|---------------|
   | `develop` | General development, bug fixes |
   | `feature/*` | Specific feature work |
   | `main` | ⚠️ WARNING - should not work directly on main |

2. **Read system hub**
   ```
   Read .agent/AGENT.md
   ```
   - Understand file map
   - Know task type requirements
   - Know prohibited behaviors

3. **Read session state**
   ```
   Read docs/chatflow/TASK_CURRENT.md
   ```
   - Find SESSION END marker
   - Know where last session ended
   - **Check Version Tracking section**
   - **Verify branch matches expected** (from last session)

4. **Check changelog status**
   
   Look at "Version Tracking" section in TASK_CURRENT.md:
   
   | If Draft Status is... | Action |
   |-----------------------|--------|
   | DRAFT - In Development | Continue updating existing draft changelog |
   | (no draft exists) | Create new draft after production release |
   
   **⚠️ NEVER create a new draft if one already exists with DRAFT status!**

5. **Identify task type from user request**
   - UI work → read `docs/reference/theming.md`
   - Architecture work → read `docs/reference/architecture.md`
   - Widget work → read `docs/reference/widgets.md`
   - If doc doesn't exist → ask user before proceeding

6. **Summarize to user**
   - **Current branch** (highlight if not develop)
   - Current version info (last release, draft version)
   - Where we left off
   - What they want to do now
   - Ready to plan (await approval before executing)

---

## Adaptability Check

**If you notice the CHATFLOW system is missing something:**
- New file type not tracked
- Workflow doesn't cover a scenario
- Documentation structure changed

**DO:**
1. Point it out to the user
2. Propose the update
3. Wait for user confirmation before changing any workflow/system files

**DON'T:**
- Silently modify CHATFLOW system files
- Assume the change is wanted
