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

1. **Verify build passes**
   ```bash
   npm run build
   ```

2. **Update version** (ask user for version number)
   - Update `package.json` version
   - Update `server/package.json` version
   - Update `CHANGELOG.md`

3. **Commit version bump**
   ```bash
   git add .
   git commit -m "chore: bump version to X.X.X"
   ```

4. **Merge to main** (requires user approval)
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

5. **Tag release**
   ```bash
   git tag -a vX.X.X -m "Release X.X.X"
   git push origin vX.X.X
   ```

6. **Build and push Docker images** (requires user approval)
   ```bash
   docker build -t pickels23/framerr:X.X.X -t pickels23/framerr:latest .
   docker push pickels23/framerr:X.X.X
   docker push pickels23/framerr:latest
   ```

7. **Return to develop**
   ```bash
   git checkout develop
   ```
