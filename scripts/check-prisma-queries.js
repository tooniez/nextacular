#!/usr/bin/env node
/**
 * Script to check for Prisma query errors
 * Scans all API routes and services for potential Prisma query issues
 */

const fs = require('fs');
const path = require('path');

// Models that DON'T have deletedAt field
const MODELS_WITHOUT_DELETEDAT = [
  'Connector',
  'Account',
  'Session',
  'VerificationToken',
  'CustomerPayment',
  'SubscriptionPlan',
  'OcppMessage',
];

// Models that HAVE deletedAt field
const MODELS_WITH_DELETEDAT = [
  'User',
  'Workspace',
  'Member',
  'Domain',
  'EndUser',
  'PaymentProfile',
  'ChargingStation',
  'TariffProfile',
  'TariffAssignment',
  'ChargingSession',
  'OrganizationSubscription',
  'PayoutStatement',
  'PayoutLineItem',
  'PlatformSettings',
  'PlatformSettingsHistory',
  'OpsAlert',
  'OpsEvent',
  'OpsIncident',
  'OpsKillSwitch',
  'WorkspaceFeePolicyHistory',
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const errors = [];

  MODELS_WITHOUT_DELETEDAT.forEach((model) => {
    const modelLower = model.toLowerCase();
    const regex = new RegExp(`prisma\\.${modelLower}\\.(findMany|findFirst|findUnique).*deletedAt`, 's');
    
    if (regex.test(content)) {
      errors.push({
        file: filePath,
        model,
        issue: `Model ${model} does not have deletedAt field but it's used in query`,
      });
    }
  });

  return errors;
}

function scanDirectory(dir) {
  const errors = [];
  
  function walk(currentPath) {
    const entries = fs.readSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory() && !entry.name.includes('node_modules') && !entry.name.includes('.next')) {
        walk(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
        const fileErrors = scanFile(fullPath);
        errors.push(...fileErrors);
      }
    }
  }

  try {
    walk(dir);
  } catch (error) {
    console.error(`Error scanning ${dir}:`, error.message);
  }

  return errors;
}

// Scan API routes and services
const apiDir = path.join(__dirname, '..', 'src', 'pages', 'api');
const servicesDir = path.join(__dirname, '..', 'prisma', 'services');

const allErrors = [
  ...scanDirectory(apiDir),
  ...scanDirectory(servicesDir),
];

if (allErrors.length > 0) {
  console.error('❌ Found Prisma query errors:');
  allErrors.forEach((error) => {
    console.error(`  - ${error.file}: ${error.issue}`);
  });
  process.exit(1);
} else {
  console.log('✅ No Prisma query errors found');
  process.exit(0);
}
