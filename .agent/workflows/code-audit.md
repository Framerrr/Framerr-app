---
description: Audit code for production readiness
---

# Code Audit Workflow

## When to Use
- Before production releases
- Periodically (monthly) for code cleanup
- After major feature development

## Steps

1. **Find baseline (last production tag)**
   ```bash
   git describe --tags --abbrev=0
   ```

2. **Get changed files**
   ```bash
   git diff --name-only <tag>..HEAD --diff-filter=ACMR
   ```

3. **For each .js/.jsx file:**
   - Scan for console.* calls
   - Convert to logger.* with proper levels
   - Format with structured data
   - Remove sensitive info from logs
   - Remove commented code blocks
   - Remove unused imports
   - Remove unreachable code

4. **Logging conversion rules:**
   - `console.log(...)`  Analyze context:
     - Debug/diagnostic  `logger.debug(...)`
     - User actions  `logger.info(...)`
     - Unexpected behavior  `logger.warn(...)`
   - `console.warn(...)`  `logger.warn(...)`
   - `console.error(...)`  `logger.error(...)`
   - `console.debug(...)`  `logger.debug(...)`

5. **Format guidelines:**
   ```javascript
   //  BEFORE
   console.log('User logged in:', user);
   console.log('API call failed', error);
   
   //  AFTER
   logger.info('User authentication successful', {
     userId: user.id,
     username: user.username,
     loginMethod: 'password'
   });
   
   logger.error('API request failed', {
     endpoint: '/api/users',
     error: error.message,
     statusCode: error.response?.status
   });
   ```

6. **Sensitive data check:**
   - Never log: passwords, tokens, API keys, secrets
   - Redact if necessary: `token: '<redacted>'`

7. **Build verification:**
   ```bash
   npm run build
   ```

8. **Review & commit:**
   - Show summary to user
   - Get approval
   - Commit: `chore: code audit - logging cleanup and dead code removal`

## Output Example
```
Code Audit Report
=================
Baseline: v1.1.6-recovered
Files scanned: 23

Changes:
- Converted 12 console.log  logger.info
- Converted 3 console.log → logger.debug
- Converted 5 console.error  logger.error
- Removed 4 unused imports
- Removed 87 lines of commented code
- Removed 1 unreachable function

Files modified: 8
Build status:  Passed

Ready to commit?
```

## Reference

See `docs/development/LOGGING_REFERENCE.md` for detailed logging standards.
