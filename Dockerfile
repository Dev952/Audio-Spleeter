# Stage 1: Build dependencies
FROM node:18-slim AS builder

# Install Python and system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Python requirements first (better caching)
COPY requirements.txt ./

# Create virtual environment and install Python deps
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt

# Copy Node.js dependencies
COPY package*.json ./

# Install Node.js dependencies (with lock file fix)
RUN rm -f package-lock.json && npm install

# Copy application source code
COPY . .

# Add build-time environment variables
ARG MONGODB_URI
ARG JWT_SECRET
ARG NEXTAUTH_SECRET
ARG NEXTAUTH_URL

# Set environment variables for build
ENV MONGODB_URI=$MONGODB_URI
ENV JWT_SECRET=$JWT_SECRET
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV NEXTAUTH_URL=$NEXTAUTH_URL

# Ensure TypeScript is installed in build stage
RUN npm install --save-dev typescript @types/node

# Build Next.js application (skip ESLint for now)
RUN npm run build

# Stage 2: Production image (smaller)
FROM node:18-slim

# Install minimal Python (runtime only, no dev tools)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy package files
COPY --from=builder /app/package*.json ./

# Copy built application and necessary files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy all config files (handles .ts and .js extensions)
COPY --from=builder /app/next.config.* ./ 2>/dev/null || :
COPY --from=builder /app/tailwind.config.* ./ 2>/dev/null || :
COPY --from=builder /app/postcss.config.* ./ 2>/dev/null || :
COPY --from=builder /app/tsconfig.json ./ 2>/dev/null || :

# Copy source files needed at runtime
COPY --from=builder /app/src ./src

# Copy node_modules from builder (includes TypeScript and all dependencies)
COPY --from=builder /app/node_modules ./node_modules

# Ensure uploads dir exists
RUN mkdir -p public/uploads && chmod 755 public/uploads

# Set npm cache directory to writable location and other npm configs
ENV NPM_CONFIG_CACHE=/tmp/.npm
ENV NPM_CONFIG_PREFIX=/tmp/.npm-global
ENV HOME=/tmp

# Create necessary directories
RUN mkdir -p /tmp/.npm /tmp/.npm-global

# REMOVE USER CREATION ENTIRELY - Run as root
# The permissions issue is causing problems, so we'll run as root for now

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the app
CMD ["npm", "start"]