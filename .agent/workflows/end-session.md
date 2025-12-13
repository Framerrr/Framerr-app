---
description: End session and prepare handoff for next agent
---

# /end-session

## Verification Gates (Must Pass All)

Before ending, verify:

- [ ] Build passes: `npm run build`
- [ ] `docs/chatflow/TASK_CURRENT.md` updated
- [ ] Reference docs updated if systems changed
- [ ] Changes committed

---

## Steps

1. **Verify build passes**
   ```bash
   npm run build
   ```
   If fails → fix first, do not proceed

2. **Update session state**
   
   Edit `docs/chatflow/TASK_CURRENT.md` with:
   - **Last Updated:** [timestamp]
   - **Current State:** What was accomplished
   - **Next Step:** Explicit, actionable next step
   - **SESSION END marker** at bottom

   ⚠️ Use `replace_file_content` - do NOT use CLI append

3. **Update reference docs if you changed systems**
   
   | If you changed... | Update... |
   |-------------------|-----------|
   | Component structure | `architecture.md` |
   | CSS/theming | `theming.md` |
   | Widget behavior | `widgets.md` |

4. **Commit changes**
   ```bash
   git add .
   git commit -m "Session: [brief summary]"
   ```

5. **Verify handoff quality**
   
   Ask yourself:
   - Would a new agent know exactly where to start?
   - Is the next step explicit and actionable?
   
   If NO → improve before ending
