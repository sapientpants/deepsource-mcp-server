#!/usr/bin/env node

/* eslint-disable no-console */

/**
 * Build script that injects the version from package.json into the compiled code
 * This ensures the version is available even when package.json is not accessible at runtime
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;

console.log(`Build script: Injecting version ${version} into compiled files...`);

// Function to recursively find all JavaScript files in dist
function findJsFiles(dir, files = []) {
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      findJsFiles(fullPath, files);
    } else if (item.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Path to dist directory
const distDir = join(__dirname, '..', 'dist');

try {
  // Find all JavaScript files in dist
  const jsFiles = findJsFiles(distDir);

  // Look for version.js specifically
  const versionFile = jsFiles.find((file) => file.endsWith('version.js'));

  if (versionFile) {
    // Read the file
    let content = readFileSync(versionFile, 'utf-8');

    // Replace the placeholder with the actual version
    const originalContent = content;
    content = content.replace(/__BUILD_VERSION__/g, version);

    // Only write if something changed
    if (content !== originalContent) {
      writeFileSync(versionFile, content, 'utf-8');
      console.log(`✓ Injected version ${version} into ${versionFile}`);
    } else {
      console.log(`✓ Version already set correctly in ${versionFile}`);
    }
  } else {
    console.warn('Warning: version.js not found in dist directory');
  }

  // Also update any other files that might reference __BUILD_VERSION__
  let filesUpdated = 0;
  for (const file of jsFiles) {
    if (file === versionFile) continue; // Already handled

    let content = readFileSync(file, 'utf-8');
    if (content.includes('__BUILD_VERSION__')) {
      content = content.replace(/__BUILD_VERSION__/g, version);
      writeFileSync(file, content, 'utf-8');
      filesUpdated++;
      console.log(`✓ Updated version in ${file}`);
    }
  }

  if (filesUpdated > 0) {
    console.log(`✓ Updated version in ${filesUpdated} additional file(s)`);
  }

  console.log('✓ Build version injection complete');
} catch (error) {
  console.error('Error during version injection:', error);
  process.exit(1);
}
