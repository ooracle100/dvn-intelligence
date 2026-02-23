#!/usr/bin/env node
// server/scripts/run-backfill.js
// CLI script to run historical data backfill

require('dotenv').config();
const { BackfillService } = require('../services/backfill');

async function main() {
    const args = process.argv.slice(2);
    const service = new BackfillService();

    // Parse command line arguments
    const options = {
        dvn: null,
        days: null,
        force: false,
        all: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        // Handle --dvn=value format
        if (arg.startsWith('--dvn=')) {
            options.dvn = arg.split('=')[1];
        } else if (arg === '--dvn' && args[i + 1]) {
            options.dvn = args[i + 1];
            i++;
        }
        // Handle --days=value format
        else if (arg.startsWith('--days=')) {
            options.days = parseInt(arg.split('=')[1]);
            service.backfillMonths = options.days / 30;
        } else if (arg === '--days' && args[i + 1]) {
            options.days = parseInt(args[i + 1]);
            service.backfillMonths = options.days / 30;
            i++;
        }
        // Boolean flags
        else if (arg === '--force') {
            options.force = true;
        } else if (arg === '--all') {
            options.all = true;
        } else if (arg === '--help') {
            printHelp();
            process.exit(0);
        }
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('   DVN Intelligence - Historical Data Backfill');
    console.log('═══════════════════════════════════════════════\n');

    try {
        if (options.all) {
            // Backfill top 10 DVNs
            const topDVNs = service.getTopDVNs(10);
            console.log(`📋 Backfilling top ${topDVNs.length} DVNs:\n`);
            topDVNs.forEach((dvn, i) => console.log(`   ${i + 1}. ${dvn}`));

            const results = await service.backfillMultiple(topDVNs);

            console.log('\n\n═══════════════════════════════════════════════');
            console.log('   Backfill Summary');
            console.log('═══════════════════════════════════════════════\n');

            results.forEach(result => {
                if (result.error) {
                    console.log(`❌ ${result.dvn}: ${result.error}`);
                } else {
                    console.log(`✅ ${result.dvn}: ${result.processed} transactions`);
                }
            });

        } else if (options.dvn) {
            // Backfill single DVN
            const result = await service.backfillDVN(options.dvn, { force: options.force });
            console.log('\n\n✅ Backfill completed successfully');

        } else {
            console.error('❌ Error: Please specify --dvn=<dvn-id> or --all\n');
            printHelp();
            process.exit(1);
        }

        console.log('\n✨ All done!\n');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Backfill failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

function printHelp() {
    console.log(`
Usage: node server/scripts/run-backfill.js [options]

Options:
  --dvn=<dvn-id>     Backfill specific DVN (e.g., --dvn=deutsche-telekom)
  --all              Backfill top 10 DVNs
  --days=<number>    Number of days to backfill (default: 180)
  --force            Re-run backfill even if already completed
  --help             Show this help message

Examples:
  # Backfill Deutsche Telekom for last 7 days (test)
  node server/scripts/run-backfill.js --dvn=deutsche-telekom --days=7
  
  # Backfill all top DVNs for 6 months
  node server/scripts/run-backfill.js --all
  
  # Force re-backfill for Google Cloud
  node server/scripts/run-backfill.js --dvn=google-cloud --force
`);
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main };
