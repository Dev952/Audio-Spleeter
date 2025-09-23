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
RUN npm ci

# Copy application source code
COPY . .

# Build Next.js application
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

# Copy built Node.js app (only production build, no dev deps)
COPY --from=builder /app ./

# Ensure uploads dir exists
RUN mkdir -p public/uploads

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
