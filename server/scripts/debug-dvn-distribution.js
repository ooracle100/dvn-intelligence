// Debug script to analyze DVN distribution in latest messages
const axios = require('axios');

async function run() {
    const url = 'https://scan.layerzero-api.com/v1/messages/latest?limit=1000';
    console.log('Fetching latest 1000 messages...');

    const res = await axios.get(url);
    const messages = res.data?.data || [];

    console.log(`Total messages: ${messages.length}`);

    // Count DVN occurrences
    const dvnCounts = {};

    messages.forEach(msg => {
        const config = msg.config?.outboundConfig || msg.config || {};
        const required = config.requiredDVNs || [];
        const optional = config.optionalDVNs || [];
        const requiredNames = config.requiredDVNNames || [];
        const optionalNames = config.optionalDVNNames || [];

        required.forEach((addr, i) => {
            const key = `${requiredNames[i] || 'Unknown'} (${addr})`;
            if (!dvnCounts[key]) dvnCounts[key] = { required: 0, optional: 0 };
            dvnCounts[key].required++;
        });

        optional.forEach((addr, i) => {
            const key = `${optionalNames[i] || 'Unknown'} (${addr})`;
            if (!dvnCounts[key]) dvnCounts[key] = { required: 0, optional: 0 };
            dvnCounts[key].optional++;
        });
    });

    // Sort by total count
    const sorted = Object.entries(dvnCounts)
        .map(([name, counts]) => ({ name, ...counts, total: counts.required + counts.optional }))
        .sort((a, b) => b.total - a.total);

    console.log('\n📊 Top DVNs in latest 1000 messages:\n');
    console.log('DVN Name (Address) | Required | Optional | Total');
    console.log('-'.repeat(80));

    sorted.slice(0, 20).forEach(dvn => {
        console.log(`${dvn.name.substring(0, 50).padEnd(50)} | ${String(dvn.required).padStart(8)} | ${String(dvn.optional).padStart(8)} | ${String(dvn.total).padStart(5)}`);
    });

    // Check for Deutsche Telekom specifically
    const dtAddress = '0x373a6e5c0c4e89e24819f00aa37ea370917aaff4'.toLowerCase();
    console.log('\n\n🔍 Searching for Deutsche Telekom address...');

    const dtEntry = sorted.find(d => d.name.toLowerCase().includes(dtAddress));
    if (dtEntry) {
        console.log('Found:', dtEntry);
    } else {
        console.log('NOT FOUND in top DVNs. Checking raw data...');

        let found = 0;
        messages.forEach(msg => {
            const config = msg.config?.outboundConfig || msg.config || {};
            const required = (config.requiredDVNs || []).map(a => a.toLowerCase());
            const optional = (config.optionalDVNs || []).map(a => a.toLowerCase());
            if (required.includes(dtAddress) || optional.includes(dtAddress)) {
                found++;
            }
        });
        console.log(`Found ${found} messages with Deutsche Telekom DVN`);
    }
}

run().catch(console.error);
