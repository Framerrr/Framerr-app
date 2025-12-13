---
description: End session and prepare handoff for next agent
---

# /end-session

## Verification Gates (Must Pass All)

Before ending, verify:

- [ ] Build passes: `npm run build`
- [ ] `docs/chatflow/TASK_CURRENT.md` updated
- [ ] Draft changelog updated (if changes were made)
- [ ] Reference docs updated if systems changed
- [ ] Changes committed

---

## Steps

1. **Verify build passes**
   ```bash
   npm run build
   ```
   If fails → fix first, do not proceed

2. **Update draft changelog**
   
   If you made changes this session, update the draft changelog:
   ```
   docs/versions/[version].md (check TASK_CURRENT.md for filename)
   ```
   
   Add entries under appropriate section:
   - **Features:** New functionality
   - **Bug Fixes:** Fixes
   - **Changes:** Modifications, refactors

   ⚠️ Keep "DRAFT" status marker - do NOT change to RELEASED

3. **Update session state**
   
   Edit `docs/chatflow/TASK_CURRENT.md` with:
   - **Last Updated:** [timestamp]
   - **Current State:** What was accomplished
   - **Next Step:** Explicit, actionable next step
   - **SESSION END marker** at bottom

   ⚠️ Use `replace_file_content` - do NOT use CLI append

4. **Update reference docs if you changed systems**
   
   | If you changed... | Update... |
   |-------------------|-----------|
   | Component structure | `architecture.md` |
   | CSS/theming | `theming.md` |
   | Widget behavior | `widgets.md` |

5. **Commit changes**
   ```bash
   git add .
   git commit -m "Session: [brief summary]"
   ```

6. **Verify handoff quality**
   
   Ask yourself:
   - Would a new agent know exactly where to start?
   - Is the next step explicit and actionable?
   - Is the draft changelog accurate?
   
   If NO → improve before ending
