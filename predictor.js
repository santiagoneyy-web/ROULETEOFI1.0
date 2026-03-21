// ============================================================
// predictor.js — Advanced Pattern Recognition & Trend Analysis
// ============================================================

const WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];
const WHEEL_INDEX = {};
WHEEL_ORDER.forEach((n, i) => { WHEEL_INDEX[n] = i; });

// User Terminal Correlation Chart
const TERMINALS_MAP = {
    0:  [4, 6],         1:  [8],            2:  [7, 9],         3:  [8], 
    4:  [11],           5:  [12, 10],       6:  [11],           7:  [14, 2], 
    8:  [15, 13, 3, 1], 9:  [14, 2],        10: [17, 5],        11: [18, 16, 6, 4], 
    12: [17, 5],        13: [20, 23],       14: [9, 21, 7, 19], 15: [8, 20], 
    16: [11],           17: [12, 24, 10, 22],18: [11, 23],      19: [14, 26], 
    20: [13, 25, 15, 27],21: [14, 26],      22: [17, 29],       23: [18, 30, 16, 28], 
    24: [17, 29],       25: [20, 32],       26: [19, 31, 33, 21],27: [20, 32], 
    28: [23, 35],       29: [22, 34, 24, 36],30: [23, 35],      31: [26], 
    32: [25, 27],       33: [26],           34: [29],           35: [28, 30], 
    36: [29]
};

const STRATEGIES = [
    { strategy: '-',     betZone: [1, 2, 4, 5, 6, 10, 11, 13, 14, 15, 16, 23, 24, 25, 27, 30, 33, 36] },
    { strategy: '+',     betZone: [0, 2, 3, 4, 7, 8, 10, 12, 13, 15, 17, 18, 21, 22, 25, 26, 28, 29, 31, 32, 35] },
    { strategy: '-,-1',  betZone: [1, 5, 8, 10, 11, 13, 16, 23, 24, 27, 30, 33, 36] },
    { strategy: '-,+1',  betZone: [1, 2, 4, 6, 13, 14, 15, 16, 24, 25, 33, 36] },
    { strategy: '+,-1',  betZone: [0, 2, 3, 4, 7, 12, 15, 17, 18, 21, 25, 26, 28, 32, 35] },
    { strategy: '+,+1',  betZone: [0, 3, 7, 8, 10, 12, 13, 18, 21, 22, 26, 28, 29, 31, 32, 35] }
];

function getDistance(a, b) {
    const iA = WHEEL_INDEX[a], iB = WHEEL_INDEX[b];
    let d = iB - iA;
    if (d > 18) d -= 37;
    if (d < -18) d += 37;
    return d;
}

function analyzeSpin(history, stats) {
    if (history.length < 3) return [];
    const last = history[history.length - 1];
    const prev = history[history.length - 2];
    const prev2 = history[history.length - 3];
    
    const results = [];
    STRATEGIES.forEach(s => {
        const key = s.strategy;
        if (!stats[key]) stats[key] = { wins: 0, losses: 0, attempts: 0, outcomes: [] };
        
        const win = s.betZone.includes(last);
        stats[key].attempts++;
        if (win) stats[key].wins++; else stats[key].losses++;
        stats[key].outcomes.push(win);
        if (stats[key].outcomes.length > 20) stats[key].outcomes.shift();
        
        results.push({ strategy: key, win, wins: stats[key].wins, losses: stats[key].losses, attempts: stats[key].attempts, outcomes: stats[key].outcomes, betZone: s.betZone });
    });
    return results;
}

function projectNextRound(history, stats) {
    if (history.length < 2) return [];
    return STRATEGIES.map(s => {
        const key = s.strategy;
        const st = stats[key] || { wins: 0, losses: 0, attempts: 0, outcomes: [] };
        const hitRate = st.attempts > 0 ? (st.wins / st.attempts) * 100 : 0;
        
        let streakWin = 0, streakLoss = 0;
        for (let i = st.outcomes.length - 1; i >= 0; i--) {
            if (st.outcomes[i]) { if (streakLoss > 0) break; streakWin++; }
            else { if (streakWin > 0) break; streakLoss++; }
        }
        
        return { strategy: key, hitRate, streakWin, streakLoss, tp: s.betZone[0], cor: s.betZone.slice(1, 5), betZone: s.betZone, rule: 'MOMENTUM', targetPattern: 'neutral' };
    });
}

