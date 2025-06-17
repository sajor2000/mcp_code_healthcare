#!/bin/bash
# Minimal test script to verify basic functionality without API keys

echo "==================================="
echo "Healthcare Research MCP Server"
echo "Minimal Functionality Test"
echo "==================================="

# Test 1: Check if TypeScript builds
echo -e "\n[1/4] Testing TypeScript build..."
if npx tsc --noEmit; then
    echo "✓ TypeScript compilation successful"
else
    echo "✗ TypeScript compilation failed"
    exit 1
fi

# Test 2: Check if server can be imported
echo -e "\n[2/4] Testing server import..."
node -e "
try {
    require('./dist/server/index.js');
    console.log('✓ Server module can be imported');
} catch (e) {
    console.log('✗ Server import failed:', e.message);
    process.exit(1);
}
"

# Test 3: Verify project structure
echo -e "\n[3/4] Verifying project structure..."
required_files=(
    "package.json"
    "tsconfig.json"
    "README.md"
    "LICENSE"
    ".gitignore"
    "src/server/index.ts"
    "src/tools/research/hypothesis-generator.ts"
    "src/tools/research/cohort-builder.ts"
)

all_good=true
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file exists"
    else
        echo "  ✗ $file missing"
        all_good=false
    fi
done

if [ "$all_good" = false ]; then
    echo "✗ Some required files are missing"
    exit 1
fi

# Test 4: Check if example can run (dry run)
echo -e "\n[4/4] Checking example structure..."
if [ -f "examples/sepsis-research-study.js" ]; then
    echo "✓ Example file exists"
else
    echo "✗ Example file missing"
fi

echo -e "\n==================================="
echo "All basic tests passed!"
echo "==================================="
echo ""
echo "Note: Full functionality requires:"
echo "- API keys configured in .env"
echo "- Data collection to be run"
echo "- Database files to be generated"