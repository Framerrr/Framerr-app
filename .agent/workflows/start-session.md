---
description: Begin a new Framerr development session
---

# /start-session

## Steps

1. **Read system hub**
   ```
   Read .agent/AGENT.md
   ```
   - Understand file map
   - Know task type requirements
   - Know prohibited behaviors

2. **Read session state**
   ```
   Read docs/chatflow/TASK_CURRENT.md
   ```
   - Find SESSION END marker
   - Know where last session ended
   - **Check Version Tracking section**

3. **Check changelog status**
   
   Look at "Version Tracking" section in TASK_CURRENT.md:
   
   | If Draft Status is... | Action |
   |-----------------------|--------|
   | DRAFT - In Development | Continue updating existing draft changelog |
   | (no draft exists) | Create new draft after production release |
   
   **⚠️ NEVER create a new draft if one already exists with DRAFT status!**

4. **Identify task type from user request**
   - UI work → read `docs/reference/theming.md`
   - Architecture work → read `docs/reference/architecture.md`
   - Widget work → read `docs/reference/widgets.md`
   - If doc doesn't exist → ask user before proceeding

5. **Summarize to user**
   - Current version info (last release, draft version)
   - Where we left off
   - What they want to do now
   - Ready to plan (await approval before executing)
