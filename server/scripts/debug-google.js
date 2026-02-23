const axios = require('axios');

async function run() {
    const trpcUrl = 'https://layerzeroscan.com/api/trpc/messages.list';
    const dvnAddress = '0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc'; // Google Cloud

    const input1 = {
        "0": {
            "json": {
                "network": "mainnet",
                "dvnAddress": dvnAddress,
                "limit": 5
            }
        }
    };

    try {
        console.log('--- Test Google Cloud: dvnAddress ---');
        const res1 = await axios.get(trpcUrl, {
            params: { batch: 1, input: JSON.stringify(input1) }
        });
        console.log('Status:', res1.status);
        console.log('Data length:', res1.data[0]?.result?.data?.json?.messages?.length || 0);

    } catch (e) {
        console.error('Error:', e.message);
    }
}

run();
