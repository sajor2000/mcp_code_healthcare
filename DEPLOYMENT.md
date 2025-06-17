# Healthcare Research MCP Server - Deployment Guide

## System Overview

The Healthcare Research MCP Server is now production-ready with the following key capabilities:

### 1. Natural Language Query Processing
- **LLM Integration**: Supports 8+ LLM providers (Anthropic, OpenAI, Google, Mistral, Cohere, Ollama, LM Studio, custom)
- **Medical Entity Recognition**: Automatically extracts and codes medical concepts
- **STROBE Compliance**: Built-in checklist for observational study guidelines
- **Fallback Support**: Automatic failover to local models for privacy

### 2. Complete Analysis Pipeline
Users can now ask questions like:
> "Using this dataset I have uploaded, define sepsis, provide descriptive statistics, and see if the medication vancomycin reduces sepsis mortality at 30 days"

The system will:
1. Parse the natural language query using LLM
2. Extract medical concepts (sepsis, vancomycin, mortality)
3. Map to standard codes (ICD-10, SNOMED, RxNorm)
4. Generate research hypothesis
5. Build cohort definitions
6. Create complete R/Python analysis code
7. Generate publication-ready figures
8. Ensure STROBE compliance

### 3. Production Features
- **HIPAA Compliance**: Built-in privacy protection and audit logging
- **Multi-Model Support**: Cloud and local LLM options
- **Enterprise Security**: Row-level security, encrypted storage
- **Performance**: Caching, concurrent processing, optimized queries
- **Monitoring**: Comprehensive logging and metrics

## Quick Deployment

### 1. Prerequisites
```bash
# Required software
node --version  # v18.0.0 or higher
npm --version   # v9.0.0 or higher
R --version     # v4.0.0 or higher (optional, for R code execution)
python --version # v3.8 or higher (optional, for Python code execution)
```

### 2. Installation
```bash
# Clone repository
git clone https://github.com/your-org/healthcare-research-mcp.git
cd healthcare-research-mcp

# Install dependencies
npm install

# Initialize databases
npm run setup:dirs
npm run db:init

# Download medical ontologies (optional but recommended)
npm run collect:ontologies
```

### 3. Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# At minimum, configure one LLM provider:
ANTHROPIC_API_KEY=sk-ant-...  # Recommended
# OR
OPENAI_API_KEY=sk-...
# OR use local Ollama (no API key needed)
```

### 4. Start the Server
```bash
# Development
npm run dev

# Production
npm run build:prod
npm run start:prod
```

### 5. Docker Deployment
```bash
# Build Docker image
docker build -t healthcare-research-mcp .

# Run container
docker run -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e ANTHROPIC_API_KEY=your-key \
  healthcare-research-mcp
```

## Testing the Installation

### 1. Basic Health Check
```bash
curl http://localhost:3000/health
```

### 2. Test Natural Language Query
```javascript
// Using MCP client
const result = await mcp.call('natural_language_query', {
  query: "What medications are commonly used for treating diabetes?",
  execution_mode: "plan_only"
});
```

### 3. Run Integration Tests
```bash
npm test
```

## Production Configuration

### 1. LLM Provider Selection

For production, consider:

**High Accuracy (Cloud)**:
- Anthropic Claude-3 Opus: Best medical understanding
- OpenAI GPT-4 Turbo: Good alternative
- Google Gemini Pro: Fast and affordable

**Privacy-First (Local)**:
- Ollama + Meditron 70B: Medical-specialized
- LM Studio + Custom models: Full control

### 2. Database Configuration

For large deployments, use external databases:
```env
DB_TYPE=postgres
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=healthcare_research
DB_USER=healthcare_user
DB_PASSWORD=secure_password
```

### 3. Security Settings
```env
HIPAA_COMPLIANT=true
AUDIT_LEVEL=detailed
ENABLE_PHI_PROTECTION=true
MIN_CELL_SIZE=10
ENCRYPTION_KEY=your-32-char-key
```

### 4. Performance Tuning
```env
ENABLE_CACHE=true
CACHE_TTL=3600
MAX_CONCURRENT_ANALYSES=5
NODE_ENV=production
CLUSTER_WORKERS=4
```

## Monitoring and Maintenance

### 1. Logs
```bash
# Application logs
tail -f logs/app.log

# Audit logs (HIPAA compliance)
tail -f logs/audit.log

# Performance metrics
tail -f logs/metrics.log
```

### 2. Health Monitoring
- `/health` - Basic health check
- `/metrics` - Prometheus-compatible metrics
- `/status` - Detailed system status

### 3. Backup
```bash
# Backup databases
npm run backup:db

# Backup configuration
npm run backup:config
```

## Common Deployment Scenarios

### 1. Hospital/Health System
```yaml
# docker-compose.yml
version: '3.8'
services:
  mcp-server:
    image: healthcare-research-mcp
    environment:
      - HIPAA_COMPLIANT=true
      - LLM_PROVIDER=ollama  # Local for PHI
      - OLLAMA_MODEL=meditron:70b
    volumes:
      - ./data:/app/data
      - /mnt/ehr-data:/data/input:ro
```

### 2. Research Institution
```yaml
# kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: healthcare-mcp
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: mcp-server
        image: healthcare-research-mcp
        env:
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: api-keys
              key: anthropic
```

### 3. Cloud SaaS
```bash
# AWS ECS Task Definition
{
  "family": "healthcare-mcp",
  "taskRoleArn": "arn:aws:iam::xxx:role/mcp-task",
  "networkMode": "awsvpc",
  "containerDefinitions": [{
    "name": "mcp-server",
    "image": "xxx.dkr.ecr.region.amazonaws.com/healthcare-mcp",
    "environment": [
      {"name": "LLM_PROVIDER", "value": "anthropic"},
      {"name": "DB_TYPE", "value": "aurora"}
    ]
  }]
}
```

## Troubleshooting

### Issue: "No LLM provider available"
**Solution**: Ensure at least one LLM provider is configured in .env

### Issue: "Database initialization failed"
**Solution**: Check write permissions on data/databases directory

### Issue: "R/Python code execution failed"
**Solution**: Install R/Python runtime or disable code execution features

### Issue: "Out of memory errors"
**Solution**: Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=8192`

## Support

- **Documentation**: See `/docs` directory
- **Issues**: GitHub Issues
- **Security**: security@your-org.com
- **Commercial Support**: Available upon request

## Next Steps

1. Configure your preferred LLM provider(s)
2. Load your medical datasets
3. Test with sample queries
4. Monitor usage and performance
5. Scale as needed

The system is now ready to handle complex medical research queries in natural language and generate complete, STROBE-compliant analyses.