function computeDealerSignature(history) {
    if (history.length < 2) return { directionState: 'measuring', recommendedPlay: 'NONE', avgTravel: null };
    const travels = [];
    for (let i = 1; i < history.length; i++) travels.push(getDistance(history[i-1], history[i]));
    
    const lastT = travels[travels.length - 1];
    const state = Math.abs(lastT) <= 9 ? 'stable' : 'chaos';
    const rec = lastT > 0 ? 'BIG' : 'SMALL';
    
    return { 
        directionState: state, 
        recommendedPlay: rec, 
        avgTravel: lastT, 
        travelHistory: travels,
        casilla5: WHEEL_ORDER[(WHEEL_INDEX[history[history.length-1]] + 5) % 37],
        casilla14: WHEEL_ORDER[(WHEEL_INDEX[history[history.length-1]] + 14) % 37],
        casillaNeg5: WHEEL_ORDER[(WHEEL_INDEX[history[history.length-1]] - 5 + 37) % 37],
        casillaNeg14: WHEEL_ORDER[(WHEEL_INDEX[history[history.length-1]] - 14 + 37) % 37],
        casilla1: WHEEL_ORDER[(WHEEL_INDEX[history[history.length-1]] + 1) % 37],
        casilla19: WHEEL_ORDER[(WHEEL_INDEX[history[history.length-1]] + 19) % 37],
        casilla10: WHEEL_ORDER[(WHEEL_INDEX[history[history.length-1]] + 10) % 37]
    };
}

function getWheelNeighbors(num, radius) {
    const idx = WHEEL_INDEX[num];
    if (idx === undefined) return [num];
    const neighbors = [];
    for (let i = -radius; i <= radius; i++) {
        let nIdx = (idx + i + 37) % 37;
        neighbors.push(WHEEL_ORDER[nIdx]);
    }
    return neighbors;
}

function getSixStrategieSignals(lastNum) {
    if (lastNum === undefined || lastNum === null) return [];
    
    // Dynamic offset based on the Terminal (Last Digit) of the number
    const t = lastNum % 10;
    
    const strategies = [
        { name: '+',     tp: (lastNum + t + 37) % 37 },
        { name: '-',     tp: (lastNum - t + 37) % 37 },
        { name: '-,+1',  tp: (lastNum - t + 1 + 37) % 37 },
        { name: '-,-1',  tp: (lastNum - t - 1 + 37) % 37 },
        { name: '+,+1',  tp: (lastNum + t + 1 + 37) % 37 },
        { name: '+,-1',  tp: (lastNum + t - 1 + 37) % 37 }
    ];

    return strategies.map(s => {
        let tp = s.tp;
        const cors = TERMINALS_MAP[tp] || [];
        
        // Neighbor Logic: 1 COR -> N3/N3 | 2 COR -> N2/N3 | 3+ COR -> N2/N2
        let tpN = 3, corN = 3;
        if (cors.length === 2) { tpN = 2; corN = 3; }
        else if (cors.length >= 3) { tpN = 2; corN = 2; }

        let betZone = [...getWheelNeighbors(tp, tpN)];
        cors.forEach(c => {
            const cNeighbors = getWheelNeighbors(c, corN);
            betZone = [...new Set([...betZone, ...cNeighbors])];
        });

        return { 
            strategy: s.name, 
            tp, 
            cors, 
            betZone,
            rule: 'SIX STRATEGIE',
            reason: `TP:${tp} COR:${cors.join(',')}`
        };
    });
}

// ============================================================
// PATTERN ANALYSIS ENGINE — Zone & Direction Learning
// ============================================================

function buildZoneSequence(history) {
    // Convert history into B/S array using actual wheel distances
    const seq = [];
    for (let i = 1; i < history.length; i++) {
        const dist = Math.abs(getDistance(history[i-1], history[i]));
        seq.push(dist >= 10 ? 'B' : 'S');
    }
    return seq;
}

function buildDirSequence(history) {
    // Convert history into D/I array using wheel direction
    const seq = [];
    for (let i = 1; i < history.length; i++) {
        const dist = getDistance(history[i-1], history[i]);
        seq.push(dist >= 0 ? 'D' : 'I');
    }
    return seq;
}

