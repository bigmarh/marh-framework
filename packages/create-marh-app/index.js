#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);
  
  // Check for help flags
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  const projectName = args.find(arg => !arg.startsWith('--'));
  const templateFlag = args.find(arg => arg.startsWith('--template='));
  
  let template = 'pwa'; // default template
  if (templateFlag) {
    template = templateFlag.split('=')[1];
  }
  
  return { projectName, template };
}

function showHelp() {
  console.log(`
create-marh-app - Create MARH applications with zero configuration

Usage:
  create-marh-app <project-name> [options]

Options:
  --template=<template>  Choose template: desktop or pwa (default: pwa)
  --help, -h            Show this help message

Templates:
  pwa       Progressive Web App with service worker and offline support
  desktop   Electron desktop application with native OS integration

Examples:
  create-marh-app my-app
  create-marh-app my-pwa-app --template=pwa
  create-marh-app my-desktop-app --template=desktop

For more information, visit: https://github.com/yourusername/marh-framework
  `);
}

async function copySharedFiles(sharedPath, projectPath) {
  const sharedFiles = await fs.readdir(sharedPath);
  
  for (const file of sharedFiles) {
    const srcPath = path.join(sharedPath, file);
    const destPath = path.join(projectPath, file);
    
    if (file === 'src') {
      // For src folder, merge with existing
      await fs.ensureDir(destPath);
      const srcContents = await fs.readdir(srcPath);
      for (const srcFile of srcContents) {
        const srcFilePath = path.join(srcPath, srcFile);
        const destFilePath = path.join(destPath, srcFile);
        await fs.copy(srcFilePath, destFilePath, { overwrite: false });
      }
    } else {
      // For other files, copy directly
      await fs.copy(srcPath, destPath, { overwrite: false });
    }
  }
}

async function replaceTemplateVariables(projectPath, projectName) {
  const filesToUpdate = [
    'package.json',
    'vite.config.ts',
    'public/manifest.json'
  ];
  
  for (const file of filesToUpdate) {
    const filePath = path.join(projectPath, file);
    if (await fs.pathExists(filePath)) {
      let content = await fs.readFile(filePath, 'utf8');
      content = content.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
      await fs.writeFile(filePath, content);
    }
  }
}

async function main() {
  const { projectName, template } = parseArgs();
  
  if (!projectName) {
    console.error('Please provide a project name:');
    console.error('  create-marh-app my-app [--template=desktop|pwa]');
    console.error('');
    console.error('Examples:');
    console.error('  create-marh-app my-desktop-app --template=desktop');
    console.error('  create-marh-app my-pwa-app --template=pwa');
    process.exit(1);
  }
  
  if (!['desktop', 'pwa'].includes(template)) {
    console.error(`Error: Invalid template "${template}". Must be "desktop" or "pwa"`);
    process.exit(1);
  }
  
  const projectPath = path.resolve(projectName);
  const templatePath = path.join(__dirname, 'templates', template);
  const sharedPath = path.join(__dirname, 'templates', 'shared');
  
  // Check if directory already exists
  if (fs.existsSync(projectPath)) {
    console.error(`Error: Directory ${projectName} already exists`);
    process.exit(1);
  }
  
  // Check if template exists
  if (!fs.existsSync(templatePath)) {
    console.error(`Error: Template "${template}" not found`);
    process.exit(1);
  }
  
  console.log(`Creating a new MARH ${template} app in ${projectPath}...`);
  
  // Copy template-specific files
  await fs.copy(templatePath, projectPath);
  
  // Copy shared files
  if (fs.existsSync(sharedPath)) {
    await copySharedFiles(sharedPath, projectPath);
  }
  
  // Replace template variables
  await replaceTemplateVariables(projectPath, projectName);
  
  console.log('\nSuccess! Created', projectName, 'at', projectPath);
  console.log('\nTemplate used:', template);
  console.log('\nNext steps:');
  console.log(`  cd ${projectName}`);
  console.log('  npm install');
  console.log('  npm run dev');
  
  if (template === 'pwa') {
    console.log('\nPWA features:');
    console.log('  - Service worker for offline support');
    console.log('  - Web app manifest for installation');
    console.log('  - Optimized for mobile and desktop browsers');
  } else {
    console.log('\nDesktop features:');
    console.log('  - Electron for native desktop app');
    console.log('  - IPC communication between main and renderer');
    console.log('  - Native OS integration');
  }
  
  console.log('\nHappy coding!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});