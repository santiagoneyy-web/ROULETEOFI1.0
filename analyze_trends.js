require('dotenv').config();
const mongoose = require('mongoose');
const Spin = require('./models/Spin');
const agent5 = require('./agent5');

async function analyze() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    const spins = await Spin.find().sort({ id: 1 }).exec();
    console.log(`Found ${spins.length} total spins in database.`);

    const hourlyStats = {}; 
    for(let i=0; i<24; i++) hourlyStats[i] = { super_estable: 0, super_tendencia: 0, estable: 0, tendencia: 0, total_tiros: 0 };

    const tableSpins = {};
    for (const s of spins) {
        if (!tableSpins[s.table_id]) tableSpins[s.table_id] = [];
        tableSpins[s.table_id].push(s);
        
        let hour = -1;
        if(s.timestamp_str) {
            // parse hour, format varies (10:14:02 PM)
            try {
                // simple regex or date parse
                // if it's "10:14:02 p. m." or PM.
                // Or we can use the inner _id to get a UTC timestamp
                hour = s._id.getTimestamp().getHours(); // This gets the UTC hour! We subtract 5 for the user's timezone depending on setting => UTC-5 (Peru/Colombia/Ecuador/USA EST). Let's convert to local standard time (-5)
                hour = (hour - 5 + 24) % 24;
            } catch(e) {}
        }
        if (hour >= 0) {
            hourlyStats[hour].total_tiros++;
        }
    }

    for (const [tId, tSpins] of Object.entries(tableSpins)) {
        let cd = 0; // Cooldown anti spam per table
        
        for (let i = 5; i < tSpins.length; i++) {
            if (cd > 0) {
                cd--;
                continue;
            }

            // Window of 6 spins (gives 5 physics items). i is the end, so i-5 to i
            const window = tSpins.slice(Math.max(0, i - 5), i + 1);
            if(window.length < 6) continue;
            
            const physList = [];
            for (let j = 1; j < window.length; j++) {
                const prev = window[j-1].number;
                const curr = window[j].number;
                // mock physics locally instead of calling getPhysics directly if it fails, but agent5 works well.
                const p = agent5.getPhysics ? agent5.getPhysics(prev, curr) : null;
                if(p) physList.push({ dir: p.direction, dist: p.distance });
            }

            if(physList.length < 5) continue;
            
            const dirs = physList.map(p => p.dir);
            const zones = physList.map(p => p.dist);

            const last3Dirs = dirs.slice(-3);
            const last3Zones = zones.slice(-3);
            const strictDir = last3Dirs.every(d => d === last3Dirs[0] && d) ? last3Dirs[0] : null;
            const strictZone = last3Zones.every(z => z === last3Zones[0] && z) ? last3Zones[0] : null;

            const getTrend = (arr, minVal) => {
                const counts = {};
                arr.forEach(val => { if (val) counts[val] = (counts[val] || 0) + 1; });
                for (const [key, c] of Object.entries(counts)) {
                    if (c >= minVal) return key;
                }
                return null;
            };

            const trendDir = getTrend(dirs, 4);
            const trendZone = getTrend(zones, 4);

            const finalDir = strictDir || trendDir;
            const finalZone = strictZone || trendZone;

            if (finalDir || finalZone) {
                const isSuper = finalDir && finalZone;
                const isTendency = (!strictDir && trendDir) || (!strictZone && trendZone);
                
                let hour = tSpins[i]._id.getTimestamp().getHours();
                hour = (hour - 5 + 24) % 24; // Convert UTC to EST/PET/PE

                if (isSuper) {
                    if (isTendency) hourlyStats[hour].super_tendencia++;
                    else hourlyStats[hour].super_estable++;
                } else {
                    if (isTendency) hourlyStats[hour].tendencia++;
                    else hourlyStats[hour].estable++;
                }
                cd = 4;
            }
        }
    }
    
    console.log(JSON.stringify(hourlyStats, null, 2));
    mongoose.disconnect();
}
analyze().catch(console.error);
