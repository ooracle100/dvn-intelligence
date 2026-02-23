// Test nextToken pagination to get historical data
const axios = require('axios');

async function testNextTokenPagination() {
    const LZSCAN_API = 'https://scan.layerzero-api.com/v1';

    console.log('=== Testing nextToken Pagination ===\n');

    let nextToken = null;
    let totalMessages = 0;
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;
    const pageLimit = 5; // Test 5 pages

    for (let page = 1; page <= pageLimit; page++) {
        try {
            const url = nextToken
                ? `${LZSCAN_API}/messages/latest?limit=1000&nextToken=${nextToken}`
                : `${LZSCAN_API}/messages/latest?limit=1000`;

            console.log(`Page ${page}: Fetching...`);
            const res = await axios.get(url, { timeout: 60000 });

            const messages = res.data?.data || [];
            nextToken = res.data?.nextToken;

            if (messages.length === 0) {
                console.log('   No more messages!');
                break;
            }

            totalMessages += messages.length;

            // Track time range
            messages.forEach(m => {
                const ts = m.source?.tx?.blockTimestamp || 0;
                if (ts > 0) {
                    oldestTimestamp = Math.min(oldestTimestamp, ts);
                    newestTimestamp = Math.max(newestTimestamp, ts);
                }
            });

            const oldestDate = new Date(oldestTimestamp * 1000);
            const newestDate = new Date(newestTimestamp * 1000);

            console.log(`   Got ${messages.length} messages (total: ${totalMessages})`);
            console.log(`   Time range: ${oldestDate.toISOString()} to ${newestDate.toISOString()}`);
            console.log(`   nextToken: ${nextToken ? nextToken.substring(0, 50) + '...' : 'NONE'}`);

            if (!nextToken) {
                console.log('   No more nextToken - end of data!');
                break;
            }

            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 500));

        } catch (e) {
            console.log(`   Error: ${e.message}`);
            break;
        }
    }

    console.log('\n=== Summary ===');
    console.log(`Total messages fetched: ${totalMessages}`);

    if (oldestTimestamp < Infinity) {
        const hoursSpan = (newestTimestamp - oldestTimestamp) / 3600;
        const daysSpan = hoursSpan / 24;
        console.log(`Time span: ${hoursSpan.toFixed(1)} hours (${daysSpan.toFixed(2)} days)`);
        console.log(`Oldest: ${new Date(oldestTimestamp * 1000).toISOString()}`);
        console.log(`Newest: ${new Date(newestTimestamp * 1000).toISOString()}`);

        // Estimate for 6 months
        const msgPerHour = totalMessages / hoursSpan;
        const hours6Months = 180 * 24;
        const estimated6MonthMsgs = msgPerHour * hours6Months;
        const pagesNeeded = estimated6MonthMsgs / 1000;
        console.log(`\nEstimate: ${Math.round(msgPerHour)} messages/hour`);
        console.log(`6 months would be ~${Math.round(estimated6MonthMsgs).toLocaleString()} messages`);
        console.log(`Requiring ~${Math.round(pagesNeeded).toLocaleString()} API calls`);
    }

    console.log('\n=== Done ===');
}

testNextTokenPagination().catch(console.error);
