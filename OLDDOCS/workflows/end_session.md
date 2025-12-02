---
description: End Framerr session and prepare handoff
---

# End Session and Handoff

## Steps

1. **Complete current work:**
   - Finish current subtask if close to completion
   - Or reach a clean stopping point
   - Ensure no files are mid-edit

2. **Run final verification if code changed:**
   ```bash
   npm run build
   ```
   - Must pass before continuing
   - If fails → Fix issues first

3. **Update docs/tasks/TASK_CURRENT.md with:**
   - Session end timestamp
   - Total tool calls this session
   - Last checkpoint number
   - Achievements (what was completed)
   - Current state (where things stand)
   - Next immediate step  
   - Any blockers or notes
   - If any bugs were noted or fixed, also run workflow /bugs
   - **CRITICAL:** Add explicit marker at end of file:
     ```markdown
     ---
     ## Session End Marker
     ✅ **SESSION END**
     - Session ended: [timestamp]
     - Status: Ready for next session
     ```

4. **Update docs/tasks/HANDOFF.md (only if major changes):**
   - New approaches discovered
   - Important decisions made
   - Architecture changes
   - Update timestamp

5. **Update docs/tasks/STATUS.md:**
   - Update "Last Updated" timestamp
   - Update recent accomplishments section
   - Update current phase progress
   - Update production/development deployment info (if applicable)

6. **Append to docs/tasks/TASK_COMPLETED.md (if work was completed):**
6. **Append to docs/tasks/TASK_COMPLETED.md (if work was completed):**
   - Add session summary with date/title
   - List what was implemented
   - Files modified
   - Issues resolved
   - Testing performed

7. **Update docs/tasks/TASK_BACKLOG.md (if applicable):**
   - Mark completed items with ✅
   - Update progress tracking

8. **Verify all updates succeeded:**
   - View docs/tasks/TASK_CURRENT.md (check for session end marker)
   - View docs/tasks/HANDOFF.md (check for updated timestamp if changed)
   - View docs/tasks/STATUS.md (check for updated timestamp)
   - If ANY failed → Report to user, retry or provide manual instructions

9. **Commit work if user approves:**
   ```bash
   git status
   git add .
   git commit -m "Session end: [brief summary]"
   ```

10. **Provide handoff summary to user:**
   - Session stats (tool calls, tasks completed, files modified)
   - Completed items
   - In-progress items
   - Next steps for new chat
   - Documentation status

11. **VERIFICATION (confirm to user):**
   - [ ] TASK_CURRENT.md updated?
   - [ ] HANDOFF.md updated (if needed)?
   - [ ] STATUS.md updated?
   - [ ] TASK_COMPLETED.md appended (if work done)?
   - [ ] TASK_BACKLOG.md updated (if applicable)?
   - [ ] All changes committed (if approved)?
   - [ ] Ready for next session?

## Session Length Warning

If session exceeded 50 tool calls, remind user:
"Note: This session used [X] tool calls. For optimal context, try to keep sessions under 50-80 tool calls when possible."