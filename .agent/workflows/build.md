---
description: Build and deploy Docker images (develop or production)
---

# /build

## Usage

```
/build develop     → Build and deploy develop images
/build production  → Production release with version bump
```

---

## Develop Build

1. **Verify build passes**
   ```bash
   npm run build
   ```

2. **Build Docker image**
   ```bash
   docker build -t pickels23/framerr:develop .
   ```

3. **Push to Docker Hub** (requires user approval)
   ```bash
   docker push pickels23/framerr:develop
   ```

---

## Git Branch Hierarchy

```
main         ← Production releases (squash merge from develop)
  ↑
develop      ← Active development (regular merges)
  ↑
feature/*    ← Isolated features (with user approval)
```

### Rules

| Branch | Commits | Merge Type | Push to GitHub |
|--------|---------|------------|----------------|
| `feature/*` | Messy OK | Regular merge → develop | Optional |
| `develop` | Frequent OK | **Squash merge** → main | Yes (backup) |
| `main` | Clean history | Only via squash merge | Yes |

### When to Use Feature Branches

**Ask user first!** Create feature branch when:
- Large feature that spans multiple sessions
- Experimental changes that might be reverted
- User explicitly requests isolation

**Stay on develop when:**
- Small fixes or improvements
- Single-session work
- User doesn't specify

---

## Production Build

### Pre-flight
1. **Verify build passes**
   ```bash
   npm run build
   ```

2. **Ask user for version number**
   
   Suggest based on changes (check draft changelog):
   - **Patch** (1.2.0 → 1.2.1): Bug fixes only
   - **Minor** (1.2.0 → 1.3.0): New features
   - **Major** (1.2.0 → 2.0.0): Breaking changes

### Changelog Finalization
3. **Finalize detailed version file**
   
   In `docs/versions/[version].md`:
   - Update version in header
   - **Change status from DRAFT to RELEASED**
   - Remove "DRAFT STATUS" warning
   - Keep technical details (this is the "info dump" version)

4. **Create polished CHANGELOG entry**
   
   **Prepend** to `/CHANGELOG.md` (after header, before previous version):
   - Summarize key user-facing changes
   - Less technical than the version file
   - Follow existing CHANGELOG format
   
   For smaller releases: can be same as version file
   For larger releases: distill to meaningful highlights

### Version Update
5. **Update package.json versions**
   - Update `package.json` version
   - Update `server/package.json` version

6. **Commit version bump**
   ```bash
   git add .
   git commit -m "chore: release vX.X.X"
   ```

### Git Operations
7. **Squash merge to main** (requires user approval)
   ```bash
   git checkout main
   git pull origin main
   git merge --squash develop
   ```
   
   **If conflicts occur:**
   - Accept develop version for ALL files: `git checkout --theirs <file>`
   - For deleted files: `git rm <file>`
   - Stage all: `git add -A`
   
   ```bash
   git commit -m "release: vX.X.X - [summary of changes]"
   git push origin main
   ```
   
   ⚠️ Squash merge creates ONE clean commit on main with all develop changes

7.5. **CRITICAL: Sync develop with main** (prevents future conflicts)
   
   After pushing to main, merge main back into develop:
   ```bash
   git checkout develop
   git merge main
   ```
   
   **Why this is required:**
   - Squash merge creates a NEW commit on main with no relationship to develop's commits
   - Without this step, git doesn't know develop's changes are already on main
   - Next squash merge would show ALL old commits as conflicts
   
   **If conflicts occur:**
   - Keep develop's version: `git checkout --ours <file>`
   - Commit: `git commit -m "Merge main into develop after vX.X.X release"`
   
   Push the sync commit:
   ```bash
   git push origin develop
   ```

8. **Tag release**
   ```bash
   git tag -a vX.X.X -m "Release X.X.X"
   git push origin vX.X.X
   ```

### Docker
9. **Build and push Docker images** (requires user approval)
   ```bash
   docker build -t pickels23/framerr:X.X.X -t pickels23/framerr:latest .
   docker push pickels23/framerr:X.X.X
   docker push pickels23/framerr:latest
   ```

### Post-release
10. **Create production backup**
    ```powershell
    # Run from Framerr-app-backup directory
    C:\Users\Jonathan\Documents\Antigravity\Framerr-app-backup\backup.ps1
    ```
    This creates: `Framerr-app-backup/backup_MM_DD_YYYY/`

11. **Return to develop and update tracking**
    ```bash
    git checkout develop
    ```
    
    Update `docs/chatflow/TASK_CURRENT.md`:
    - **Last Released Version:** X.X.X
    - **Release Status:** RELEASED
    - **Draft Changelog:** (empty or next version)
    - **Draft Status:** (empty - will be created next session)

12. **Create next draft changelog** (optional, can wait for next session)
    Create `docs/versions/X.X.X.md` placeholder for next version
