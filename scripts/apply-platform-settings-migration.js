/**
 * Helper script to apply Platform Settings migration
 * Run: node scripts/apply-platform-settings-migration.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('🔄 Applying Platform Settings migration...\n');

  try {
    // Check if tables already exist
    const existingSettings = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'platformSettings'
      );
    `;

    if (existingSettings[0].exists) {
      console.log('✅ Platform Settings tables already exist');
      console.log('✅ Migration already applied\n');
      return;
    }

    // Read migration file
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const migrationPath = path.join(__dirname, '../prisma/migrations/20260112211133_add_platform_settings/migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await prisma.$executeRawUnsafe(statement);
          console.log('✅ Executed:', statement.substring(0, 50) + '...');
        } catch (error) {
          // Ignore "already exists" errors
          if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            console.log('⚠️  Skipped (already exists):', statement.substring(0, 50) + '...');
          } else {
            throw error;
          }
        }
      }
    }

    console.log('\n✅ Migration applied successfully!\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
