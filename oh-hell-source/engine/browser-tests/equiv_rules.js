/* When are two cards of one suit the same play? Runs in node:   node equiv_rules.js     (reads ../play_template.html) */
const fs = require('fs'), path = require('path'), t = fs.readFileSync(path.join(__dirname, '..', 'play_template.html'), 'utf8');
const cut = name => { const i = t.indexOf('function ' + name + '('), k = t.indexOf('\n}\n', i) + 3; if (i < 0) throw new Error(name + ' not found'); return t.slice(i, k); };
const suitOf = c => (c / 13) | 0, rankOf = c => c % 13, M = new Function('suitOf', 'rankOf', cut('beatsCard') + cut('equivGroups') + '; return {equivGroups,beatsCard};')(suitOf, rankOf);
const C = s => { const su = 'SHDC'.indexOf(s.slice(-1)), v = { J: 11, Q: 12, K: 13, A: 14 }[s.slice(0, -1)] || +s.slice(0, -1); return su * 13 + v - 2; };
const T = c => ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'][c % 13] + 'SHDC'[suitOf(c)]; let fail = 0;
/* hand: my legal cards; earlier: cards from earlier tricks; trick: the current trick in order; trump: S H D C or - */
function check(name, hand, earlier, trick, trumpCh, turned, want) { const trump = 'SHDC'.indexOf(trumpCh), seen = new Uint8Array(52); earlier.concat(trick).map(C).forEach(c => seen[c] = 1);
  let win = -1; for (const c of trick.map(C)) if (M.beatsCard(c, win, trump)) win = c;
  const g = M.equivGroups(hand.map(C), seen, trick.map(C), turned ? C(turned) : -1, win, trump).map(x => x.map(T).sort().join('=')).sort().join(' | '), w = want.split(' | ').map(x => x.split('=').sort().join('=')).sort().join(' | '), ok = g === w; if (!ok) fail++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + ': ' + g + (ok ? '' : '   (wanted ' + w + ')')); }
check("Matt's hand: 5D led, ace played, holding 8 6 4 2 of trumps", ['8D', '6D', '4D', '2D'], [], ['5D', 'JS', 'AD'], 'D', 'QD', '8D | 6D=4D | 2D');
check("same, before the ace is played: the 6 beats the 5", ['8D', '6D', '4D', '2D'], [], ['5D', 'JS'], 'D', 'QD', '8D | 6D | 4D | 2D');
check("the 5 alone led, holding 6 and 4", ['6D', '4D'], [], ['5D'], 'D', 'QD', '6D | 4D');
check("the 7 winning, holding 6 and 4 with the 5 in the trick", ['6D', '4D'], [], ['7D', '5D'], 'D', 'QD', '6D=4D');
check("holding 8 and 4, the 5 led and the 6 on it: the 8 wins, the 4 does not", ['8D', '4D'], ['7D'], ['5D', '6D'], 'D', 'QD', '8D | 4D');
check("discarding: spades led, a 5 of hearts thrown, holding 6 and 4 of hearts (not trump)", ['6H', '4H'], [], ['KS', '5H'], 'D', 'QD', '6H=4H');
check("ruffing: spades led, ruffed with the 5 of trumps, holding 6 and 4 of trumps", ['6D', '4D'], [], ['KS', '5D'], 'D', 'QD', '6D | 4D');
check("ruffed high: spades led, ruffed with the 9, 5 of trumps also in the trick, holding 6 and 4", ['6D', '4D'], [], ['KS', '5D', '9D'], 'D', 'QD', '6D=4D');
check("the card between was played in an earlier trick (old rule)", ['6D', '4D'], ['5D'], ['2S'], 'D', 'QD', '6D=4D');
check("the card between is the turned card (old rule)", ['6D', '4D'], [], [], 'D', '5D', '6D=4D');
check("the card between is still out", ['6D', '4D'], [], ['AD'], 'D', 'QD', '6D | 4D');
check("no trump: 5 led, king on it, holding 6 and 4 of the suit", ['6D', '4D'], [], ['5D', 'KD'], '-', null, '6D=4D');
check("on lead: nothing in the trick", ['6D', '4D', '3D'], [], [], 'D', 'QD', '6D | 4D=3D');
console.log(fail ? fail + ' FAILED' : 'all passed'); process.exit(fail ? 1 : 0);
