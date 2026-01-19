/**
 * Apply Platform Settings Migration
 * Esegue ogni statement SQL separatamente
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('🔄 Applicando migrazione Platform Settings...\n');

  try {
    // Verifica se le tabelle esistono già
    const existing = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('platformSettings', 'platformSettingsHistories')
    `;

    if (existing.length === 2) {
      console.log('✅ Tabelle già esistenti');
      const settings = await prisma.platformSettings.findFirst();
      console.log('✅ Settings:', settings ? `Esistenti (ID: ${settings.id})` : 'Da inizializzare');
      return;
    }

    // Leggi il file di migrazione
    const migrationPath = path.join(__dirname, '../prisma/migrations/20260112211133_add_platform_settings/migration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Dividi in statement (per punto e virgola, escludendo commenti)
    // Rimuovi commenti prima di dividere
    const cleanSql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && s.length > 20 && !s.startsWith('--'));

    console.log(`📝 Eseguendo ${statements.length} statement SQL...\n`);

    // Esegui ogni statement separatamente
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await prisma.$executeRawUnsafe(statement);
        const preview = statement.substring(0, 50).replace(/\n/g, ' ');
        console.log(`✅ [${i + 1}/${statements.length}] ${preview}...`);
      } catch (error) {
        // Ignora errori "already exists" o "duplicate"
        if (
          error.message.includes('already exists') ||
          error.message.includes('duplicate') ||
          error.message.includes('relation') ||
          error.message.includes('constraint')
        ) {
          console.log(`⚠️  [${i + 1}/${statements.length}] Saltato (già esistente)`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ Migrazione completata\n');

    // Verifica che le tabelle siano state create
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('platformSettings', 'platformSettingsHistories')
    `;

    if (tables.length === 2) {
      console.log('✅ Tabelle create con successo:', tables.map(t => t.table_name).join(', '));
    } else {
      console.log('⚠️  Tabelle create parzialmente:', tables.map(t => t.table_name).join(', '));
    }

    // Verifica accesso al modello
    const settings = await prisma.platformSettings.findFirst();
    console.log('✅ Accesso al modello:', settings ? `OK (ID: ${settings.id})` : 'OK (da inizializzare)');

  } catch (error) {
    console.error('\n❌ Errore durante la migrazione:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
