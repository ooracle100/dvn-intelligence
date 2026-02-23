// server/database/migrations/001_initial.js
// Migration script to initialize database schema

const { DVNDatabase } = require('../db');

console.log('🔄 Running database migration: 001_initial');
console.log('📍 Database path:', process.env.DATABASE_PATH || './data/dvn_intelligence.db');

try {
    const db = new DVNDatabase();
    db.initializeSchema();

    console.log('✅ Migration completed successfully');
    console.log('📊 Database ready for backfill');

    db.close();
    process.exit(0);
} catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
}
