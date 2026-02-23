const axios = require('axios');

async function run() {
    const trpcUrl = 'https://layerzeroscan.com/api/trpc/messages.list';
    const dvnAddress = '0x373a6e5c0c4e89e24819f00aa37ea370917aaff4'; // Deutsche Telekom

    // Test Case 1: dvnAddress at root
    const input1 = {
        "0": {
            "json": {
                "network": "mainnet",
                "dvnAddress": dvnAddress,
                "limit": 5
            }
        }
    };

    // Test Case 2: filters object
    const input2 = {
        "0": {
            "json": {
                "network": "mainnet",
                "filters": {
                    "dvn": dvnAddress
                },
                "limit": 5
            }
        }
    };

    // Test Case 3: generic address
    const input3 = {
        "0": {
            "json": {
                "network": "mainnet",
                "address": dvnAddress,
                "limit": 5
            }
        }
    };

    try {
        console.log('--- Test 1: dvnAddress ---');
        const res1 = await axios.get(trpcUrl, {
            params: { batch: 1, input: JSON.stringify(input1) }
        });
        console.log('Status:', res1.status);
        console.log('Data length:', res1.data[0]?.result?.data?.json?.messages?.length || 0);
        // console.log(JSON.stringify(res1.data, null, 2));

        console.log('\n--- Test 2: filters.dvn ---');
        const res2 = await axios.get(trpcUrl, {
            params: { batch: 1, input: JSON.stringify(input2) }
        });
        console.log('Status:', res2.status);
        console.log('Data length:', res2.data[0]?.result?.data?.json?.messages?.length || 0);

        console.log('\n--- Test 3: address ---');
        const res3 = await axios.get(trpcUrl, {
            params: { batch: 1, input: JSON.stringify(input3) }
        });
        console.log('Status:', res3.status);
        console.log('Data length:', res3.data[0]?.result?.data?.json?.messages?.length || 0);

    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) console.error(JSON.stringify(e.response.data, null, 2));
    }
}

run();
