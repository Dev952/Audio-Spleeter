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

# Copy package.json and package-lock.json (if exists)
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts

# Copy essential files and any config files that exist
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

# Copy config files in a way that doesn't fail if they don't exist
RUN mkdir -p /tmp/configs
COPY --from=builder /app/ /tmp/configs/
RUN find /tmp/configs -maxdepth 1 -name "*.config.*" -exec cp {} ./ \; 2>/dev/null || true
RUN rm -rf /tmp/configs

# Copy source files needed at runtime
COPY --from=builder /app/src ./src

# Ensure uploads dir exists
RUN mkdir -p public/uploads && chmod 755 public/uploads

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the app
CMD ["npm", "start"]