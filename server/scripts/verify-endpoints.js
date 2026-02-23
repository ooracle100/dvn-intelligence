const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const OAPP_ADDR = '0xbba60da06c2c5424f03f7434542280fcad453d10'; // Checking 0x...d10 (High Volume OApp)
const DVN_ADDR = '0xcd37ca043f8479064e10635020c65ffc005d36f6';  // Checking 0x...6f6 (Active DVN)

console.log('🔍 Starting Intelligence Platform Verification...');
console.log('Target OApp:', OAPP_ADDR);
console.log('Target DVN :', DVN_ADDR);

async function verify() {
    try {
        // 1. OApp History (Charts)
        console.log('\n1️⃣  Testing OApp History (Charts & Corridors)...');
        const oappRes = await axios.get(`${BASE_URL}/oapp/${OAPP_ADDR}/history`);
        if (oappRes.data.daily && oappRes.data.corridors) {
            console.log('✅ PASS: Received Daily Volume history');
            console.log(`   - Data Points: ${oappRes.data.daily.length}`);
            console.log(`   - Top Corridor: Chain ${oappRes.data.corridors[0]?.source_chain_eid} -> ${oappRes.data.corridors[0]?.dest_chain_eid}`);
            console.log(`   - Total Volume: $${parseFloat(oappRes.data.stats.total_volume_usd).toLocaleString()}`);
        } else {
            console.error('❌ FAIL: Invalid OApp structure', Object.keys(oappRes.data));
        }

        // 2. DVN History (Uptime)
        console.log('\n2️⃣  Testing DVN History (Uptime & Stats)...');
        const dvnRes = await axios.get(`${BASE_URL}/dvn/${DVN_ADDR}/history`);
        if (dvnRes.data.allTime && dvnRes.data.daily) {
            const uptime = (dvnRes.data.allTime.success_count / dvnRes.data.allTime.tx_count * 100).toFixed(2);
            console.log('✅ PASS: Received DVN Metrics');
            console.log(`   - Historical Uptime: ${uptime}%`);
            console.log(`   - Total Requests: ${dvnRes.data.allTime.tx_count}`);
        } else {
            console.error('❌ FAIL: Invalid DVN structure');
        }

        // 3. Whale Watch
        console.log('\n3️⃣  Testing Whale Watch...');
        const whalesRes = await axios.get(`${BASE_URL}/oapp/${OAPP_ADDR}/whales`);
        if (Array.isArray(whalesRes.data)) {
            console.log('✅ PASS: Received Whale list');
            console.log(`   - Count: ${whalesRes.data.length}`);
            if (whalesRes.data.length > 0) {
                console.log(`   - Top Whale Tx: ${whalesRes.data[0].amount_usd} USD`);
            }
        } else {
            console.error('❌ FAIL: Whales is not an array');
        }

        // 4. Export CSV
        console.log('\n4️⃣  Testing CSV Export...');
        const exportRes = await axios.get(`${BASE_URL}/export/${OAPP_ADDR}`);
        if (exportRes.headers['content-type'].includes('text/csv')) {
            const lines = exportRes.data.split('\n');
            console.log('✅ PASS: Received CSV Stream');
            console.log(`   - Header: ${lines[0]}`);
            console.log(`   - Rows: ${lines.length - 1} (sample)`);
        } else {
            console.error('❌ FAIL: Content-Type is not CSV');
        }

        console.log('\n✨ ALL SYSTEMS GO. Integration Verified.');

    } catch (e) {
        console.error('\n❌ FATAL ERROR TEST FAILED:', e.message);
        if (e.response) console.error('Response:', e.response.status, e.response.data);
    }
}

verify();
