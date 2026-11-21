/* node tell_sum.js <files...>   Summary for axiom 1. "Low trump" = 7 or lower. "Big" = ace, king or queen of trumps. */
const fs = require('fs'); const LOW = +(process.env.LOW || 7), BIG = +(process.env.BIG || 12);
const pc = (a, b) => b ? (100 * a / b).toFixed(1).padStart(5) + '%' : '    - ', pm = (a, b) => b ? ' ±' + (196 * Math.sqrt((a / b) * (1 - a / b) / b)).toFixed(1) : '';
for (const f of process.argv.slice(2)) { const G = {};
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) { if (!l) continue; let r; try { r = JSON.parse(l); } catch (e) { continue; }
    const key = r.need === 1 ? 'needs exactly 1' : 'needs 2 or more', g = G[key] = G[key] || { ledLow: 0, ledLowBig: 0, ledLowHigher: 0, ledLowBoss: 0, holdLow: 0, holdLowBig: 0, single: 0, singleLed: 0, lowBig: 0, lowBigLed: 0, lowBigLedBig: 0, lowMid: 0, lowMidLed: 0, P: r.P, n: r.n };
    const lows = r.tr.filter(x => x <= LOW), big = r.tr.some(x => x >= BIG), ledLow = r.ledTrump > 0 && r.ledTrump <= LOW, boss = Math.max(...r.tr) > Math.max(0, ...r.out);
    if (!lows.length) continue;
    g.holdLow++; if (big) g.holdLowBig++;
    if (ledLow) { g.ledLow++; if (big) g.ledLowBig++; if (r.tr.some(x => x > r.ledTrump)) g.ledLowHigher++; if (boss) g.ledLowBoss++; }
    if (r.tr.length === 1) { g.single++; if (ledLow) g.singleLed++; }
    else if (big) { g.lowBig++; if (ledLow) g.lowBigLed++; if (r.ledTrump >= BIG) g.lowBigLedBig++; }
    else { g.lowMid++; if (ledLow) g.lowMidLed++; } }
  for (const key of Object.keys(G).sort()) { const g = G[key];
    console.log(`${g.P} players ${g.n} cards, leader ${key} (holds a trump ${LOW} or lower: ${g.holdLow} leads)`);
    console.log(`   THE TELL    leads of a low trump: ${g.ledLow}.  Leader also holds A/K/Q of trumps ${pc(g.ledLowBig, g.ledLow)}${pm(g.ledLowBig, g.ledLow)} | any higher trump ${pc(g.ledLowHigher, g.ledLow)} | the top trump left ${pc(g.ledLowBoss, g.ledLow)}`);
    console.log(`   BASE RATE   holds A/K/Q whatever was led ${pc(g.holdLowBig, g.holdLow)}`);
    console.log(`   WHO LEADS IT  lone low trump: led ${pc(g.singleLed, g.single)}${pm(g.singleLed, g.single)} of ${g.single} | low trump + A/K/Q: low led ${pc(g.lowBigLed, g.lowBig)}, big led ${pc(g.lowBigLedBig, g.lowBig)} of ${g.lowBig} | low + other trumps, none big: ${pc(g.lowMidLed, g.lowMid)} of ${g.lowMid}`); } }
