/* When may two suits be treated as mirror images? Only when nothing tells them apart. Runs in node:
   node mirror_rules.js     (reads ../play_template.html) */
const fs = require('fs'), path = require('path'), t = fs.readFileSync(path.join(__dirname, '..', 'play_template.html'), 'utf8');
const i = t.indexOf('function mirrorGroups'), j = t.indexOf('function equivGroups'), k = t.indexOf('\n}\n', j) + 3, suitOf = c => (c / 13) | 0;
const M = new Function('suitOf', t.slice(i, k) + '; return {mirrorGroups,equivGroups};')(suitOf);
const C = s => { const su = 'SHDC'.indexOf(s.slice(-1)), v = { J: 11, Q: 12, K: 13, A: 14 }[s.slice(0, -1)] || +s.slice(0, -1); return su * 13 + v - 2; };
const nv = () => [0, 1, 2, 3, 4].map(() => [false, false, false, false]); let fail = 0;
function check(name, hand, seenCards, voids, trump, turned, joined) { const h = hand.map(C), seen = new Uint8Array(52); seenCards.map(C).forEach(c => seen[c] = 1);
  const g = M.mirrorGroups(M.equivGroups(h, seen, [], C(turned)), h, seen, voids, trump, C(turned)), got = g.length < h.length, ok = got === joined; if (!ok) fail++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + ': ' + (got ? 'joined' : 'kept apart')); }
check("J♠ J♦, nothing played in either suit", ['JS', 'JD'], ['AH', '9H', '6C'], nv(), 3, 'JC', true);
check("two pairs, J♠ 4♠ J♦ 4♦", ['JS', '4S', 'JD', '4D'], [], nv(), 3, 'JC', true);
check("an extra card in one suit, J♠ J♦ 3♦", ['JS', 'JD', '3D'], ['AH'], nv(), 3, 'JC', false);
check("different ranks, J♠ 10♦", ['JS', '10D'], [], nv(), 3, 'JC', false);
check("a diamond has been played", ['JS', 'JD'], ['2D'], nv(), 3, 'JC', false);
check("a spade has been played", ['JS', 'JD'], ['AS'], nv(), 3, 'JC', false);
const v = nv(); v[3][2] = true; check("someone has shown out of diamonds", ['JS', 'JD'], [], v, 3, 'JC', false);
check("one of the two suits is trump", ['JS', 'JD'], [], nv(), 0, '4S', false);
check("the turned card is in one of the suits", ['JS', 'JD'], [], nv(), 2, '4D', false);
console.log(fail ? fail + ' FAILED' : 'all passed'); process.exit(fail ? 1 : 0);
