/* Assertion suite for ohhell.html.
 *
 *   node assertions.js [path/to/ohhell.html]
 *
 * Every case is a position with a known-correct answer, most of them found by
 * a person looking at one hand and saying "that cannot be right". The aggregate
 * harness measures points per round over random deals; it caught two bad fixes
 * this session but none of the four real bugs, because the shapes that expose
 * them are rare. This file is where those shapes live. Add a case whenever a
 * hand looks wrong - the test is cheap, the bug it prevents is not.
 *
 * Exit code is the number of failures.
 */

const fs = require('fs');
const path = process.argv[2] || '/mnt/user-data/outputs/ohhell.html';

/* Load the pure engine out of the HTML without the DOM. */
const html = fs.readFileSync(path, 'utf8');
const lines = html.split('\n');
const start = lines.findIndex(l => l.includes('===== cards:'));
const end   = lines.findIndex(l => l.includes('===== UI ====='));
const src = lines.slice(start, end).join('\n') +
  '\nmodule.exports={initSim,runChunk,finalize,chooseCard,playHand,mulberry32,suitOf,rankOf,setKnown:(a)=>{KNOWN=a;}};';
const tmp = '/tmp/_engine_under_test.js';
fs.writeFileSync(tmp, src);
const E = require(tmp);

const C = (s, r) => s * 13 + (r - 2);          // suit 0=S 1=H 2=D 3=C, rank 2..14
const S = 0, H = 1, D = 2, CL = 3;

function sim(hand, trump, n, opts = {}) {
  const cfg = { hand, trump, trumpCard: opts.trumpCard ?? -1, players: opts.players ?? 4,
    seat: opts.seat ?? 0, priorBids: opts.priorBids ?? [], iterations: opts.iters ?? 12000,
    seed: opts.seed ?? 7, profiles: {} };
  const st = E.initSim(cfg); E.runChunk(st, cfg.iterations); return E.finalize(st);
}
const row = (R, view, bid) => R.views[view].rows.find(r => r.bid === bid);

let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log('  ok   ' + name); }
  else    { fail++; console.log('  FAIL ' + name + (detail ? '   [' + detail + ']' : '')); }
}

/* ------------------------------------------------------------------ */
console.log('\nLong running suit, no trump  (found by Matt Glassman)');
{
  // AKQJT65432 of diamonds + 2S 2H 2C. Only 7,8,9 of diamonds are out; three
  // leads strip them and the rest run. Exactly ten tricks, every deal.
  const hand = [C(S,2), C(H,2), C(CL,2), C(D,14), C(D,13), C(D,12), C(D,11), C(D,10),
                C(D,6), C(D,5), C(D,4), C(D,3), C(D,2)];
  const R = sim(hand, -1, 13, { iters: 4000 });
  for (let b = 0; b <= 10; b++)
    check('bid ' + b + ' is 100% makeable', row(R,'all',b).makePct > 99.5, row(R,'all',b).makePct.toFixed(1) + '%');
  // 11 is not strictly impossible: after ten diamonds, an opponent who has
  // discarded every spade lets the 2S win. No sensible table plays that way,
  // but the heuristic opponents occasionally do. Rare, not never.
  check('bid 11 is rare', row(R,'all',11).makePct < 2, row(R,'all',11).makePct.toFixed(1) + '%');
  for (let b = 12; b <= 13; b++)
    check('bid ' + b + ' is impossible', row(R,'all',b).makePct < 0.2, row(R,'all',b).makePct.toFixed(1) + '%');
}

/* ------------------------------------------------------------------ */
console.log('\nA-2 of trumps needing one  (found by Matt Glassman)');
{
  // Lead the 2 while someone can still be forced to take it; the ace mops up.
  // Cashing the ace first strips the table and the 2 wins a trick you did
  // not want. Makeable whenever any opponent holds a diamond, about 79%.
  const R = sim([C(D,2), C(D,14)], D, 2);
  const r = row(R,'all',1);
  check('bid 1 makes >= 75% overall', r.makePct >= 75, r.makePct.toFixed(1) + '%');
  check('bid 1 takes about one trick on average', Math.abs(r.avgTricks - 1.2) < 0.15, r.avgTricks.toFixed(2));
  const u = row(R,'under',1);
  // The bug shape was 0% here. Conditioning on every opponent passing selects
  // for tables with no trumps, so the true figure is low but not zero.
  check('bid 1 is still possible when the table undersells', !u.empty && u.makePct > 5, u.empty ? 'empty' : u.makePct.toFixed(1) + '%');
}

