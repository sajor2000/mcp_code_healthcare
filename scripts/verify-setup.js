#!/usr/bin/env node
/**
 * Step-by-step verification of the Healthcare Research MCP Server setup
 * This follows context from the user's request to check the code
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

console.log('🏥 Healthcare Research MCP Server - Setup Verification\n');
console.log('This script checks your setup step by step based on context.\n');

const checks = [
  {
    name: 'Node.js version',
    check: async () => {
      const version = process.version;
      const major = parseInt(version.split('.')[0].substring(1));
      if (major >= 18) {
        return { success: true, message: `Node.js ${version} ✓` };
      }
      return { success: false, message: `Node.js ${version} (need v18+)` };
    }
  },
  {
    name: 'Project structure',
    check: async () => {
      const requiredDirs = ['src', 'scripts', 'data', 'bin'];
      const missing = requiredDirs.filter(dir => 
        !fs.existsSync(path.join(projectRoot, dir))
      );
      if (missing.length === 0) {
        return { success: true, message: 'All directories present ✓' };
      }
      return { success: false, message: `Missing: ${missing.join(', ')}` };
    }
  },
  {
    name: 'Dependencies installed',
    check: async () => {
      const nodeModules = path.join(projectRoot, 'node_modules');
      if (fs.existsSync(nodeModules)) {
        return { success: true, message: 'node_modules exists ✓' };
      }
      return { success: false, message: 'Run: npm install' };
    }
  },
  {
    name: 'TypeScript build',
    check: async () => {
      const distDir = path.join(projectRoot, 'dist');
      const mainFile = path.join(distDir, 'server', 'index.js');
      if (fs.existsSync(mainFile)) {
        return { success: true, message: 'Built successfully ✓' };
      }
      return { success: false, message: 'Run: npm run build' };
    }
  },
  {
    name: 'Database directories',
    check: async () => {
      const dbDir = path.join(projectRoot, 'data', 'databases');
      if (fs.existsSync(dbDir)) {
        return { success: true, message: 'Database directory exists ✓' };
      }
      return { success: false, message: 'Run: npm run setup:dirs' };
    }
  },
  {
    name: 'Environment configuration',
    check: async () => {
      const envFile = path.join(projectRoot, '.env');
      if (fs.existsSync(envFile)) {
        const content = fs.readFileSync(envFile, 'utf8');
        const hasApiKey = content.includes('ANTHROPIC_API_KEY=') || 
                         content.includes('OPENAI_API_KEY=') ||
                         content.includes('OLLAMA');
        if (hasApiKey) {
          return { success: true, message: '.env configured ✓' };
        }
        return { success: false, message: '.env exists but needs API keys' };
      }
      return { success: false, message: 'Copy .env.example to .env' };
    }
  },
  {
    name: 'MCP tools registration',
    check: async () => {
      const toolsDir = path.join(projectRoot, 'dist', 'tools', 'research');
      if (fs.existsSync(toolsDir)) {
        const tools = fs.readdirSync(toolsDir).filter(f => f.endsWith('.js'));
        if (tools.includes('natural-language-query.js')) {
          return { success: true, message: `${tools.length} tools compiled ✓` };
        }
        return { success: false, message: 'Natural language query tool missing' };
      }
      return { success: false, message: 'Tools not built' };
    }
  },
  {
    name: 'LLM provider check',
    check: async () => {
      // Check environment for LLM configuration
      const hasCloudKey = process.env.ANTHROPIC_API_KEY || 
                         process.env.OPENAI_API_KEY || 
                         process.env.GOOGLE_API_KEY;
      
      if (hasCloudKey) {
        return { success: true, message: 'Cloud LLM configured ✓' };
      }
      
      // Check if Ollama is available
      try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (response.ok) {
          return { success: true, message: 'Ollama (local) available ✓' };
        }
      } catch (e) {
        // Ollama not running
      }
      
      return { 
        success: false, 
        message: 'No LLM provider configured (add API key or run Ollama)' 
      };
    }
  }
];

// Run all checks
async function runChecks() {
  let allPassed = true;
  
  for (const { name, check } of checks) {
    process.stdout.write(`Checking ${name}... `);
    try {
      const result = await check();
      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.log(`❌ ${result.message}`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      allPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  if (allPassed) {
    console.log('✨ All checks passed! Your MCP server is ready to use.');
    console.log('\nNext steps:');
    console.log('1. Test the server: node scripts/quick-test.js');
    console.log('2. Or add to Claude Desktop (see SETUP-CLAUDE-DESKTOP.md)');
  } else {
    console.log('⚠️  Some checks failed. Please fix the issues above.');
    console.log('\nQuick fix commands:');
    console.log('npm install          # Install dependencies');
    console.log('npm run build        # Build TypeScript');
    console.log('npm run setup:dirs   # Create directories');
    console.log('npm run db:init      # Initialize databases');
  }
}

// Main
runChecks().catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});