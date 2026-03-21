// ============================================================
// app.js — COMPACT MOBILE UI ENGINE (Phase 30)
// ============================================================

const history      = [];
const iaSignalsHistory = [ [], [], [], [], [], [] ]; 
let activeIaTab    = 0; 
let lastIaSignals = [
    { top: 17, rule: 'READY', radius:'N9', smallSnipe: 5, bigSnipe: 14 },
    { top: 16, rule: 'READY', radius:'N2/N3', smallSnipe: 5, bigSnipe: 14  },
    { top: 5,  rule: 'READY', radius:'N9', smallSnipe: 5, bigSnipe: 14  },
    { top: 22, rule: 'READY', radius:'N9', smallSnipe: 5, bigSnipe: 14  },
    { top: 10, rule: 'READY', radius:'N4', smallSnipe: 5, bigSnipe: 14  },
    { top: '--', rule: 'READY', radius:'N9', smallSnipe: '--', bigSnipe: '--' }
]; 

// Agent names as per user request
const AGENT_NAMES   = ['Android N17', 'Android N16', 'Android 1717', 'Android N18', 'CÉLULA', 'CÉLULA 2'];
const AGENT_KEYS    = ['N17', 'N16', 'N17PLUS', 'N18', 'CELULA', 'CEL-INV'];
const AGENT_MODES   = ['SOPORTE/HIBRIDO', 'SIX STRATEGIE', 'HIBRIDO/ZIGZAG', 'SOPORTE PURO', 'SNIPER', 'SNIPER INVERSO'];

const RED_NUMS  = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const WHEEL_NUMS = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];

let currentTableId = null;

function calcDist(from, to) {
    const i1 = WHEEL_NUMS.indexOf(from);
    const i2 = WHEEL_NUMS.indexOf(to);
    if (i1 === -1 || i2 === -1) return 0;
    let d = i2 - i1;
    if (d > 18) d -= 37;
    if (d < -18) d += 37;
    return d;
}

// ─── RENDER: AGENT TABS ────────────────────────────────────
function renderTabs() {
    const strip = document.getElementById('strat-tabs');
    if (!strip) return;
    strip.innerHTML = AGENT_KEYS.map((key, idx) => {
        const h = iaSignalsHistory[idx] || [];
        const wins = h.filter(x => x === 'win').length;
        const active = idx === activeIaTab;
        return `<button class="ia-tab ${active ? 'active' : ''}" onclick="setActiveIaTab(${idx})">
            ${key}
            <span class="wl">W-L ${wins}-${h.length - wins}</span>
        </button>`;
    }).join('');
}

// ─── RENDER: AGENT CARD ────────────────────────────────────
function renderAgentCard(signals) {
    const s = signals[activeIaTab];
    if (!s) return;

    const nameEl    = document.getElementById('active-agent-name');
    const confEl    = document.getElementById('agent-confidence');
    const statusMsg = document.getElementById('agent-status-msg');
    const statusEl  = document.getElementById('agent-status');
    const syncEl    = document.getElementById('agent-sync');
    const targetEl  = document.getElementById('target-number');
    const radiusEl  = document.getElementById('pi-radius');
    const tendEl    = document.getElementById('pi-tendency');
    const psSmall   = document.getElementById('psn-small-val');
    const psBig     = document.getElementById('psn-big-val');
    const winsEl    = document.getElementById('agent-wins');
    const lossesEl  = document.getElementById('agent-losses');
    const dotsEl    = document.getElementById('result-dots');

    if (nameEl)   nameEl.innerText   = (AGENT_NAMES[activeIaTab] || 'AGENT').toUpperCase();
    if (confEl)   confEl.innerText   = (s.confidence || '90%') + ' CONF.';
    if (statusMsg) statusMsg.innerText = (s.rule || AGENT_MODES[activeIaTab]) + ' ' + (s.radius || 'N9');
    if (statusEl) statusEl.innerText = s.reason || 'ANALIZANDO PATRONES...';
    if (syncEl)   syncEl.innerText   = s.mode ? `MODO: ${s.mode}` : 'SINCRONIZADO';
    
    // Support either 'top' or 'number' from predictor.js
    const targetNum = s.top !== undefined ? s.top : (s.number !== undefined ? s.number : '--');
    if (targetEl) targetEl.innerText = targetNum;
    
    if (radiusEl) radiusEl.innerText = s.radius ? s.radius.toLowerCase() : 'n9';
    
    // Tendency from last dist
    if (tendEl && history.length >= 2) {
        const d = calcDist(history[history.length-2], history[history.length-1]);
        tendEl.innerText = `TENDENCIA: ${d >= 0 ? 'Der.' : 'Izq.'} ${d >= 0 ? '↺' : '↻'}`;
    }

    // Secondary snipes (SMALL/BIG)
    if (psSmall) psSmall.innerText = s.smallSnipe !== undefined ? s.smallSnipe : '--';
    if (psBig)   psBig.innerText   = s.bigSnipe !== undefined   ? s.bigSnipe   : '--';

    // W-L
    const h = iaSignalsHistory[activeIaTab] || [];
    const wins = h.filter(x => x === 'win').length;
    const losses = h.length - wins;
    if (winsEl)   winsEl.innerText   = wins;
    if (lossesEl) lossesEl.innerText = losses;

    // Performance string (All WWLL...)
    const perfEl = document.getElementById('agent-performance');
    if (perfEl) {
        perfEl.innerHTML = h.slice(-15).map(r => 
            `<span class="${r === 'win' ? 'perf-w' : 'perf-l'}">${r === 'win' ? 'W' : 'L'}</span>`
        ).join('');
    }
}

