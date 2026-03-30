const axios = require('axios');

async function testApi(url) {
    console.log(`Testing: ${url}`);
    try {
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Referer': 'https://www.casino.org/casinoscores/es/immersive-roulette/',
                'Origin': 'https://www.casino.org'
            }
        });
        console.log(`Status: ${res.status}`);
        console.log(`Data (first item):`, res.data[0] || res.data.content?.[0] || 'No data');
    } catch (err) {
        console.error(`Error: ${err.message}`);
        if (err.response) {
            console.error(`Response status: ${err.response.status}`);
            console.error(`Response data:`, JSON.stringify(err.response.data));
        }
    }
}

const BASE = 'https://api-cs.casino.org/svc-evolution-game-events/api';
// Try with size 20 (my code)
testApi(`${BASE}/immersiveroulette?page=0&size=20&sort=data.settledAt,desc&duration=6`);
// Try with size 10 (subagent found)
testApi(`${BASE}/immersiveroulette?page=0&size=10&sort=data.settledAt,desc&duration=6`);
// Try without duration
testApi(`${BASE}/immersiveroulette?page=0&size=10&sort=data.settledAt,desc`);
