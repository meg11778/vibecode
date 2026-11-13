/* Money-scored training for both networks, one after the other.
 *
 *   node overnight.js            10 hours: half for each network
 *   node overnight.js 12         a different total
 *
 * Safe to stop (Ctrl+C) and start again with the same command: each network's
 * run picks up at the generation it was on, and the hours already spent on
 * each are remembered (in progress.json).
 *
 * Results: net1/net_best.json and net1/gens/log.txt (four seats with trump),
 *          net2/net_best.json and net2/gens/log.txt (no trump, five and six seats).
 */
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const HOURS = Number(process.argv[2] || 10), STATE = path.join(__dirname, 'progress.json');
const st = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : { net1: 0, net2: 0 };
const save = () => fs.writeFileSync(STATE, JSON.stringify(st));
function phase(name) {
  return new Promise((resolve, reject) => {
    const left = HOURS / 2 - st[name];
    if (left <= 0.05) { console.log(`\n${name}: its ${(HOURS / 2).toFixed(1)} hours are already done`); return resolve(); }
    console.log(`\n===== ${name}: ${left.toFixed(1)} hours =====`);
    const t0 = Date.now(), base = st[name];
    const tick = setInterval(() => { st[name] = base + (Date.now() - t0) / 3600e3; save(); }, 60000);
    const ch = spawn(process.execPath, ['overnight.js', String(left)], { cwd: path.join(__dirname, name), stdio: 'inherit' });
    ch.on('close', code => { clearInterval(tick); st[name] = base + (Date.now() - t0) / 3600e3; save(); code === 0 ? resolve() : reject(new Error(name + ' stopped with an error')); });
  });
}
(async () => { await phase('net1'); await phase('net2'); console.log('\nBoth runs finished. Send net1/net_best.json, net1/gens/log.txt, net2/net_best.json and net2/gens/log.txt.'); })()
  .catch(e => { console.error(e.message); process.exit(1); });
