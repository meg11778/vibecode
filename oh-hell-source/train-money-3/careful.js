/* The careful-teacher test (25 Nov 2026).
 *
 *   node careful.js 100        run for 100 hours (default 8). Safe to stop with Ctrl+C and start again.
 *
 * Same training as overnight.js, with one change: the teacher judges each decision from 200 imagined deals, not 20.
 * With 20 its top pick on a hard decision is close to random (on Matt's overbid 10-card hand a trump lead, the right
 * card, was top about 40% of the time across three touching trumps and the 2♣ 6 to 9%); with 200 the trump is top 65%
 * and the 2♣ never. To keep a generation near an hour on a laptop, only the 7- and 10-card rounds are played, 20,000
 * decisions each. That is a test of the idea, not a network to install: the other round sizes are not practised.
 * When it stops, or at any time, send back net_best.json and gens/log.txt.
 */
const set = (k, v) => { if (process.env[k] == null) process.env[k] = String(v); };
set('SAMPLES', 200); set('ROUNDS', '7,10'); set('RECORDS', 20000);
require('./overnight.js');
