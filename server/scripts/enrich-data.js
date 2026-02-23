// server/scripts/enrich-data.js
// Reads raw payloads from DB, decodes amounts, and updates the records

require('dotenv').config();
const { getDatabase } = require('../database/db');
const { decodePayload } = require('../services/payloadDecoder');

const BATCH_SIZE = 1000;

async function enrichData() {
    console.log('💎 Starting Data Enrichment...');

    const db = getDatabase();

    // Get total count of potentially enrichable transactions
    const total = db.db.prepare('SELECT COUNT(*) as count FROM transactions WHERE amount_tokens IS NULL AND payload IS NOT NULL').get().count;
    console.log(`   Found ${total.toLocaleString()} transactions ready to enrich (with payload)`);

    let processed = 0;
    let updated = 0;

    // Select transactions that have payload but no amount yet
    const query = db.db.prepare(`
        SELECT tx_hash, payload, oapp_address 
        FROM transactions 
        WHERE amount_tokens IS NULL 
        AND payload IS NOT NULL
        LIMIT ?
    `);

    const updateStmt = db.db.prepare(`
        UPDATE transactions 
        SET amount_tokens = ? 
        WHERE tx_hash = ?
    `);

    const updateTransaction = db.db.transaction((updates) => {
        for (const update of updates) {
            updateStmt.run(update.amount, update.txHash);
        }
    });

    while (true) {
        const batch = query.all(BATCH_SIZE);

        if (batch.length === 0) {
            console.log('\n✓ No more enrichable transactions found');
            break;
        }

        const updates = [];
        for (const tx of batch) {
            processed++;
            const amount = decodePayload(tx.payload, tx.oapp_address);

            if (amount) {
                updates.push({ txHash: tx.tx_hash, amount });
                updated++;
            } else {
                // If decode fails, we could mark it as 'failed' to avoid re-querying
                // But for now we just skip. Infinite loop risk if we query WHERE amount_tokens IS NULL
                // WE MUST MARK IT. Set amount_tokens to '0' or special string 'UNKNOWN'
                updates.push({ txHash: tx.tx_hash, amount: 'UNKNOWN' });
            }
        }

        if (updates.length > 0) {
            updateTransaction(updates);
        }

        if (processed % 10000 === 0) {
            console.log(`   Processed: ${processed.toLocaleString()} | Updated: ${updated.toLocaleString()}`);
        }
    }

    console.log(`\n✨ Enrichment Complete`);
    console.log(`   Processed: ${processed.toLocaleString()}`);
    console.log(`   Updated: ${updated.toLocaleString()}`);

    // Check missing payloads
    const missing = db.db.prepare('SELECT COUNT(*) as count FROM transactions WHERE payload IS NULL').get().count;
    if (missing > 0) {
        console.log(`\n⚠️  ${missing.toLocaleString()} transactions are missing payload data (cannot enrich)`);
    }

    db.close();
}

enrichData().catch(console.error);