function getRunLengths(seq) {
    // Groups a sequence into {type, length} runs. e.g. SSSBBSB → [{S,3},{B,2},{S,1},{B,1}]
    if (seq.length === 0) return [];
    const runs = [];
    let current = seq[0], count = 1;
    for (let i = 1; i < seq.length; i++) {
        if (seq[i] === current) count++;
        else { runs.push({ type: current, length: count }); current = seq[i]; count = 1; }
    }
    runs.push({ type: current, length: count });
    return runs;
}

function getDominant(seq, windowSize = 20) {
    // Returns the dominant type in the recent window
    if (seq.length === 0) return null;
    const recent = seq.slice(-Math.min(windowSize, seq.length));
    const tally = {};
    recent.forEach(v => { tally[v] = (tally[v] || 0) + 1; });
    return Object.keys(tally).reduce((a, b) => tally[a] >= tally[b] ? a : b);
}

function detectFalseBreak(runs, dominantType) {
    // A "false break" is when the last run is the OPPOSITE type,
    // but so short that it's clearly noise (< 30% of avg dominant run length)
    if (runs.length < 2) return false;
    const lastRun = runs[runs.length - 1];
    if (lastRun.type === dominantType) return false; // Last run IS dominant → no false break
    const dominantRuns = runs.filter(r => r.type === dominantType);
    if (dominantRuns.length === 0) return false;
    const avgDominantLen = dominantRuns.reduce((a, r) => a + r.length, 0) / dominantRuns.length;
    return lastRun.length < avgDominantLen * 0.30;
}

function detectStreakShrinkage(runs, dominantType) {
    // Checks if the last 3 dominant runs are getting progressively SHORTER → real zone transition
    const dominantRuns = runs.filter(r => r.type === dominantType);
    if (dominantRuns.length < 3) return false;
    const last3 = dominantRuns.slice(-3);
    return last3[0].length > last3[1].length && last3[1].length > last3[2].length;
}

function detectTrueZigZag(seq) {
    // 5+ consecutive alternations at the tail of the sequence → genuine ZigZag
    if (seq.length < 5) return false;
    const recent = seq.slice(-8);
    let alternations = 0;
    for (let i = 1; i < recent.length; i++) {
        if (recent[i] !== recent[i-1]) alternations++;
        else break;
    }
    return alternations >= 5;
}

function detectRhythm(runs, dominantType) {
    // Detects regular intervals between non-dominant intrusions → cyclic table behavior
    const positions = [];
    let pos = 0;
    for (const run of runs) {
        if (run.type !== dominantType) positions.push(pos);
        pos += run.length;
    }
    if (positions.length < 3) return null;
    const intervals = [];
    for (let i = 1; i < positions.length; i++) intervals.push(positions[i] - positions[i-1]);
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const stdDev = Math.sqrt(intervals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / intervals.length);
    // Low stdDev relative to avg means regular rhythm
    return stdDev < avg * 0.30 ? Math.round(avg) : null;
}

function analyzeTableState(history) {
    const empty = { zoneSeq:[], dirSeq:[], dominantZone:'S', dominantDir:'D',
                    isFalseBreak:false, isZoneTransition:false,
                    isDirZigZag:false, isZoneZigZag:false, rhythm:null };
    if (history.length < 5) return empty;

    const zoneSeq = buildZoneSequence(history);
    const dirSeq  = buildDirSequence(history);
    const zoneRuns = getRunLengths(zoneSeq);
    const dirRuns  = getRunLengths(dirSeq);

    const dominantZone = getDominant(zoneSeq) || 'S';
    const dominantDir  = getDominant(dirSeq)  || 'D';

    const isFalseBreak      = detectFalseBreak(zoneRuns, dominantZone);
    const isZoneTransition  = detectStreakShrinkage(zoneRuns, dominantZone);
    const isDirZigZag       = detectTrueZigZag(dirSeq);
    const isZoneZigZag      = detectTrueZigZag(zoneSeq);
    const rhythm            = detectRhythm(zoneRuns, dominantZone);

    return { zoneSeq, dirSeq, zoneRuns, dirRuns,
             dominantZone, dominantDir,
             isFalseBreak, isZoneTransition,
             isDirZigZag, isZoneZigZag, rhythm };
}