// ─── RENDER: WHEEL ──────────────────────────────────────────
function drawWheel(highlightNum = null) {
    const canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = 65, cy = 65; // Updated center for 130x130
    ctx.clearRect(0, 0, 130, 130);

    const goldColor = '#f5c842';

    ctx.beginPath(); ctx.arc(cx, cy, 63, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a'; ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.stroke();

    WHEEL_NUMS.forEach((n, i) => {
        const startAng = (i * (360 / 37) - 90 - (360/74)) * (Math.PI / 180);
        const endAng   = (i * (360 / 37) - 90 + (360/74)) * (Math.PI / 180);
        const midAng   = (i * (360 / 37) - 90) * (Math.PI / 180);

        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(startAng) * 35, cy + Math.sin(startAng) * 35);
        ctx.arc(cx, cy, 60, startAng, endAng);
        ctx.lineTo(cx + Math.cos(endAng) * 35, cy + Math.sin(endAng) * 35);
        ctx.closePath();
        
        ctx.fillStyle = (n === 0) ? '#008b00' : (RED_NUMS.has(n) ? '#c41e3a' : '#000');
        ctx.fill();
        ctx.strokeStyle = '#222'; ctx.lineWidth = 0.5; ctx.stroke();

        const rx = cx + Math.cos(midAng) * 48;
        const ry = cy + Math.sin(midAng) * 48;
        
        ctx.save();
        ctx.translate(rx, ry); ctx.rotate(midAng + Math.PI/2);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 8px Inter';
        ctx.textAlign = 'center'; ctx.fillText(n, 0, 3);
        ctx.restore();

        if (n === highlightNum) {
            ctx.beginPath(); ctx.arc(rx, ry, 9, 0, Math.PI * 2);
            ctx.strokeStyle = goldColor; ctx.lineWidth = 2; ctx.stroke();
            const bx = cx + Math.cos(midAng) * 63;
            const by = cy + Math.sin(midAng) * 63;
            ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI*2);
            ctx.fillStyle = '#fff'; ctx.shadowBlur = 6; ctx.shadowColor = '#fff';
            ctx.fill(); ctx.shadowBlur = 0;
        }
    });

    const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, 35);
    gr.addColorStop(0, '#333'); gr.addColorStop(1, '#000');
    ctx.beginPath(); ctx.arc(cx, cy, 35, 0, Math.PI*2);
    ctx.fillStyle = gr; ctx.fill();
}

// ─── RENDER: WHEEL & HISTORY ───────────────────────────────
function renderWheelAndHistory() {
    const strip = document.getElementById('history-strip-mini');
    if (!strip) return;

    // History (Last 15 inside the visual panel)
    const last15 = history.slice(-15).reverse();
    strip.innerHTML = last15.map(n => {
        const cls = (n === 0) ? 'ball-zero' : (RED_NUMS.has(n) ? 'ball-red' : 'ball-black');
        return `<div class="mini-ball ${cls}">${n}</div>`;
    }).join('');

    // Update Wheel
    if (history.length > 0) {
        drawWheel(history[history.length - 1]);
    } else {
        drawWheel();
    }
}

