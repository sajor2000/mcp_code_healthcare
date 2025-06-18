# Dockerfile for standalone MCP server
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (without better-sqlite3)
RUN npm ci --only=production || npm install --production

# Copy source files
COPY dist/ ./dist/
COPY data/mock-icu-data/sample-*.csv ./data/mock-icu-data/
COPY data/mock-icu-data/*.py ./data/mock-icu-data/
COPY data/mock-icu-data/*.json ./data/mock-icu-data/
COPY data/mock-icu-data/*.md ./data/mock-icu-data/

# Expose stdio
CMD ["node", "dist/server/index-standalone.js"]