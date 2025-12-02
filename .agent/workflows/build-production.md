---
description: Build and deploy production Docker images
---

# Build Production Images

**Status:** PLACEHOLDER - Needs user collaboration to define workflow

## Purpose

Build and deploy production Docker images with proper versioning.

## Workflow To Be Defined

User will specify:
1. Version bumping strategy
2. Changelog generation
3. Git tagging process
4. Production build verification
5. Image tagging strategy (semantic versioning)
6. Docker Hub push procedures
7. Deployment verification
8. Rollback procedures

## Related Files

- `Dockerfile` - Production build configuration
- `CHANGELOG.md` - Version changelog
- `package.json` - Version number

## Temporary Manual Process

Until workflow is defined:
1. Update `package.json` version
2. Update `CHANGELOG.md`
3. Commit: `git commit -m "chore: bump version to X.X.X"`
4. Tag: `git tag -a vX.X.X -m "Release X.X.X"`
5. Build: `docker build -t pickels23/framerr:X.X.X -t pickels23/framerr:latest .`
6. Push: `docker push pickels23/framerr:X.X.X` and `docker push pickels23/framerr:latest`

**Note:** MUST get user approval before any production release.
