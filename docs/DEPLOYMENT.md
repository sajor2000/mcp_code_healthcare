# Deployment Guide

This guide covers deploying the Healthcare Research MCP Server.

## Prerequisites

- Node.js 18+ installed
- Git installed
- API keys for Brave and Firecrawl
- 2GB+ free disk space for ontology data

## Quick Start

1. **Clone and setup**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/healthcare-research-mcp.git
   cd healthcare-research-mcp
   ./scripts/setup-repo.sh
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Install and build**:
   ```bash
   npm install
   npm run build
   ```

4. **Test basic functionality**:
   ```bash
   ./scripts/test-minimal.sh
   ```

5. **Collect data** (optional, requires API keys):
   ```bash
   npm run collect:all
   npm run process:all
   ```

6. **Start the server**:
   ```bash
   npm start
   ```

## Production Deployment

### Using PM2

1. Install PM2:
   ```bash
   npm install -g pm2
   ```

2. Create PM2 config:
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'healthcare-mcp',
       script: './dist/server/index.js',
       instances: 1,
       autorestart: true,
       watch: false,
       max_memory_restart: '1G',
       env: {
         NODE_ENV: 'production'
       }
     }]
   };
   ```

3. Start with PM2:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Using Docker

1. Build image:
   ```bash
   docker build -t healthcare-mcp .
   ```

2. Run container:
   ```bash
   docker run -d \
     --name healthcare-mcp \
     -p 3000:3000 \
     -v $(pwd)/data:/app/data \
     --env-file .env \
     healthcare-mcp
   ```

### Using systemd

1. Create service file `/etc/systemd/system/healthcare-mcp.service`:
   ```ini
   [Unit]
   Description=Healthcare Research MCP Server
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/opt/healthcare-mcp
   ExecStart=/usr/bin/node /opt/healthcare-mcp/dist/server/index.js
   Restart=on-failure
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```

2. Enable and start:
   ```bash
   sudo systemctl enable healthcare-mcp
   sudo systemctl start healthcare-mcp
   ```

## Environment Variables

Required:
- `BRAVE_API_KEY`: Your Brave Search API key
- `FIRECRAWL_API_KEY`: Your Firecrawl API key

Optional:
- `MCP_SERVER_PORT`: Server port (default: 3000)
- `MCP_SERVER_HOST`: Server host (default: localhost)
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level (debug/info/warn/error)

## Data Management

### Initial Data Collection

Run once after deployment:
```bash
npm run collect:all
npm run process:all
```

This will:
- Fetch medical ontologies (ICD-10, SNOMED, RxNorm, LOINC)
- Collect OMOP and CLIF schemas
- Process and index all data

### Data Updates

Schedule periodic updates:
```bash
# Add to crontab for monthly updates
0 0 1 * * cd /opt/healthcare-mcp && npm run update:ontologies
```

## Monitoring

### Health Check

Add health check endpoint monitoring:
```bash
curl http://localhost:3000/health
```

### Logs

- Application logs: `./logs/app.log`
- Error logs: `./logs/error.log`
- Access logs: `./logs/access.log`

### Metrics

Monitor:
- Memory usage (should stay under 1GB)
- CPU usage (typically <10%)
- Response times (<100ms for most queries)
- Database size (grows ~2GB with full data)

## Security

1. **API Keys**: Never commit `.env` file
2. **Network**: Use reverse proxy (nginx) in production
3. **Updates**: Keep dependencies updated
4. **Access**: Restrict database write access

## Troubleshooting

### Server won't start
- Check Node.js version: `node -v` (need 18+)
- Verify build: `npm run build`
- Check logs: `tail -f logs/error.log`

### Data collection fails
- Verify API keys in `.env`
- Check network connectivity
- Try collecting one source: `npm run collect:omop`

### Out of memory
- Increase Node memory: `NODE_OPTIONS="--max-old-space-size=4096"`
- Use streaming for large datasets
- Enable swap space

## Backup

Regular backups recommended:
```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backups/healthcare-mcp"
DATE=$(date +%Y%m%d)

# Backup databases
cp -r data/processed $BACKUP_DIR/data-$DATE

# Backup config
cp .env $BACKUP_DIR/env-$DATE

# Keep last 30 days
find $BACKUP_DIR -mtime +30 -delete
```

## Support

- GitHub Issues: [Report issues](https://github.com/YOUR_USERNAME/healthcare-research-mcp/issues)
- Documentation: [Full docs](https://github.com/YOUR_USERNAME/healthcare-research-mcp/wiki)