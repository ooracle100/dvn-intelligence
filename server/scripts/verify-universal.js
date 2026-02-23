const { BackfillService } = require('../services/backfill');

async function verifyUniversalFix() {
    console.log('🧪 Verifying Universal Fix with Google Cloud DVN...');

    const backfill = new BackfillService();
    // Override calculate time-range to just be very short (1 day) to test connectivity
    // backfill.backfillMonths is used in getTimeRange. 
    // We can just call backfillDVN and hope it fetches at least one page successfully.
    // Better: override getTimeRange in the instance if possible? 
    // No, let's just use the standard call but maybe kill it if it runs too long?
    // Actually, force: true will skip the completed check.

    try {
        // 'google-cloud' ID exists in dvns.txt. 
        // Note: The script will try to fetch ALL data for 6 months (default).
        // That might be too long for a quick test. 
        // Let's modify the instance's backfillMonths to 0 (or small fraction).
        // Since it's parsing int, 0 might fail. 
        // I'll monkey-patch getTimeRange for this test.

        backfill.getTimeRange = () => {
            const now = Date.now() / 1000;
            return { start: now - 86400, end: now }; // Last 24 hours
        };

        const result = await backfill.backfillDVN('google-cloud', { force: true });

        console.log('\n✅ Verification SUCCEEDED!');
        console.log(`   Processed: ${result.processed}`);
        console.log(`   Errors: ${result.errors}`);

    } catch (error) {
        console.error('\n❌ Verification FAILED:', error.message);
        process.exit(1);
    }
}

verifyUniversalFix();
