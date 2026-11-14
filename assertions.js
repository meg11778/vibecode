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
 * The sections up to "View arithmetic" pin the simulation to the rules engine,
 * so they keep guarding it now that the network plays by default. The sections
 * after that run the neural network.
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
  '\nmodule.exports={initSim,runChunk,finalize,chooseCard,playHand,playHandNet,netCovers,muFor,bidAt,auctionFactor,vienna,mulberry32,suitOf,rankOf,setKnown:(a)=>{KNOWN=a;}};';
const tmp = require('path').join(require('os').tmpdir(), '_ohhell_engine_under_test.js');
fs.writeFileSync(tmp, src);
const E = require(tmp);

const C = (s, r) => s * 13 + (r - 2);          // suit 0=S 1=H 2=D 3=C, rank 2..14
const S = 0, H = 1, D = 2, CL = 3;

function sim(hand, trump, n, opts = {}) {
  const cfg = { hand, trump, trumpCard: opts.trumpCard ?? -1, players: opts.players ?? 4,
    seat: opts.seat ?? 0, priorBids: opts.priorBids ?? [], iterations: opts.iters ?? 12000,
    seed: opts.seed ?? 7, profiles: {}, play: opts.play ?? 'rules', safety: opts.safety };
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
console.log('\nNetwork: where it plays and where it does not');
{
  const seven = [C(S,14), C(S,9), C(S,4), C(H,13), C(H,6), C(D,12), C(CL,3)];
  check('plays four seats, trump, 7 cards', sim(seven, S, 7, { play: 'net', iters: 200 }).net === true);
  check('steps aside when the rules are asked for', sim(seven, S, 7, { play: 'rules', iters: 200 }).net === false);
  check('plays five seats', sim(seven, S, 7, { play: 'net', players: 5, iters: 200 }).net === true);
  check('plays six seats', sim(seven, S, 7, { play: 'net', players: 6, iters: 200 }).net === true);
  check('plays no trump', sim(seven, -1, 7, { play: 'net', iters: 200 }).net === true);
  check('steps aside at three seats', sim(seven, S, 7, { play: 'net', players: 3, iters: 200 }).net === false);
  check('steps aside at one card', sim([C(S,14)], S, 1, { play: 'net', iters: 200 }).net === false);
}

/* ------------------------------------------------------------------ */
console.log('\nNetwork: the known shapes');
{
  // The same hands that exposed the rules engine's mistakes.
  let R = sim([C(D,2), C(D,14)], D, 2, { play: 'net' });
  check('A-2 of trumps: bid 1 makes >= 75%', row(R,'all',1).makePct >= 75, row(R,'all',1).makePct.toFixed(1) + '%');
  check('A-2 of trumps: bid 1 still possible when the table undersells', row(R,'under',1).makePct > 5, row(R,'under',1).makePct.toFixed(1) + '%');
  R = sim([C(D,14), C(D,2), C(S,14)], D, 3, { play: 'net' });
  check('A-2 of trumps + side ace: bid 2 makes >= 65%', row(R,'all',2).makePct >= 65, row(R,'all',2).makePct.toFixed(1) + '%');
  // Losing two tricks with three winners-on-paper takes deliberate ducking;
  // the rules manage it about a quarter of the time.
  check('A-2 of trumps + side ace: bid 1 makes >= 40%', row(R,'all',1).makePct >= 40, row(R,'all',1).makePct.toFixed(1) + '%');
  R = sim([C(D,13), C(D,4), C(S,14), C(H,7), C(CL,3)], D, 5, { play: 'net', iters: 4000, trumpCard: C(D,14) });
  check('trump ace turned, holding the king: bid 0 impossible', row(R,'all',0).makePct < 0.5, row(R,'all',0).makePct.toFixed(1) + '%');
}

/* ------------------------------------------------------------------ */
console.log('\nNetwork: weights intact');
{
  // If the embedded weights are damaged the network still returns legal cards,
  // just bad ones. Whole tables of each engine on the same deals and bids: the
  // network table should make more contracts (about 58% against 55% since the
  // first network was trained on money, 14 Nov 2026; about 67% before that).
  const rng = E.mulberry32(2026), P = 4, n = 7, deals = 1500;
  let mkN = 0, mkR = 0, sumOK = true;
  for (let i = 0; i < deals; i++) {
    const d = [...Array(52).keys()];
    for (let k = 51; k > 0; k--) { const j = (rng() * (k + 1)) | 0; [d[k], d[j]] = [d[j], d[k]]; }
    const hands = []; for (let p = 0; p < P; p++) hands.push(d.slice(p * n, (p + 1) * n));
    const turned = d[P * n], trump = E.suitOf(turned);
    E.setKnown([turned]);
    const bids = []; let B = 0;
    for (let p = 0; p < P; p++) {
      const mu = E.muFor(hands[p], trump, n, P, p) * E.auctionFactor(n, P, B, P - p);
      const b = E.bidAt(Math.max(0, Math.min(n, mu)), n, p === P - 1 ? n - B : -1);
      bids.push(b); B += b;
    }
    const wn = E.playHandNet(hands, bids, trump, P, n, turned), wr = E.playHand(hands, bids, trump, P, n);
    if (wn.reduce((a, b) => a + b, 0) !== n) sumOK = false;
    for (let p = 0; p < P; p++) { if (wn[p] === bids[p]) mkN++; if (wr[p] === bids[p]) mkR++; }
  }
  E.setKnown([]);
  const a = 100 * mkN / deals / P, b = 100 * mkR / deals / P;
  check('every trick is awarded to someone', sumOK);
  check('network table makes more contracts than a rules table', a > b + 1.5, 'rules ' + b.toFixed(1) + '% -> network ' + a.toFixed(1) + '%');
}
{
  // The same guard for the second network, on the games it plays.
  for (const [P, n, noTrump, margin, label] of [[4, 13, true, 5, 'four seats, 13 cards, no trump'], [5, 8, false, 4, 'five seats, 8 cards'], [6, 7, false, 3, 'six seats, 7 cards']]) {
    const rng = E.mulberry32(2027 + P), deals = 1000;
    let mkN = 0, mkR = 0, sumOK = true;
    for (let i = 0; i < deals; i++) {
      const d = [...Array(52).keys()];
      for (let k = 51; k > 0; k--) { const j = (rng() * (k + 1)) | 0; [d[k], d[j]] = [d[j], d[k]]; }
      const hands = []; for (let p = 0; p < P; p++) hands.push(d.slice(p * n, (p + 1) * n));
      const turned = noTrump ? -1 : d[P * n], trump = turned < 0 ? -1 : E.suitOf(turned);
      E.setKnown(turned < 0 ? [] : [turned]);
      const bids = []; let B = 0;
      for (let p = 0; p < P; p++) {
        const mu = E.muFor(hands[p], trump, n, P, p) * E.auctionFactor(n, P, B, P - p);
        const b = E.bidAt(Math.max(0, Math.min(n, mu)), n, p === P - 1 ? n - B : -1);
        bids.push(b); B += b;
      }
      const wn = E.playHandNet(hands, bids, trump, P, n, turned), wr = E.playHand(hands, bids, trump, P, n);
      if (wn.reduce((x, y) => x + y, 0) !== n) sumOK = false;
      for (let p = 0; p < P; p++) { if (wn[p] === bids[p]) mkN++; if (wr[p] === bids[p]) mkR++; }
    }
    E.setKnown([]);
    const a = 100 * mkN / deals / P, b = 100 * mkR / deals / P;
    check(label + ': tricks all awarded, and more contracts than a rules table', sumOK && a > b + margin, 'rules ' + b.toFixed(1) + '% -> network ' + a.toFixed(1) + '%');
  }
}

/* ------------------------------------------------------------------ */
console.log('\nNetwork: the long running suit at no trump');
{
  // The hand that started it: AKQJT65432 of diamonds and three side deuces,
  // 13 cards, no trump, bidding first. Ten tricks are there for the taking.
  const hand = [C(S,2), C(H,2), C(CL,2), C(D,14), C(D,13), C(D,12), C(D,11), C(D,10),
                C(D,6), C(D,5), C(D,4), C(D,3), C(D,2)];
  const R = sim(hand, -1, 13, { iters: 1500, play: 'net' });
  check('the network plays it', R.net === true);
  check('bid 10 makes >= 90%', row(R,'all',10).makePct >= 90, row(R,'all',10).makePct.toFixed(1) + '%');
  check('bid 0 makes >= 90%', row(R,'all',0).makePct >= 90, row(R,'all',0).makePct.toFixed(1) + '%');
  check('bid 12 is impossible', row(R,'all',12).makePct < 1, row(R,'all',12).makePct.toFixed(1) + '%');
}

/* ------------------------------------------------------------------ */
console.log('\nNetwork: twelve spades at no trump  (found by Matt Glassman)');
{
  // Every spade but the 3, and a side deuce; 13 cards, no trump, leading first.
  // Cash as many spades as you bid, then exit with the deuce: bids 2 to 10 are
  // there every time. The second network once played this as if spades were
  // trumps and made bid 3 one time in a hundred. `safety: false` tests the
  // network alone; the default also tries the rules in your seat.
  const hand = [C(D,2)]; for (let r = 2; r <= 14; r++) if (r !== 3) hand.push(C(S,r));
  const alone = sim(hand, -1, 13, { iters: 400, play: 'net', safety: false });
  for (const b of [3, 5, 8]) check('network alone: bid ' + b + ' makes >= 95%', row(alone,'all',b).makePct >= 95, row(alone,'all',b).makePct.toFixed(1) + '%');
  const both = sim(hand, -1, 13, { iters: 400, play: 'net' });
  check('two-way pricing is on by default with a network', both.twoWay === true && alone.twoWay === false);
  for (const b of [2, 6, 10]) check('two-way: bid ' + b + ' makes >= 95%', row(both,'all',b).makePct >= 95, row(both,'all',b).makePct.toFixed(1) + '%');
  check('two-way never scores a bid below the network alone', both.views.all.rows.every((r, i) => r.delta >= alone.views.all.rows[i].delta - 0.3),
        both.views.all.rows.map((r, i) => (r.delta - alone.views.all.rows[i].delta).toFixed(2)).join(' '));
  // the same hand with the long suit in hearts: suits must not matter at no trump
  const hearts = [C(D,2)]; for (let r = 2; r <= 14; r++) if (r !== 3) hearts.push(C(H,r));
  const hh = sim(hearts, -1, 13, { iters: 400, play: 'net', safety: false });
  for (const b of [3, 8]) check('long hearts, network alone: bid ' + b + ' makes >= 95%', row(hh,'all',b).makePct >= 95, row(hh,'all',b).makePct.toFixed(1) + '%');
}

/* ------------------------------------------------------------------ */
console.log('\nNetwork: view arithmetic');
{
  const R = sim([C(S,14), C(S,9), C(S,4), C(H,13), C(H,6), C(D,12), C(CL,3)], S, 7,
                { seat: 2, priorBids: [2,1], iters: 6000, play: 'net' });
  let worst = 0;
  for (const r of R.views.all.rows) {
    const o = row(R,'over',r.bid), u = row(R,'under',r.bid);
    const blend = (o.empty ? 0 : o.share * o.delta) + (u.empty ? 0 : u.share * u.delta);
    worst = Math.max(worst, Math.abs(blend / 100 - r.delta));
  }
  check('subset margins recombine to the overall margin', worst < 0.01, 'max gap ' + worst.toFixed(4));
}

/* ------------------------------------------------------------------ */
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail);
