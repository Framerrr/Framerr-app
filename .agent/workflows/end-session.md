---
description: End session and prepare handoff for next agent
---

# /end-session

## Pre-flight Check

```bash
git branch --show-current
git status
```

**Verify:**
- [ ] On expected branch (develop, feature/*, etc.)
- [ ] Not accidentally on `main`

---

## Verification Gates (Must Pass All)

Before ending, verify:

- [ ] Build passes: `npm run build`
- [ ] On correct branch
- [ ] `docs/chatflow/TASK_CURRENT.md` updated
- [ ] Draft changelog updated (if changes were made)
- [ ] Reference docs updated if systems changed
- [ ] Changes committed

---

## Steps

1. **Run tests (if test files exist)**
   ```bash
   npm run test:run
   ```
   If fails → fix first, do not proceed
   
   ⚠️ Skip if no test files exist for the changed code

2. **Verify build passes**
   ```bash
   npm run build
   ```
   If fails → fix first, do not proceed

3. **Check branch before committing**
   ```bash
   git branch --show-current
   ```
   
   **Confirm with user:** "About to commit to `[branch]`. Proceed?"
   
   ⚠️ If on wrong branch, switch before committing!

4. **Update draft changelog**
   
   If you made changes this session, update the draft changelog:
   ```
   docs/versions/[version].md (check TASK_CURRENT.md for filename)
   ```
   
   Add entries under appropriate section:
   - **Features:** New functionality
   - **Bug Fixes:** Fixes
   - **Changes:** Modifications, refactors

   ⚠️ Keep "DRAFT" status marker - do NOT change to RELEASED

5. **Update session state**
   
   Edit `docs/chatflow/TASK_CURRENT.md` with:
   - **Last Updated:** [timestamp]
   - **Branch:** [current branch]
   - **Current State:** What was accomplished
   - **Next Step:** Explicit, actionable next step
   - **SESSION END marker** at bottom

   ⚠️ Use `replace_file_content` - do NOT use CLI append

6. **Update reference docs if you changed systems**
   
   | If you changed... | Update... |
   |-------------------|-----------|
   | Component structure | `architecture.md` |
   | CSS/theming | `theming.md` |
   | Widget behavior | `widgets.md` |

7. **Commit changes**
   ```bash
   git add .
   git commit -m "Session: [brief summary]"
   ```

8. **Remind user about push**
   
   "Changes committed to `[branch]`. Don't forget to push if desired:
   ```bash
   git push origin [branch]
   ```"

8. **Verify handoff quality**
   
   Ask yourself:
   - Would a new agent know exactly where to start?
   - Is the next step explicit and actionable?
   - Is the draft changelog accurate?
   - Is the branch clearly documented?
   
   If NO → improve before ending

---

## Adaptability Check

**If the CHATFLOW system needs updating (new patterns, missing docs, etc.):**

1. Point it out to the user
2. Propose the specific change
3. **Wait for user confirmation** before modifying any workflow/system file
4. Never silently update CHATFLOW files
