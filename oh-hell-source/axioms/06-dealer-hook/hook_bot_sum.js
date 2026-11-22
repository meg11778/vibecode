/* Summary of hook_bot_check.js output: node hook_bot_sum.js bot_4x7.jsonl */
const fs = require('fs'); for (const f of process.argv.slice(2)) { const L = fs.readFileSync(f, 'utf8').trim().split('\n').flatMap(l => { try { return [JSON.parse(l)]; } catch (e) { return []; } }).filter(r => r.eUp != null && r.eDown != null);
  const st = a => { const k = a.length, m = a.reduce((s, x) => s + x, 0) / k, v = a.reduce((s, x) => s + (x - m) * (x - m), 0) / (k - 1); return (m >= 0 ? '+' : '') + m.toFixed(2) + ' +/-' + (2 * Math.sqrt(v / k)).toFixed(2); };
  const up = L.filter(r => r.simBid === r.X + 1), dn = L.filter(r => r.simBid === r.X - 1), oth = L.length - up.length - dn.length, pc = x => (100 * x / L.length).toFixed(0) + '%';
  console.log(`\n${f}: ${L[0].P} players ${L[0].n} cards, ${L.length} hooked bids by the game's simulation`);
  console.log('  it bids X+1 ' + pc(up.length) + ', X-1 ' + pc(dn.length) + ', something else ' + pc(oth) + ';  bidding network alone would bid up ' + pc(L.filter(r => r.netBid === r.X + 1).length));
  console.log('  up minus down: simulation\'s own sums ' + st(L.map(r => r.eUp - r.eDown)) + ' | measured for those hands (main run) ' + st(L.map(r => r.Dhand)) + ' | this deal played out ' + st(L.map(r => r.realUp - r.realDown)));
  console.log('  simulation\'s sums minus measured, hand by hand: ' + st(L.map(r => r.eUp - r.eDown - r.Dhand)));
  if (up.length > 5) console.log('  when it bids up (' + up.length + '): its sums ' + st(up.map(r => r.eUp - r.eDown)) + ', measured ' + st(up.map(r => r.Dhand)));
  console.log('  what its choice earns above always bidding X-1 (measured, X+1/X-1 choices only): ' + st(L.map(r => r.simBid === r.X + 1 ? r.Dhand : 0))); }