/* ------------------------------------------------------------------ */
console.log('\nA-2 of trumps with a side ace, needing two  (found by Matt Glassman)');
{
  // Two winners that arrive without the lead cover the contract, so the lead
  // is spare and goes on the 2. Under the old order the ace went first, the
  // opponents lost their trumps, and the 2 won a third trick.
  const R = sim([C(D,14), C(D,2), C(S,14)], D, 3);
  const a = row(R,'all',2), u = row(R,'under',2);
  check('bid 2 makes >= 65% overall', a.makePct >= 65, a.makePct.toFixed(1) + '%');
  check('bid 2 makes >= 40% when the table undersells', !u.empty && u.makePct >= 40, u.empty ? 'empty' : u.makePct.toFixed(1) + '%');
  check('bid 2 never takes all three on purpose', a.avgTricks < 2.3, a.avgTricks.toFixed(2));
}

/* ------------------------------------------------------------------ */
console.log('\nBusted contract still takes tricks  (Vienna pays raw tricks once you are over)');
{
  // Direct policy test. Bid 1, already won 2 (needed = -1). Holding the only
  // winner, the policy must take the trick: every extra trick is +1.
  const seen = new Uint8Array(52), mine = new Set([C(S,14), C(H,3)]);
  const card = E.chooseCard([C(S,14), C(H,3)], S, C(S,9), D, -1,
    { seen, mine, trump: D, needyVoidIn: [false,false,false,false] });
  check('over the bid, wins with the ace rather than ducking', card === C(S,14), 'played ' + card);
}

/* ------------------------------------------------------------------ */
console.log('\nTurned trump card is real information');
{
  // Holding the trump king. With the trump ace face up, the king is boss and
  // a bid of zero is impossible; with the 3 face up nothing changes.
  const hand = [C(D,13), C(D,4), C(S,14), C(H,7), C(CL,3)];
  const unknown = sim(hand, D, 5, { iters: 8000 });
  const aceUp   = sim(hand, D, 5, { iters: 8000, trumpCard: C(D,14) });
  const threeUp = sim(hand, D, 5, { iters: 8000, trumpCard: C(D,3) });
  check('ace turned: bid 0 becomes impossible', row(aceUp,'all',0).makePct < 0.5, row(aceUp,'all',0).makePct.toFixed(1) + '%');
  check('ace turned: bid 3 easier than with the card unknown',
    row(aceUp,'all',3).makePct > row(unknown,'all',3).makePct + 5,
    row(unknown,'all',3).makePct.toFixed(1) + ' -> ' + row(aceUp,'all',3).makePct.toFixed(1));
  check('three turned: roughly no change',
    Math.abs(row(threeUp,'all',3).makePct - row(unknown,'all',3).makePct) < 4,
    row(unknown,'all',3).makePct.toFixed(1) + ' -> ' + row(threeUp,'all',3).makePct.toFixed(1));
}

/* ------------------------------------------------------------------ */
console.log('\nView arithmetic');
{
  // The oversold and undersold subsets partition the run. Their margins,
  // weighted by share, must recombine to the overall margin on every row.
  const R = sim([C(S,14), C(S,9), C(S,4), C(H,13), C(H,6), C(D,12), C(CL,3)], S, 7,
                { seat: 2, priorBids: [2,1], iters: 20000 });
  let worst = 0;
  for (const r of R.views.all.rows) {
    const o = row(R,'over',r.bid), u = row(R,'under',r.bid);
    const blend = (o.empty ? 0 : o.share * o.delta) + (u.empty ? 0 : u.share * u.delta);
    worst = Math.max(worst, Math.abs(blend / 100 - r.delta));
  }
  check('subset margins recombine to the overall margin', worst < 0.01, 'max gap ' + worst.toFixed(4));
  for (const v of ['all','over','under'])
    for (const r of R.views[v].rows) if (!r.empty) {
      const s = r.hist.reduce((a,b)=>a+b,0);
      if (Math.abs(s - 1) > 1e-6) check('histogram sums to 1 (' + v + ', bid ' + r.bid + ')', false, s.toFixed(4));
    }
  check('histograms normalise within each view', true);
}

/* ------------------------------------------------------------------ */
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail);
