// Test script to investigate API pagination and historical data access
const axios = require('axios');

async function testApiPagination() {
    const LZSCAN_API = 'https://scan.layerzero-api.com/v1';

    console.log('=== Testing LayerZero Scan API for Historical Data ===\n');

    // Test 1: Check latest messages endpoint
    console.log('1. Testing /messages/latest with different limits...');
    const limits = [100, 500, 1000, 5000];
    for (const limit of limits) {
        try {
            const res = await axios.get(`${LZSCAN_API}/messages/latest?limit=${limit}`, { timeout: 30000 });
            const messages = res.data?.data || [];
            const oldest = messages[messages.length - 1];
            const newest = messages[0];

            console.log(`   Limit ${limit}: Got ${messages.length} messages`);
            if (newest && oldest) {
                const newestTime = newest.source?.tx?.blockTimestamp || 0;
                const oldestTime = oldest.source?.tx?.blockTimestamp || 0;
                const newestDate = new Date(newestTime * 1000);
                const oldestDate = new Date(oldestTime * 1000);
                console.log(`   -> Latest: ${newestDate.toISOString()}`);
                console.log(`   -> Oldest: ${oldestDate.toISOString()}`);
                console.log(`   -> Time span: ${Math.round((newestTime - oldestTime) / 60)} minutes`);
            }
            console.log('');
        } catch (e) {
            console.log(`   Limit ${limit}: Error - ${e.message}`);
        }
    }

    // Test 2: Check if there's a cursor/offset parameter
    console.log('\n2. Testing cursor/offset pagination...');
    try {
        const res1 = await axios.get(`${LZSCAN_API}/messages/latest?limit=10`, { timeout: 30000 });
        const messages1 = res1.data?.data || [];
        const lastId = messages1[messages1.length - 1]?.guid;

        console.log(`   First batch: ${messages1.length} messages, last GUID: ${lastId}`);

        // Try offset
        const res2 = await axios.get(`${LZSCAN_API}/messages/latest?limit=10&offset=10`, { timeout: 30000 });
        const messages2 = res2.data?.data || [];
        console.log(`   With offset=10: ${messages2.length} messages`);

        // Try cursor
        const res3 = await axios.get(`${LZSCAN_API}/messages/latest?limit=10&cursor=${lastId}`, { timeout: 30000 });
        const messages3 = res3.data?.data || [];
        console.log(`   With cursor: ${messages3.length} messages`);

        // Check if any duplicates
        const guids1 = messages1.map(m => m.guid);
        const guids2 = messages2.map(m => m.guid);
        const overlap = guids1.filter(g => guids2.includes(g)).length;
        console.log(`   Overlap between batches: ${overlap}`);

    } catch (e) {
        console.log(`   Error: ${e.message}`);
    }

    // Test 3: Check for timestamp-based filtering
    console.log('\n3. Testing timestamp-based filters...');
    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 86400;
    const oneWeekAgo = now - 604800;

    const timeParams = [
        { name: 'from', url: `?limit=100&from=${oneDayAgo}` },
        { name: 'startTime', url: `?limit=100&startTime=${oneDayAgo}` },
        { name: 'since', url: `?limit=100&since=${oneDayAgo}` },
        { name: 'after', url: `?limit=100&after=${oneDayAgo}` },
    ];

    for (const param of timeParams) {
        try {
            const res = await axios.get(`${LZSCAN_API}/messages/latest${param.url}`, { timeout: 10000 });
            const messages = res.data?.data || [];
            console.log(`   ${param.name}: ${messages.length} messages`);
        } catch (e) {
            console.log(`   ${param.name}: Error`);
        }
    }

    // Test 4: Check response metadata for pagination hints
    console.log('\n4. Checking response metadata...');
    try {
        const res = await axios.get(`${LZSCAN_API}/messages/latest?limit=10`, { timeout: 30000 });
        console.log('   Response keys:', Object.keys(res.data));
        if (res.data.pagination) console.log('   Pagination:', res.data.pagination);
        if (res.data.meta) console.log('   Meta:', res.data.meta);
        if (res.data.nextCursor) console.log('   Next cursor:', res.data.nextCursor);
        if (res.data.hasMore) console.log('   Has more:', res.data.hasMore);
    } catch (e) {
        console.log(`   Error: ${e.message}`);
    }

    console.log('\n=== Done ===');
}

testApiPagination().catch(console.error);
