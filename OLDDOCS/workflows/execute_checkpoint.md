---
description: Execute checkpoint to maintain context (Every 10 tool calls)
---

# Execute Checkpoint

## When to Run

Execute at tool calls #10, #20, #30, etc.

## Automatic Trigger

This workflow should be invoked automatically when tool call count % 10 == 0.

## Steps

1. **STOP current work**

2. **Re-read HANDOFF.md:**
   - Read entire CRITICAL CONTEXT section
   - Read at minimum lines 1-100
   - Read full file if context feels unclear

3. **Context verification (answer these questions):**
   - What is the current task?
   - What was the last thing completed?
   - What should I do next?
   - Are there any blockers?
   - What files am I working on?
   - **If ANY answer is uncertain → Re-read full HANDOFF.md + ask user**

4. **Verify current task is correct:**
   - Check TASK_CURRENT.md
   - Confirm alignment with HANDOFF.md
   - If mismatch → Ask user for clarification

5. **Confirm following all rules:**
   - Have I been running build tests after edits?
   - Have I been viewing files before editing?
   - Have I been making small, precise edits?
   - Have I been updating TASK_CURRENT.md regularly?
   - If ANY rule violated → Correct immediately

6. **Assess context drift:**
   - Do I understand the overall goal?
   - Am I working on the right thing?
   - Do I know what comes next?
   - If unclear → Re-read docs + ask user

7. **Log checkpoint in TASK_CURRENT.md:**
   - Note checkpoint number and tool call
   - Note current status
   - Note any corrective actions taken
   - Example: "✅ Checkpoint #20 (Tool call #20) - Context verified, on track"

8. **Session length check:**
   - If tool calls >= 50: Warn user "Session has reached 50 tool calls. Consider wrapping up soon."
   - If tool calls >= 80: Strongly warn "Session at 80 tool calls. Recommend /end_session to maintain quality."
   - If tool calls >= 100: Alert "Session exceeded 100 tool calls. You should /end_session now."

9. **Resume work**

## Failure Recovery

If checkpoint reveals issues:
- Context drift detected → Re-read all docs + ask user
- Wrong task → Stop and ask user
- Rule violations → Correct and continue
- Missing information → Ask user to clarify
