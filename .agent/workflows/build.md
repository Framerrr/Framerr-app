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
3. **Finalize draft changelog**
   
   a. Read draft: `docs/versions/[draft].md`
   b. Update version in header if different from filename
   c. **Change status from DRAFT to RELEASED**
   d. Remove "DRAFT STATUS" warning at bottom
   e. Rename file if version changed (e.g., 1.2.1.md → 1.3.0.md)

4. **Copy to root CHANGELOG.md**
   ```
   Copy content of docs/versions/[version].md to /CHANGELOG.md
   ```

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
7. **Merge to main** (requires user approval)
   ```bash
   git checkout main
   git merge develop
   git push origin main
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
10. **Return to develop and update tracking**
    ```bash
    git checkout develop
    ```
    
    Update `docs/chatflow/TASK_CURRENT.md`:
    - **Last Released Version:** X.X.X
    - **Release Status:** RELEASED
    - **Draft Changelog:** (empty or next version)
    - **Draft Status:** (empty - will be created next session)
