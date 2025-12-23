---
description: Audit code for production readiness
---

# Code Audit Workflow

## When to Use
- Before production releases
- Periodically (monthly) for code cleanup
- After major feature development

## Steps

### Phase 1: Setup

1. **Find baseline (last production tag)**
   - Check TASK_CURRENT.md for last released version (more reliable than git describe on feature branches)
   ```bash
   git describe --tags --abbrev=0  # fallback
   ```

2. **Get changed files**
   ```bash
   git diff --name-only <tag>..HEAD --diff-filter=ACMR
   ```

---

### Phase 2: Logging Cleanup

3. **For each .js/.jsx/.ts/.tsx file:**
   - Scan for console.* calls
   - Convert to logger.* with proper levels
   - Format with structured data
   - Remove sensitive info from logs
   - Remove commented code blocks
   - Remove backup files (*.backup, *.bak, *.old)

4. **Logging conversion rules:**
   - `console.log(...)` → Analyze context:
     - Debug/diagnostic → `logger.debug(...)`
     - User actions → `logger.info(...)`
     - Unexpected behavior → `logger.warn(...)`
   - `console.warn(...)` → `logger.warn(...)`
   - `console.error(...)` → `logger.error(...)`
   - `console.debug(...)` → `logger.debug(...)`

5. **Sensitive data check:**
   - Never log: passwords, tokens, API keys, secrets
   - Redact if necessary: `token: '<redacted>'`

---

### Phase 3: TypeScript Error Audit

6. **Run TypeScript compiler check**
   ```bash
   npx tsc --noEmit 2>&1
   ```

7. **Analyze and categorize errors:**
   - Group by file
   - Identify error patterns (missing types, type mismatches, etc.)
   - Note which are blocking vs. warnings

8. **STOP - Report to user before fixing:**
   
   Present a summary:
   ```
   TypeScript Audit Report
   =======================
   Total errors: X
   Files affected: Y
   
   By Category:
   - Missing type definitions: X
   - Type mismatches: X
   - Property not found: X
   - Other: X
   
   Files to fix:
   1. file.tsx (X errors) - [brief description]
   2. another.tsx (X errors) - [brief description]
   
   Proceed with fixes?
   ```

9. **After user approval, fix TypeScript errors:**
   - Prioritize files with most errors
   - Fix one file at a time
   - Run `npm run build` after each file to verify

---

### Phase 4: Final Verification

10. **Build verification:**
    ```bash
    npm run build
    ```

11. **Review & commit:**
    - Show full summary to user
    - Get approval
    - Commit: `chore: code audit - logging cleanup, type fixes, and dead code removal`

## Output Example
```
Code Audit Report
=================
Baseline: v1.3.0
Files scanned: 52

Logging Changes:
- Converted 3 console.* → logger.*
- Removed 2 backup files

TypeScript Fixes:
- Fixed 15 type errors across 4 files
- Added 3 missing interface properties

Cleanup:
- Removed 2,595 lines of dead code

Build status: ✅ Passed

Ready to commit?
```

## Reference

- `docs/development/LOGGING_REFERENCE.md` - Logging standards
- `docs/theming/THEMING_ENGINE.md` - Theming system architecture
- `.agent/rules/theming-rules.md` - Theming rules (check for hardcoded colors)

