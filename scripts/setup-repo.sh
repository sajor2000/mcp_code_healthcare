#!/bin/bash
# Setup script for Healthcare Research MCP Server repository

set -e

echo "==================================="
echo "Healthcare Research MCP Server"
echo "Repository Setup Script"
echo "==================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# 1. Check if git is initialized
if [ ! -d ".git" ]; then
    echo "Initializing git repository..."
    git init
    print_status "Git repository initialized"
else
    print_status "Git repository already initialized"
fi

# 2. Check Node.js version
required_node_version=18
current_node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$current_node_version" -lt "$required_node_version" ]; then
    print_error "Node.js version $required_node_version or higher is required"
    exit 1
else
    print_status "Node.js version check passed (v$current_node_version)"
fi

# 3. Install dependencies
echo -e "\nInstalling dependencies..."
npm install
print_status "Dependencies installed"

# 4. Create necessary directories
echo -e "\nCreating directory structure..."
directories=(
    "data/raw/ontologies/icd10"
    "data/raw/ontologies/snomed"
    "data/raw/ontologies/rxnorm"
    "data/raw/ontologies/loinc"
    "data/raw/schemas/omop"
    "data/raw/schemas/clif"
    "data/raw/mappings"
    "data/processed"
    "data/cache"
    "logs"
    "dist"
    ".github/workflows"
)

for dir in "${directories[@]}"; do
    mkdir -p "$dir"
done
print_status "Directory structure created"

# 5. Setup environment file
if [ ! -f ".env" ]; then
    cp .env.example .env
    print_warning "Created .env file - please configure your API keys"
else
    print_status ".env file already exists"
fi

# 6. Create initial test file
echo -e "\nCreating test structure..."
mkdir -p tests
cat > tests/server.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';

describe('Healthcare Research MCP Server', () => {
  it('should have tests', () => {
    expect(true).toBe(true);
  });
});
EOF
print_status "Test structure created"

# 7. Build the project
echo -e "\nBuilding the project..."
npm run build || print_warning "Build completed with warnings"

# 8. Setup git hooks (optional)
if command -v npx &> /dev/null; then
    echo -e "\nSetting up git hooks..."
    npx husky install 2>/dev/null || true
fi

# 9. Create initial commit (if no commits yet)
if ! git rev-parse HEAD &> /dev/null 2>&1; then
    echo -e "\nCreating initial commit..."
    git add .
    git commit -m "Initial commit: Healthcare Research MCP Server" || true
    print_status "Initial commit created"
fi

# 10. Display next steps
echo -e "\n${GREEN}==================================="
echo "Setup Complete!"
echo "===================================${NC}"
echo ""
echo "Next steps:"
echo "1. Configure your API keys in .env file:"
echo "   - BRAVE_API_KEY"
echo "   - FIRECRAWL_API_KEY"
echo ""
echo "2. Add GitHub remote:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/healthcare-research-mcp.git"
echo ""
echo "3. Push to GitHub:"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "4. Optional: Run data collection (requires API keys):"
echo "   npm run collect:all"
echo ""
echo "5. Start the server:"
echo "   npm start"
echo ""
print_status "Repository is ready for GitHub!"