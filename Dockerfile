# Multi-stage Dockerfile for Healthcare Research MCP Server

# Stage 1: Build stage
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm ci --only=development

# Copy source code
COPY src/ ./src/
COPY scripts/ ./scripts/

# Build the application
RUN npm run build:prod

# Stage 2: Runtime stage
FROM node:20-alpine AS runtime

# Install runtime dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    R \
    R-dev \
    sqlite \
    && rm -rf /var/cache/apk/*

# Install R packages
RUN R -e "install.packages(c('tidyverse', 'survival', 'MatchIt', 'tableone'), repos='https://cran.r-project.org/')"

# Install Python packages
RUN pip3 install --no-cache-dir \
    pandas==2.0.3 \
    numpy==1.24.3 \
    scikit-learn==1.3.0 \
    statsmodels==0.14.0 \
    lifelines==0.27.7

# Create non-root user
RUN addgroup -g 1001 -S mcp && \
    adduser -S -u 1001 -G mcp mcp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy necessary files
COPY --chown=mcp:mcp data/databases/.gitkeep ./data/databases/
COPY --chown=mcp:mcp data/cache/.gitkeep ./data/cache/

# Create required directories
RUN mkdir -p /app/data/databases /app/data/cache /app/data/ontologies /app/logs && \
    chown -R mcp:mcp /app

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    ONTOLOGY_DB_PATH=/app/data/databases/ontology.db \
    RESEARCH_DB_PATH=/app/data/databases/research.db \
    LOG_LEVEL=info

# Switch to non-root user
USER mcp

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start the server
CMD ["node", "dist/server/index-production.js"]

# Stage 3: Development stage (optional)
FROM runtime AS development

# Switch back to root for dev dependencies
USER root

# Install development tools
RUN apk add --no-cache bash curl vim

# Copy source code for development
COPY --chown=mcp:mcp src/ ./src/
COPY --chown=mcp:mcp tests/ ./tests/
COPY --chown=mcp:mcp vitest.config.ts ./

# Install dev dependencies
RUN npm ci

# Switch back to mcp user
USER mcp

# Development command
CMD ["npm", "run", "dev"]