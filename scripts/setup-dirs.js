#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

const directories = [
  'data/databases',
  'data/cache',
  'data/processed',
  'data/raw/ontologies',
  'data/raw/schemas',
  'data/research-templates',
  'logs',
  'temp'
];

console.log('Creating project directories...\n');

directories.forEach(dir => {
  const fullPath = path.join(projectRoot, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✓ Created: ${dir}`);
  } else {
    console.log(`✓ Exists: ${dir}`);
  }
});

console.log('\n✓ All directories ready!');