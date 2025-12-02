# Docker Builds Guide

This document explains the different Docker build configurations for Framerr.

---

## Build Types

### Production Build (`Dockerfile`)

**Purpose:** Optimized production deployments  
**Tags:** `develop`, `latest`, version tags (e.g., `1.1.7`)

**Characteristics:**
- ✅ Minified JavaScript bundle
- ❌ No source maps
- ✅ Smallest image size (~150MB)
- ✅ Optimized for performance

**Use When:**
- Deploying to production
- Testing production-like builds
- Releasing versioned images

### Development/Debug Build (`Dockerfile.dev`)

**Purpose:** Development builds with debugging support  
**Tag:** `develop-debug`

**Characteristics:**
- ❌ NOT minified (readable code)
- ✅ Source maps included
- ⚠️ Larger image size (~250MB)
- ✅ Full debugging in browser DevTools

**Use When:**
- Debugging issues in deployed containers
- Inspecting code in browser
- Understanding execution flow
- Troubleshooting production issues locally

---

## Build Configuration

### Vite Configuration

The build behavior is controlled by `NODE_ENV`:

```javascript
build: {
    sourcemap: process.env.NODE_ENV === 'development',
    minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
    outDir: 'dist',
}
```

- **Production:** Minified, no source maps
- **Development:** Not minified, source maps enabled

### Docker Build Commands

#### Production Build
```bash
# Build
docker build -t pickels23/framerr:develop .

# Push
docker push pickels23/framerr:develop
```

#### Debug Build
```bash
# Build
docker build -f Dockerfile.dev -t pickels23/framerr:develop-debug .

# Push
docker push pickels23/framerr:develop-debug
```

---

## Image Comparison

| Tag | Purpose | Minified | Source Maps | Size | Use Case |
|-----|---------|----------|-------------|------|----------|
| `develop` | Dev testing | ✅ Yes | ❌ No | ~150MB | Test production-like build |
| `develop-debug` | Dev debugging | ❌ No | ✅ Yes | ~250MB | Debug with browser DevTools |
| `1.1.7` | Production | ✅ Yes | ❌ No | ~150MB | Versioned release |
| `latest` | Production | ✅ Yes | ❌ No | ~150MB | Latest production |

---

## When to Use Debug Build

### Scenarios

1. **Investigating Bug Reports**
   - User reports issue in deployed version
   - Need to see actual source code, not minified
   - Set breakpoints in browser DevTools

2. **Performance Analysis**
   - Profiling code execution
   - Understanding call stacks
   - Analyzing component rendering

3. **Learning Codebase**
   - New developer onboarding
   - Understanding code flow
   - Following execution paths

4. **Production Issue Reproduction**
   - Issue only happens in Docker
   - Can't reproduce locally
   - Need to debug in containerized environment

### How to Debug

1. **Run debug image:**
   ```bash
   docker run -d -p 3001:3001 \
     -v /path/to/config:/config \
     pickels23/framerr:develop-debug
   ```

2. **Open browser DevTools:**
   - F12 in Chrome/Edge
   - Navigate to Sources tab
   - See original source code with proper filenames

3. **Set breakpoints:**
   - Click line numbers in Sources
   - Code will pause at breakpoints
   - Inspect variables, call stack

4. **Source maps enabled:**
   - Stack traces show original file:line
   - Console errors reference source files
   - Network tab shows `.js.map` files

---

## Build Workflows

### Development Deployment

Use `/build-develop` workflow (to be defined with user):
1. Run `npm run build` test locally
2. Build both images (`develop` + `develop-debug`)
3. Push to Docker Hub
4. Test in staging environment

### Production Release

Use `/build-production` workflow (to be defined with user):
1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Git tag release
4. Build production image
5. Tag as version + `latest`
6. Push to Docker Hub
7. Deploy to production

---

## Size Considerations

**Why is debug image larger?**

- Source maps add ~100MB
- Non-minified code is more verbose
- Additional debugging metadata

**Trade-off:**
- Development: Debuggability > Size
- Production: Performance & Size > Debuggability

---

## Best Practices

### Always Build Both

When deploying to `develop`:
```bash
# Build production-like for testing
docker build -t pickels23/framerr:develop .

# Build debug for troubleshooting
docker build -f Dockerfile.dev -t pickels23/framerr:develop-debug .

# Push both
docker push pickels23/framerr:develop
docker push pickels23/framerr:develop-debug
```

**Rationale:** Having both available allows switching between performance testing and debugging without rebuilding.

### Tag Consistently

- `develop` - Latest development (minified)
- `develop-debug` - Latest development (debug)
- `X.Y.Z` - Versioned release (minified only)
- `latest` - Latest stable (minified only)

### Document Which is Deployed

In `docs/tasks/HANDOFF.md`:
```markdown
## Docker Images
- Development: `pickels23/framerr:develop` (pushed: 2025-12-02 15:00)
- Debug: `pickels23/framerr:develop-debug` (pushed: 2025-12-02 15:00)
- Production: `pickels23/framerr:1.1.6`
```

---

## Troubleshooting

### Build Fails

**Check NODE_ENV:**
```bash
# Should be 'production' for Dockerfile
# Should be 'development' for Dockerfile.dev
echo $NODE_ENV
```

**Verify vite.config.js:**
- `sourcemap` setting correct?
- `minify` setting correct?

### Source Maps Not Working

**Verify files exist:**
```bash
docker run --rm pickels23/framerr:develop-debug ls -la dist/*.map
```

**Check browser:**
- DevTools → Settings → Enable JavaScript source maps
- Network tab → Filter by `.map` → Should see requests

### Image Too Large

**Production should be ~150MB:**
```bash
docker images | grep develop
```

**Debug should be ~250MB** - this is expected!

---

## Related Files

- `Dockerfile` - Production build
- `Dockerfile.dev` - Debug build
- `vite.config.js` - Build configuration
- `.dockerignore` - Files excluded from images
- `docker-entrypoint.sh` - Container initialization

---

**Last Updated:** 2025-12-02  
**Related Workflows:** `/build-develop`, `/build-production`
