---
description: Initialize a new Framerr development session
---

# Start New Framerr Session

## Steps

1. **Verify critical files exist:**
   - Check for docs/tasks/HANDOFF.md (required)
   - Check for docs/tasks/TASK_CURRENT.md (required)
   - Check for docs/architecture/ARCHITECTURE.md (optional)
   - If missing → Invoke `/recover_session`

2. **Read current state documents in order:**
   - Read docs/workflows/CHATFLOW.md - Quick start guide (understand the workflow system)
   - Read docs/tasks/HANDOFF.md - Focus on CRITICAL CONTEXT section first
   - Read docs/tasks/TASK_CURRENT.md - Check for "SESSION END" marker at bottom of file  
   - If no "SESSION END" marker or "Ready for next session" status → Invoke `/recover_session`
   - Read docs/reference/PROJECT_SCOPE.md (optional - for vision/design philosophy context)
   - Skim docs/tasks/TASK_BACKLOG.md (awareness - know what's planned)
   - Read docs/architecture/ARCHITECTURE.md (if working with files/structure)
   - **Read docs/theme/DEVELOPER_GUIDE.md (MANDATORY before creating/editing UI components)**

3. **Initialize checkpoint tracking:**
   - Set tool call counter to 0
   - Set next checkpoint at #10
   - Note in task_boundary: "Tool calls: 0, Next checkpoint: #10"

4. **Summarize back to user:**
   - Current phase and status
   - Last completed work
   - Current task (or "Awaiting assignment")
   - Checkpoint system initialized
   - Available workflows:
     * `/build_develop` - Deploy to develop
     * `/build_latest` - Create production release  
     * `/execute_checkpoint` - Manual context check
     * `/end_session` - Wrap up session
     * `/recover_session` - Emergency recovery

5. **CRITICAL: Remind about git commits:**
   > [!IMPORTANT]
   > **Auto-commit after EVERY change** to enable easy reversion if files get corrupted.
   > After implementing each feature or fix:
   > 1. Check for file corruption (large file size, syntax errors)
   > 2. If clean → Auto-commit with descriptive message
   > 3. If corrupted → Alert user, do NOT commit corrupted files
   > ```bash
   > git add .
   > git commit -m "feat: descriptive message"
   > ```

6. **Wait for task assignment** from user
   - Don't start coding yet
   - Ask clarifying questions if needed
