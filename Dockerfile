# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build frontend
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    su-exec \
    shadow

# Create app user (will be remapped by entrypoint)
# Use GID/UID 10000 to avoid conflicts with Alpine's existing users
RUN addgroup -g 10000 framerr && \
    adduser -D -u 10000 -G framerr framerr

WORKDIR /app

# Copy backend package files
COPY server/package*.json ./server/

# Install build dependencies, install npm packages (including devDeps for TypeScript)
# This ensures better-sqlite3 native module is compiled for the correct architecture
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    && cd server \
    && npm ci \
    && apk del .build-deps

# Copy backend code
COPY server/ ./server/

# Copy TypeScript config and shared types for compilation
COPY tsconfig.base.json ./
COPY shared/ ./shared/

# Compile TypeScript to JavaScript
RUN cd server && npm run build

# Remove devDependencies after build to reduce image size
RUN cd server && npm prune --omit=dev

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/dist ./dist

# Copy entrypoint script and convert to Unix line endings (fixes Windows CRLF issue)
COPY docker-entrypoint.sh /
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

# Create config directory
RUN mkdir -p /config && \
    chown -R framerr:framerr /config /app

# Volumes
VOLUME ["/config"]

# Environment defaults
ENV NODE_ENV=production \
    PORT=3001 \
    PUID=99 \
    PGID=100 \
    TZ=UTC \
    DATA_DIR=/config

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use entrypoint for PUID/PGID support
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["dumb-init", "node", "server/dist/index.js"]

# Labels
LABEL org.opencontainers.image.title="Framerr" \
    org.opencontainers.image.description="Modern homelab dashboard with iframe tabs - Organizr alternative" \
    org.opencontainers.image.authors="pickels23" \
    org.opencontainers.image.url="https://github.com/pickels23/framerr" \
    org.opencontainers.image.source="https://github.com/pickels23/framerr" \
    org.opencontainers.image.version="1.0.0"
