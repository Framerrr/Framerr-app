---
description: Build and deploy development Docker images
---

# Build Development Images

**Status:** PLACEHOLDER - Needs user collaboration to define workflow

## Purpose

Build and deploy Docker images for development:
- `develop` tag - Production-like build for testing
- `develop-debug` tag - Debug build with source maps

## Workflow To Be Defined

User will specify:
1. Pre-build verification steps
2. Docker build commands
3. Tag/push strategy
4. Testing/verification steps
5. Rollback procedures

## Related Files

- `Dockerfile` - Production build
- `Dockerfile.dev` - Debug build (to be created)
- `docs/development/DOCKER_BUILDS.md` - Build documentation (to be created)

## Temporary Manual Process

Until workflow is defined:
1. Verify build passes: `npm run build`
2. Build production image: `docker build -t pickels23/framerr:develop .`
3. Build debug image: `docker build -f Dockerfile.dev -t pickels23/framerr:develop-debug .`
4. Push images: `docker push pickels23/framerr:develop` and `docker push pickels23/framerr:develop-debug`

**Note:** Get user approval before pushing images.
