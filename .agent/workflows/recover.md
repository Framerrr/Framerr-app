---
description: Emergency session recovery
---

# /recover

## When to Use

- Session crashed unexpectedly
- No SESSION END marker found
- Agent confused about current state

---

## Steps

1. **Check git status**
   ```bash
   git status
   ```
   - Are there uncommitted changes?
   - Which branch are we on?

2. **Check build status**
   ```bash
   npm run build
   ```
   - Does it pass?
   - If fails, something may be corrupt

3. **Read current state**
   ```
   Read docs/chatflow/TASK_CURRENT.md
   Read .agent/AGENT.md
   ```

4. **Ask user for direction**
   - Keep uncommitted changes?
   - Which task to resume?
   - Need to restore from git?

5. **Never auto-delete uncommitted work**
   - Always ask user first
   - User decides what to keep/discard
