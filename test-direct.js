#!/usr/bin/env node
// Direct test of MCP server capabilities

console.log('🧪 Direct Testing of Healthcare Research MCP Server\n');

// Test 1: Check if all required files exist
console.log('1️⃣ Checking project structure...');
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'package.json',
  'src/server/index.ts',
  'src/tools/research/natural-language-query.ts',
  'src/tools/research/medical-knowledge-tool.ts',
  'src/nlp/llm-medical-nlp.ts',
  'README.md'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
}

console.log(allFilesExist ? '\n✅ All core files present!' : '\n❌ Some files missing');

// Test 2: Check package.json configuration
console.log('\n2️⃣ Checking package.json configuration...');
const packageJson = require('./package.json');

console.log(`  Name: ${packageJson.name}`);
console.log(`  Version: ${packageJson.version}`);
console.log(`  MCP SDK: ${packageJson.dependencies['@modelcontextprotocol/sdk'] || 'Not found'}`);
console.log(`  Main: ${packageJson.main}`);
console.log(`  Bin: ${Object.keys(packageJson.bin || {}).join(', ') || 'None'}`);

// Test 3: List available tools
console.log('\n3️⃣ Available MCP Tools:');
const toolFiles = fs.readdirSync(path.join(__dirname, 'src/tools/research'));
toolFiles.forEach(file => {
  if (file.endsWith('.ts')) {
    console.log(`  🔧 ${file.replace('.ts', '')}`);
  }
});

// Test 4: Check for test examples
console.log('\n4️⃣ Test Examples:');
const exampleFiles = fs.readdirSync(path.join(__dirname, 'examples'));
exampleFiles.forEach(file => {
  console.log(`  📝 ${file}`);
});

// Test 5: Environment check
console.log('\n5️⃣ Environment Check:');
console.log(`  Node.js: ${process.version}`);
console.log(`  Platform: ${process.platform}`);
console.log(`  Architecture: ${process.arch}`);

// Show how to test with Claude Desktop
console.log('\n📱 To test with Claude Desktop:');
console.log('1. Copy claude_desktop_config.example.json to:');
console.log('   - macOS: ~/Library/Application Support/Claude/claude_desktop_config.json');
console.log('   - Windows: %APPDATA%\\Claude\\claude_desktop_config.json');
console.log('   - Linux: ~/.config/Claude/claude_desktop_config.json');
console.log('2. Update the path in the config to point to this directory');
console.log('3. Restart Claude Desktop');
console.log('4. Use queries like: "Using my dataset, analyze sepsis mortality"');

console.log('\n🚀 Quick Start Commands:');
console.log('  npm install          # Install dependencies');
console.log('  npm run build        # Build the project');
console.log('  npm run dev          # Run in development mode');
console.log('  npm test             # Run tests');

console.log('\n✅ Testing complete!');