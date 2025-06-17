#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Define directory structure
const directories = [
  'data/raw/ontologies',
  'data/raw/schemas',
  'data/raw/mappings',
  'data/processed',
  'data/cache',
  'data/audit',
  'logs',
  'dist',
  'temp'
];

async function createDirectories() {
  console.log('Setting up project directories...\n');
  
  for (const dir of directories) {
    const fullPath = path.join(projectRoot, dir);
    
    try {
      await fs.mkdir(fullPath, { recursive: true });
      console.log(`✓ Created: ${dir}`);
    } catch (error) {
      if (error.code === 'EEXIST') {
        console.log(`✓ Exists:  ${dir}`);
      } else {
        console.error(`✗ Failed:  ${dir} - ${error.message}`);
      }
    }
  }
  
  // Create .gitkeep files in data directories
  const gitkeepDirs = [
    'data/raw/ontologies',
    'data/raw/schemas',
    'data/raw/mappings',
    'data/processed',
    'data/cache',
    'data/audit',
    'logs'
  ];
  
  console.log('\nCreating .gitkeep files...');
  
  for (const dir of gitkeepDirs) {
    const gitkeepPath = path.join(projectRoot, dir, '.gitkeep');
    
    try {
      await fs.writeFile(gitkeepPath, '');
      console.log(`✓ Created: ${dir}/.gitkeep`);
    } catch (error) {
      console.error(`✗ Failed:  ${dir}/.gitkeep - ${error.message}`);
    }
  }
  
  // Create example .env file if it doesn't exist
  const envPath = path.join(projectRoot, '.env');
  const envExamplePath = path.join(projectRoot, '.env.example');
  
  try {
    await fs.access(envPath);
    console.log('\n✓ .env file already exists');
  } catch {
    try {
      const envExample = await fs.readFile(envExamplePath, 'utf-8');
      await fs.writeFile(envPath, envExample);
      console.log('\n✓ Created .env from .env.example');
    } catch (error) {
      console.log('\n! Could not create .env file - please copy .env.example manually');
    }
  }
  
  console.log('\n✓ Directory setup complete!');
}

// Run the setup
createDirectories().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});