// ============================================================
// MASTER SIGNAL ENGINE — Soporte & Híbrido Theory
// ============================================================

function getIAMasterSignals(prox, sig, history) {
    if (!sig || history.length === 0) return [];
    const lastNum = history[history.length - 1];
    const lastNumIdx = WHEEL_INDEX[lastNum] || 0;
    const signals = [];

    // ── READ TABLE STATE FROM DATABASE PATTERNS ────────────────
    const state = analyzeTableState(history);

    // ── AGENT 1: Android n16 (Six Strategie) ──────────────────
    const ssOutcomes = getSixStrategieSignals(lastNum);
    let bestSS = ssOutcomes[0], maxHits = -1;
    ssOutcomes.forEach(strategy => {
        let hits = 0;
        for (let i = Math.max(0, history.length - 10); i < history.length - 1; i++) {
            const hNum = history[i], nextHNum = history[i+1];
            const t = hNum % 10;
            let predBase = 0;
            if (strategy.name === '+') predBase = hNum + t;
            else if (strategy.name === '-') predBase = hNum - t;
            else if (strategy.name === '-,+1') predBase = hNum - t + 1;
            else if (strategy.name === '-,-1') predBase = hNum - t - 1;
            else if (strategy.name === '+,+1') predBase = hNum + t + 1;
            else if (strategy.name === '+,-1') predBase = hNum + t - 1;
            const predTP = ((predBase % 37) + 37) % 37;
            const predCors = TERMINALS_MAP[predTP] || [];
            const tpRad = 2, corRad = predCors.length === 1 ? 3 : (predCors.length === 2 ? 3 : 2);
            const isHit = getWheelNeighbors(predTP, tpRad).includes(nextHNum) ||
                          predCors.some(c => getWheelNeighbors(c, corRad).includes(nextHNum));
            if (isHit) hits++;
        }
        if (hits > maxHits) { maxHits = hits; bestSS = strategy; }
    });
    signals.push({
        name: 'Android n16', tp: bestSS.tp, cor: bestSS.cors,
        betZone: bestSS.betZone, number: bestSS.tp, confidence: "94%",
        reason: `${bestSS.name} (Hits: ${maxHits}/10)`, rule: 'SIX STRATEGIE',
        mode: 'ZONAS', radius: "N2/N3"
    });

    // ── AGENT 2: Android N17 — ZONE READER (Soporte C1/C19) ──
    let target17, reason17, mode17;
    if (state.isZoneTransition) {
        // Zone is ACTIVELY SHRINKING → anticipate the flip and pre-position on NEW zone
        const newZone = state.dominantZone === 'B' ? 'S' : 'B';
        target17 = newZone === 'B' ? sig.casilla19 : sig.casilla1;
        reason17 = `TRANSICIÓN ${state.dominantZone}→${newZone}: SOPORTE NUEVO`;
        mode17   = newZone === 'B' ? 'SOPORTE BIG' : 'SOPORTE SMALL';
    } else if (state.isFalseBreak) {
        // False break detected → stay in current dominant zone, don't react
        target17 = state.dominantZone === 'B' ? sig.casilla19 : sig.casilla1;
        reason17 = `FALSA RUPTURA IGNORADA → ZONA ${state.dominantZone}`;
        mode17   = state.dominantZone === 'B' ? 'SOPORTE BIG' : 'SOPORTE SMALL';
    } else {
        // Normal soporte: match dominant zone
        target17 = state.dominantZone === 'B' ? sig.casilla19 : sig.casilla1;
        reason17 = state.dominantZone === 'B' ? 'ZONA BIG → SOPORTE C19' : 'ZONA SMALL → SOPORTE C1';
        mode17   = state.dominantZone === 'B' ? 'SOPORTE BIG' : 'SOPORTE SMALL';
    }
    signals.push({
        name: 'Android n17', number: target17, confidence: "88%",
        reason: reason17, rule: "SOPORTE ZONA", mode: mode17,
        betZone: getWheelNeighbors(target17, 9), radius: "N9"
    });

    // ── AGENT 3: Android 1717 — DIRECTION READER (Híbrido C±10) ──
    let target1717, reason1717, mode1717;
    if (state.isDirZigZag) {
        // True ZigZag of directions → Híbrido INVERSO (opposite of last direction)
        const lastDir = state.dirSeq[state.dirSeq.length - 1];
        const inverseSign = lastDir === 'D' ? -1 : 1;
        const idx1717 = (lastNumIdx + (10 * inverseSign) + 37) % 37;
        target1717 = WHEEL_ORDER[idx1717];
        reason1717 = `ZIGZAG DIR REAL → HÍBRIDO INVERSO (última:${lastDir})`;
        mode1717   = 'HÍBRIDO INVERSO';
    } else {
        // Normal híbrido: follow dominant direction
        const dirSign = state.dominantDir === 'D' ? 1 : -1;
        const idx1717 = (lastNumIdx + (10 * dirSign) + 37) % 37;
        target1717 = WHEEL_ORDER[idx1717];
        reason1717 = state.dominantDir === 'D' ? 'DIR DER → HÍBRIDO C+10' : 'DIR IZQ → HÍBRIDO C-10';
        mode1717   = state.dominantDir === 'D' ? 'HÍBRIDO DER' : 'HÍBRIDO IZQ';
    }
    signals.push({
        name: 'Android 1717', number: target1717, confidence: "90%",
        reason: reason1717, rule: "HÍBRIDO DIR", mode: mode1717,
        betZone: getWheelNeighbors(target1717, 9), radius: "N9"
    });

    // ── AGENT 4: N18 — CHANGE DETECTOR (Rhythm, ZigZag, Transition) ──
    let targetN18, reasonN18, modeN18;
    if (state.isZoneZigZag) {
        // Zone zigzagging → current dominant zone soporte to anchor
        targetN18 = state.dominantZone === 'B' ? sig.casilla19 : sig.casilla1;
        reasonN18 = `ZIGZAG ZONA → ANCLAJE ${state.dominantZone}`;
        modeN18   = 'ZIGZAG ZONA';
    } else if (state.isZoneTransition) {
        // Real transition → soporte on the incoming zone
        targetN18 = state.dominantZone === 'B' ? sig.casilla1 : sig.casilla19;
        reasonN18 = `TRANSICIÓN REAL → SOPORTE ${state.dominantZone === 'B' ? 'SMALL' : 'BIG'}`;
        modeN18   = 'TRANSICIÓN';
    } else if (state.rhythm) {
        // Rhythmic table → maintain dominant zone (it's a cycle, not a change)
        targetN18 = state.dominantZone === 'B' ? sig.casilla19 : sig.casilla1;
        reasonN18 = `RITMO DETECTADO (c/${state.rhythm}) → MANTENER ${state.dominantZone}`;
        modeN18   = 'RITMO ESTABLE';
    } else {
        targetN18 = state.dominantZone === 'B' ? sig.casilla19 : sig.casilla1;
        reasonN18 = `SOPORTE ZONA ${state.dominantZone}`;
        modeN18   = state.dominantZone === 'B' ? 'SOPORTE BIG' : 'SOPORTE SMALL';
    }
    signals.push({
        name: 'N18', number: targetN18, confidence: "86%",
        reason: reasonN18, rule: "DETECTOR CAMBIOS", mode: modeN18,
        betZone: getWheelNeighbors(targetN18, 9), radius: "N9"
    });

    // ── AGENT 5: CÉLULA — FUSION SNIPER ────────────────────────
    let targetCelula, reasonCelula, modeCelula;
    let inverseCelula, reasonInverso;
    const dirSign = state.dominantDir === 'D' ? 1 : -1;
    const invDirSign = dirSign * -1;

    if (state.isDirZigZag && state.isZoneTransition) {
        targetCelula = state.dominantZone === 'B' ? sig.casilla1 : sig.casilla19;
        reasonCelula = 'CAOS TOTAL → SOPORTE INVERSO';
        modeCelula   = 'CAOS';
        inverseCelula = state.dominantZone === 'B' ? sig.casilla19 : sig.casilla1;
        reasonInverso = 'CAOS TOTAL → SOPORTE NORMAL';
    } else if (state.isDirZigZag) {
        const lastDir = state.dirSeq[state.dirSeq.length - 1];
        const invSign = lastDir === 'D' ? -1 : 1;
        const idxC = (lastNumIdx + (10 * invSign) + 37) % 37;
        targetCelula = WHEEL_ORDER[idxC];
        reasonCelula = 'ZIGZAG DIR → SNIPE HÍBRIDO INVERSO';
        modeCelula   = 'SNIPE INVERSO';
        const idxInv = (lastNumIdx + (10 * invSign * -1) + 37) % 37;
        inverseCelula = WHEEL_ORDER[idxInv];
        reasonInverso = 'ZIGZAG DIR → SNIPE HÍBRIDO NORMAL';
    } else if (state.dominantZone === 'B') {
        const idxC = (lastNumIdx + (14 * dirSign) + 37) % 37;
        targetCelula = WHEEL_ORDER[idxC];
        reasonCelula = `ZONA BIG + DIR ${state.dominantDir} → SNIPE C14`;
        modeCelula   = 'SNIPE BIG';
        const idxInv = (lastNumIdx + (14 * invDirSign) + 37) % 37;
        inverseCelula = WHEEL_ORDER[idxInv];
        reasonInverso = `ZONA BIG + DIR INV → SNIPE C14 INV`;
    } else {
        const idxC = (lastNumIdx + (5 * dirSign) + 37) % 37;
        targetCelula = WHEEL_ORDER[idxC];
        reasonCelula = `ZONA SMALL + DIR ${state.dominantDir} → SNIPE C5`;
        modeCelula   = 'SNIPE SMALL';
        const idxInv = (lastNumIdx + (5 * invDirSign) + 37) % 37;
        inverseCelula = WHEEL_ORDER[idxInv];
        reasonInverso = `ZONA SMALL + DIR INV → SNIPE C5 INV`;
    }
    signals.push({
        name: 'CELULA', number: targetCelula, top: targetCelula, confidence: "95%",
        reason: reasonCelula, rule: "FUSION SNIPER", mode: modeCelula,
        betZone: getWheelNeighbors(targetCelula, 9), radius: "N9",
        smallSnipe: sig.casilla5, bigSnipe: sig.casilla14,
        numberInverso: inverseCelula, reasonInverso: reasonInverso,
        smallSnipeInverso: sig.casillaNeg5, bigSnipeInverso: sig.casillaNeg14
    });

    // ── POPULATE METADATA FOR ALL SIGNALS ──────────────────────
    signals.forEach(s => {
        s.smallSnipe  = sig.casilla5  !== undefined ? sig.casilla5  : '--';
        s.bigSnipe    = sig.casilla14 !== undefined ? sig.casilla14 : '--';
        s.dominance   = state.dominantZone === 'B' ? 'BIG'   : 'SMALL';
        s.trend       = state.dominantDir  === 'D' ? 'DER'   : 'IZQ';
        s.isDirZigZag = state.isDirZigZag;
        s.isZoneZigZag= state.isZoneZigZag;
        s.isUnstable  = state.isDirZigZag || state.isZoneZigZag;
        s.patternCode = state.dominantZone;
        s.isWeakening = state.isZoneTransition;
    });

    return signals;
}


// Ensure calcDist is available globally if needed by predictor.js
function calcDist(from, to) {
    const i1 = WHEEL_INDEX[from];
    const i2 = WHEEL_INDEX[to];
    if (i1 === undefined || i2 === undefined) return 0;
    let d = i2 - i1;
    if (d > 18) d -= 37;
    if (d < -18) d += 37;
    return d;
}

// Helper for browser/node hybrid
if (typeof window !== 'undefined') {
    window.analyzeSpin = analyzeSpin;
    window.projectNextRound = projectNextRound;
    window.computeDealerSignature = computeDealerSignature;
    window.getIAMasterSignals = getIAMasterSignals;
    window.getSixStrategieSignals = getSixStrategieSignals;
    window.WHEEL_ORDER = WHEEL_ORDER;
    window.WHEEL_INDEX = WHEEL_INDEX;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        WHEEL_ORDER, WHEEL_INDEX, TERMINALS_MAP,
        analyzeSpin, projectNextRound, computeDealerSignature, getIAMasterSignals, getSixStrategieSignals
    };
}