// ─── RENDER: ALL SIGNALS ───────────────────────────────────
function renderSignalsPanel(signals) {
    renderTabs();
    renderAgentCard(signals);
    renderWheelAndHistory();
}

// ─── RENDER: TRAVEL CHART (Shadow Roulette Style) ──────────
function renderTravelChart() {
    const canvas = document.getElementById('travel-chart-canvas');
    if (!canvas || history.length < 3) return;
    
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    
    // Calculate travel distances (signed: positive = CW/DER, negative = CCW/IZQ)
    const travels = [];
    for (let i = 1; i < history.length; i++) {
        travels.push(calcDist(history[i-1], history[i]));
    }
    if (travels.length < 2) return;
    
    // Show last 30 spins max for readability
    const maxPoints = 30;
    const data = travels.slice(-maxPoints);
    const numPoints = data.length;
    
    // Calculate CW and CCW running averages
    const cwValues = data.filter(d => d > 0);
    const ccwValues = data.filter(d => d < 0);
    const avgCW = cwValues.length > 0 ? cwValues.reduce((a,b) => a+b, 0) / cwValues.length : 5;
    const avgCCW = ccwValues.length > 0 ? ccwValues.reduce((a,b) => a+b, 0) / ccwValues.length : -5;
    
    // Range (standard deviation-ish bands)
    const allAbs = data.map(d => Math.abs(d));
    const avgAbs = allAbs.reduce((a,b) => a+b, 0) / allAbs.length;
    const stdDev = Math.sqrt(allAbs.reduce((a,b) => a + Math.pow(b - avgAbs, 2), 0) / allAbs.length);
    const upperRange = avgCW + stdDev;
    const lowerRange = avgCCW - stdDev;
    
    // Chart dimensions
    const padL = 30, padR = 10, padT = 15, padB = 20;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const midY = padT + chartH / 2;
    
    // Scale: max travel is 18 pockets
    const maxVal = 18;
    const scaleY = (val) => midY - (val / maxVal) * (chartH / 2);
    const scaleX = (i) => padL + (i / (numPoints - 1)) * chartW;
    
    // ── Background grid ──
    ctx.strokeStyle = '#1a2a3d';
    ctx.lineWidth = 0.5;
    // Horizontal grid lines
    for (let v = -15; v <= 15; v += 5) {
        const y = scaleY(v);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(W - padR, y);
        ctx.stroke();
    }
    // Zero line (thicker)
    ctx.strokeStyle = '#2a3a5d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, midY);
    ctx.lineTo(W - padR, midY);
    ctx.stroke();
    
    // ── Y-axis labels ──
    ctx.fillStyle = '#4a6080';
    ctx.font = '9px Inter';
    ctx.textAlign = 'right';
    for (let v = -15; v <= 15; v += 5) {
        if (v === 0) continue;
        ctx.fillText(v > 0 ? `+${v}` : `${v}`, padL - 4, scaleY(v) + 3);
    }
    ctx.fillText('0', padL - 4, midY + 3);
    
    // ── X-axis labels ──
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3a5070';
    const step = Math.max(1, Math.floor(numPoints / 8));
    for (let i = 0; i < numPoints; i += step) {
        ctx.fillText(travels.length - numPoints + i + 1, scaleX(i), H - 4);
    }
    
    // ── Range bands (yellow/orange horizontal bands) ──
    // Upper range band (CW zone)
    ctx.strokeStyle = 'rgba(240, 192, 64, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, scaleY(upperRange));
    ctx.lineTo(W - padR, scaleY(upperRange));
    ctx.stroke();
    // Lower range band (CCW zone)
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(padL, scaleY(lowerRange));
    ctx.lineTo(W - padR, scaleY(lowerRange));
    ctx.stroke();
    ctx.setLineDash([]);
    
    // ── Average CW line (red, horizontal) ──
    ctx.strokeStyle = '#f04060';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(padL, scaleY(avgCW));
    ctx.lineTo(W - padR, scaleY(avgCW));
    ctx.stroke();
    
    // ── Average CCW line (orange, horizontal) ──
    ctx.strokeStyle = '#ff8c40';
    ctx.beginPath();
    ctx.moveTo(padL, scaleY(avgCCW));
    ctx.lineTo(W - padR, scaleY(avgCCW));
    ctx.stroke();
    ctx.setLineDash([]);
    
    // ── CW fill zone (green tint above 0) ──
    ctx.fillStyle = 'rgba(48, 224, 144, 0.04)';
    ctx.fillRect(padL, padT, chartW, chartH / 2);
    
    // ── CCW fill zone (purple tint below 0) ──
    ctx.fillStyle = 'rgba(192, 144, 255, 0.04)';
    ctx.fillRect(padL, midY, chartW, chartH / 2);
    
    // ── Main travel line (Dynamic Coloring) ──
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    for (let i = 1; i < numPoints; i++) {
        const x1 = scaleX(i - 1);
        const y1 = scaleY(data[i - 1]);
        const x2 = scaleX(i);
        const y2 = scaleY(data[i]);
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        
        const val = data[i];
        const absVal = Math.abs(val);
        
        // COLOR LOGIC:
        // 1. Outside range bands (Peak/Chaos) -> Gold
        // 2. Positive (CW/DER) -> Green
        // 3. Negative (CCW/IZQ) -> Red
        if (val > upperRange || val < lowerRange) {
            ctx.strokeStyle = '#f5c842'; // Gold para picos (Caos)
        } else {
            ctx.strokeStyle = val >= 0 ? '#30e090' : '#f04060'; // Verde vs Rojo
        }
        
        ctx.stroke();
    }
    
    // ── Data points (circles on the green line) ──
    for (let i = 0; i < numPoints; i++) {
        const x = scaleX(i);
        const y = scaleY(data[i]);
        const isCW = data[i] >= 0;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = isCW ? '#30e090' : '#c090ff';
        ctx.fill();
        ctx.strokeStyle = '#0d1520';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    // ── Last point highlight (glow) ──
    if (numPoints > 0) {
        const lx = scaleX(numPoints - 1);
        const ly = scaleY(data[numPoints - 1]);
        ctx.beginPath();
        ctx.arc(lx, ly, 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = data[numPoints - 1] >= 0 ? '#30e090' : '#c090ff';
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Value label on last point
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px JetBrains Mono';
        ctx.textAlign = 'center';
        const val = data[numPoints - 1];
        ctx.fillText((val > 0 ? '+' : '') + val, lx, ly - 10);
    }
}

// ─── RENDER: TRAVEL TABLE ──────────────────────────────────
function renderTravelPanel() {
    const tbody   = document.getElementById('travel-tbody');
    const patEl   = document.getElementById('travel-pattern');
    const lastZEl = document.getElementById('travel-last-zone');
    if (!tbody) return;

    if (history.length < 2) {
        tbody.innerHTML = '<tr><td colspan="4" class="muted">Selecciona una mesa...</td></tr>';
        return;
    }

    // Pattern badge
    if (patEl) {
        if (typeof analyzeTableState === 'function' && history.length >= 5) {
            const state = analyzeTableState(history);
            let pat = 'ESTABLE', patClass = 'badge-stable';
            
            if (state.isDirZigZag || state.isZoneZigZag) { 
                pat = 'ZIG ZAG ↔'; patClass = 'badge-zigzag'; 
            } else if (state.isZoneTransition) { 
                pat = 'TRANSICIÓN'; patClass = 'badge-zone'; 
            } else if (state.isFalseBreak) {
                pat = 'FALSA RUPTURA'; patClass = 'badge-stable';
            } else if (state.rhythm) {
                pat = `RITMO c/${state.rhythm}`; patClass = 'badge-stable';
            } else if (state.dominantZone === 'B') {
                pat = 'BIG TREND'; patClass = 'badge-zone';
            } else if (state.dominantZone === 'S') {
                pat = 'SMALL TREND'; patClass = 'badge-stable';
            }
            
            patEl.textContent = pat;
            patEl.className = `badge ${patClass}`;
            
            if (lastZEl) {
                lastZEl.textContent = `DOM: ${state.dominantZone === 'B' ? 'BIG' : 'SMALL'} | ${state.dominantDir === 'D' ? 'DER' : 'IZQ'}`;
                lastZEl.style.color = 'var(--accent)';
            }
        } else {
            patEl.textContent = 'ANALIZANDO...';
            patEl.className = 'badge badge-stable';
        }
    }

    tbody.innerHTML = history.slice(-50).reverse().map((n, i) => {
        const idxInHistory = history.length - 1 - i;
        const prev = history[idxInHistory - 1];
        const dist = (prev !== undefined) ? calcDist(prev, n) : 0;
        const absDist = Math.abs(dist);
        const dir  = dist > 0 ? 'DER.' : (dist < 0 ? 'IZQ.' : '--');
        
        const numClass = (n === 0) ? 'num-zero' : (RED_NUMS.has(n) ? 'num-red' : 'num-black');
        const dirClass = dist >= 0 ? 'dir-der' : 'dir-izq';
        
        // Correct classification based on DISTANCE (Phase 31 Fix)
        let phaseHtml = '';
        if (absDist >= 1 && absDist <= 9)        phaseHtml = `<span class="phase-pill pill-small">SMALL</span>`;
        else if (absDist >= 10 && absDist <= 19) phaseHtml = `<span class="phase-pill pill-big">BIG</span>`;

        const isLast = (i === 0);
        return `<tr>
            <td class="row-n">${idxInHistory + 1}${isLast ? '<span style="font-size:8px;color:var(--accent)"> ★</span>' : ''}</td>
            <td class="${numClass}">${n}</td>
            <td style="color:var(--text2)">${absDist}p</td>
            <td class="${dirClass}">${dir} <span style="font-size:9px;opacity:0.6">${dist >= 0 ? '↺' : '↻'}</span></td>
            <td>${phaseHtml}</td>
        </tr>`;
    }).join('');
}

// ─── SUBMIT NUMBER ─────────────────────────────────────────
function submitNumber(val, silent = false, batch = false) {
    const inputEl = document.getElementById('spin-number');
    const raw = val !== undefined ? val : (inputEl ? inputEl.value : '');
    const n = parseInt(raw);
    
    if (!isNaN(n) && n >= 0 && n <= 36) {
        // Evaluate previous predictions
        lastIaSignals.forEach((s, idx) => {
            if (!s || s.top === undefined || s.top === null) return;
            const radius = s.radius === 'N4' ? 4 : 9;
            const win = Math.abs(calcDist(n, s.top)) <= radius;
            iaSignalsHistory[idx].push(win ? 'win' : 'loss');
        });
        
        history.push(n);
        if (inputEl && !batch) inputEl.value = '';

        // Compute new predictions
        if (typeof computeDealerSignature === 'function' && history.length >= 3) {
            try {
                const sig  = computeDealerSignature(history);
                const prox = projectNextRound(history, {});
                const masterSignals = getIAMasterSignals(prox, sig, history);
                
                if (masterSignals && masterSignals.length > 0) {
                    const ag17   = masterSignals.find(s => s.name === 'Android n17');
                    const ag16   = masterSignals.find(s => s.name === 'Android n16');
                    const ag1717 = masterSignals.find(s => s.name === 'Android 1717');
                    const agN18  = masterSignals.find(s => s.name === 'N18');
                    const agCel  = masterSignals.find(s => s.name === 'CELULA');
                    
                    lastIaSignals = [
                        { top: ag17?.number,   confidence: ag17?.confidence,   reason: ag17?.reason,   rule: ag17?.rule,   mode: ag17?.mode,   radius: ag17?.radius   || 'N9', smallSnipe: ag17?.smallSnipe, bigSnipe: ag17?.bigSnipe },
                        { top: ag16?.tp,        confidence: ag16?.confidence,   reason: ag16?.reason,   rule: ag16?.rule,   mode: ag16?.mode,   radius: 'N2/N3',        tp: ag16?.tp, cors: ag16?.cor, smallSnipe: ag16?.smallSnipe, bigSnipe: ag16?.bigSnipe },
                        { top: ag1717?.number, confidence: ag1717?.confidence, reason: ag1717?.reason, rule: ag1717?.rule, mode: ag1717?.mode, radius: ag1717?.radius || 'N9', smallSnipe: ag1717?.smallSnipe, bigSnipe: ag1717?.bigSnipe },
                        { top: agN18?.number,  confidence: agN18?.confidence,  reason: agN18?.reason,  rule: agN18?.rule,  mode: agN18?.mode,  radius: agN18?.radius  || 'N9', smallSnipe: agN18?.smallSnipe, bigSnipe: agN18?.bigSnipe },
                        { top: agCel?.number,  confidence: agCel?.confidence,  reason: agCel?.reason,  rule: agCel?.rule,  mode: agCel?.mode,  radius: agCel?.radius  || 'N4', smallSnipe: agCel?.smallSnipe, bigSnipe: agCel?.bigSnipe },
                        { top: agCel?.numberInverso, confidence: agCel?.confidence, reason: agCel?.reasonInverso || 'INVERSO', rule: 'SNIPER INVERSO', mode: 'INVERSO', radius: agCel?.radius || 'N9', smallSnipe: agCel?.smallSnipeInverso, bigSnipe: agCel?.bigSnipeInverso }
                    ];
                }
            } catch(e) { console.error('Predict error:', e); }
        }

        // Post to backend (non-blocking)
        if (currentTableId && !batch) {
            fetch('/api/spin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table_id: currentTableId, number: n, source: 'manual' })
            }).catch(() => {});
        }
    }

    if (!batch) {
        renderSignalsPanel(lastIaSignals);
        renderTravelChart();
        renderTravelPanel();
        checkAlarm(history);
    }
}

// ─── ALARM & NOTIFICATION SYSTEM ───────────────────────────
let lastAlertSpinsCount = 0;
let globalAudioCtx = null; // Guardar el contexto desbloqueado

function unlockAudio() {
    if (!globalAudioCtx) {
        globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume();
    }
}

function checkAlarm(hist) {
    if (hist.length < 5) return;
    
    const dirs = [];
    const zones = [];
    
    // Check last 3 spins
    for (let i = hist.length - 3; i < hist.length; i++) {
        const prev = hist[i-1];
        const curr = hist[i];
        if (prev !== undefined) {
             const dist = calcDist(prev, curr);
             const absDist = Math.abs(dist);
             dirs.push(dist >= 0 ? 'D' : 'I');
             zones.push((absDist >= 10 && absDist <= 19) ? 'BIG' : 'SMALL');
        }
    }
    
    if (dirs.length === 3 && zones.length === 3) {
        const allDirsSame = dirs[0] === dirs[1] && dirs[1] === dirs[2];
        const allZonesSame = zones[0] === zones[1] && zones[1] === zones[2];
        
        // Ahora suena si una de las dos condiciones se cumple (más fácil de que pase)
        if (allDirsSame || allZonesSame) {
            if (hist.length > lastAlertSpinsCount + 2) {
                lastAlertSpinsCount = hist.length;
                fireAlarm(allDirsSame ? dirs[0] : null, allZonesSame ? zones[0] : null);
            }
        }
    }
}

function fireAlarm(dirStr, zoneStr) {
    // 1. Sonido Web Audio usando el Contexto Desbloqueado
    try {
        if (!globalAudioCtx) unlockAudio();
        
        const osc = globalAudioCtx.createOscillator();
        const gain = globalAudioCtx.createGain();
        osc.type = 'sine';
        
        // Sonido de alerta triple rápido
        osc.frequency.setValueAtTime(880, globalAudioCtx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(440, globalAudioCtx.currentTime + 0.3);
        
        gain.gain.setValueAtTime(0.5, globalAudioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, globalAudioCtx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(globalAudioCtx.destination);
        osc.start();
        osc.stop(globalAudioCtx.currentTime + 0.3);
        
        // Un segundo bip rápido si es "Super Estable" (Ambos coincidentes)
        if (dirStr && zoneStr) {
            setTimeout(() => {
                try {
                    const osc2 = globalAudioCtx.createOscillator();
                    const gain2 = globalAudioCtx.createGain();
                    osc2.frequency.setValueAtTime(1200, globalAudioCtx.currentTime);
                    gain2.gain.setValueAtTime(0.5, globalAudioCtx.currentTime);
                    gain2.gain.exponentialRampToValueAtTime(0.01, globalAudioCtx.currentTime + 0.3);
                    osc2.connect(gain2);
                    gain2.connect(globalAudioCtx.destination);
                    osc2.start();
                    osc2.stop(globalAudioCtx.currentTime + 0.3);
                } catch(e){}
            }, 350);
        }
    } catch(e) { console.warn("Audio blocked:", e); }
    
    const msg = `MESA ${dirStr && zoneStr ? 'SÚPER ' : ''}ESTABLE: ${zoneStr || ''} ${dirStr ? (dirStr==='D'?'DER':'IZQ') : ''}`.trim();

    // 2. Notificación en OS
    if (Notification.permission === 'granted') {
        new Notification("🔥 OPORTUNIDAD", { body: msg, icon: '🎰' });
    }
    
    // 3. Notificación Visual Flotante
    let toast = document.getElementById('stable-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'stable-toast';
        toast.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: linear-gradient(145deg, var(--gold), #c99318);
            color: #000; padding: 12px 24px; border-radius: 30px;
            font-family: var(--mono); font-weight: 900; font-size: 13px;
            z-index: 9999; box-shadow: 0 6px 20px rgba(240,192,64,0.5);
            opacity: 0; pointer-events: none; transition: opacity 0.3s, transform 0.3s;
        `;
        document.body.appendChild(toast);
    }
    toast.innerHTML = `🔥 ${msg}`;
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%, 10px)';
    
    setTimeout(() => { 
        toast.style.opacity = '0'; 
        toast.style.transform = 'translate(-50%, 0)';
    }, 4000);
}

// Global exposure for testing
window.testAlarm = () => fireAlarm('D', 'BIG');



// ─── SYNC FROM SERVER ──────────────────────────────────────
let currentLastSpinId = null;

async function syncData() {
    if (!currentTableId) return;
    try {
        const r = await fetch(`/api/history/${currentTableId}?limit=400`);
        if (!r.ok) return;
        const spins = await r.json();
        
        const incomingLastSpinId = spins.length > 0 ? (spins[spins.length - 1].id || spins[spins.length - 1]._id) : null;
        
        if (spins.length !== history.length || incomingLastSpinId !== currentLastSpinId) {
            history.length = 0;
            iaSignalsHistory.forEach(h => h.length = 0);
            for (const s of spins) submitNumber(s.number, true, true);
            renderSignalsPanel(lastIaSignals);
            renderTravelChart();
            renderTravelPanel();
            currentLastSpinId = incomingLastSpinId;
        }
    } catch(e) {}
}

// ─── TAB SWITCH ───────────────────────────────────────────
window.setActiveIaTab = (idx) => {
    activeIaTab = idx;
    renderSignalsPanel(lastIaSignals);
};

// ─── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Clock
    setInterval(() => {
        const el = document.getElementById('live-clock');
        if (el) el.innerText = new Date().toLocaleTimeString();
    }, 1000);

    // Immediate render with placeholders
    renderSignalsPanel(lastIaSignals);
    renderTravelPanel();

    // Pedir permiso para notificaciones tras el primer click del usuario
    document.body.addEventListener('click', () => {
        unlockAudio();
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, { once: true });


    // Load tables from API
    try {
        const r = await fetch('/api/tables');
        if (r.ok) {
            const ts = await r.json();
            const tableSelect = document.getElementById('table-select');
            if (tableSelect && ts.length > 0) {
                tableSelect.innerHTML = ts.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
                tableSelect.addEventListener('change', () => {
                    currentTableId = tableSelect.value;
                    history.length = 0;
                    iaSignalsHistory.forEach(h => h.length = 0);
                    syncData();
                });
                currentTableId = ts[0].id;
                syncData();
            }
        }
    } catch (e) { console.warn('API not reachable, offline mode.'); }

    // ── SSE: Real-time push instead of polling ──────────────
    let sseSource = null;
    let sseBackupInterval = null;

    function connectSSE(tableId) {
        if (sseSource) { sseSource.close(); sseSource = null; }
        if (sseBackupInterval) { clearInterval(sseBackupInterval); }

        sseSource = new EventSource(`/api/events/${tableId}`);

        sseSource.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data);
                if (msg.type === 'spin') {
                    // New spin arrived → sync immediately
                    syncData();
                }
            } catch(_) {}
        };

        sseSource.onerror = () => {
            // SSE failed → switch to backup 10s polling
            sseSource.close();
            sseSource = null;
            console.warn('[OFI] SSE disconnected, falling back to polling...');
            sseBackupInterval = setInterval(syncData, 10000);
        };

        sseSource.onopen = () => {
            // SSE connected → stop backup polling if any
            if (sseBackupInterval) { clearInterval(sseBackupInterval); sseBackupInterval = null; }
        };
    }

    connectSSE(currentTableId);

    // Re-connect SSE when table changes
    tableSelect && tableSelect.addEventListener('change', () => {
        connectSSE(currentTableId);
    });
});
