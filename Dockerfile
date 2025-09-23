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

# Build Next.js application (skip ESLint for now)
RUN npm run build

# Stage 2: Production image (smaller)
FROM node:18-slim

# Install minimal Python (runtime only, no dev tools)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
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

# Copy built Next.js app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy other necessary files
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/tailwind.config.js ./
COPY --from=builder /app/postcss.config.js ./

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