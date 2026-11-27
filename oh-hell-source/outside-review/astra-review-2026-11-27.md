# Oh Hell engine | Independent review and experiment handoff
27 November 2026 · Prepared for the model working with Matt Glassman on the Oh Hell engine

## Where to start

The first question for the book is whether the engine can price a particular play reliably enough to explain it to a reader. A change that barely affects average winnings might reverse the verdict on a published hand. Keep both measures: average dollars per deal for playing strength, and agreement with independently priced alternatives for hand analysis.

**Recommended order:** build an exact reference for tractable endgames, check mistake-report accuracy against it, then isolate the cost of the dealer hook. Keep the installed network as the comparison throughout. Matt requested a review and a handoff. These experiments are reviewer proposals. The only new experiment run during the review was the sampler reproduction below. Match results are from the project's notebook.

[Engine notebook](https://github.com/meg11778/vibecode/blob/main/oh-hell-source/engine/README.md) · [Live play and report implementation](https://github.com/meg11778/vibecode/blob/main/oh-hell-source/engine/play_template.html) · [Training implementation](https://github.com/meg11778/vibecode/tree/main/oh-hell-source/train-money-3). Paths below are relative to `oh-hell-source/`. The original project brief follows the review as an appendix, including prior failed experiments and compute constraints.

## 1. A hidden-card sampler counterexample

**Confirmed in the reviewed source.** Three opponents A, B and C each hold one card. The unseen cards are ♠2, ♥2 and ♦2. A has shown out of diamonds, B out of spades and C out of hearts. There is no undealt pile. Under a uniform deal conditioned on those capacities and voids alone, exactly two layouts are possible. Bid and play likelihoods are intentionally excluded from this test.

| Cards of A, B, C | Exact probability | Training, 100,000 draws | Live reader, 100,000 draws |
|---|---:|---:|---:|
| ♠2, ♥2, ♦2 | 50% | 24,885 | 24,824 |
| ♥2, ♦2, ♠2 | 50% | 75,115 | 75,176 |

The teacher's `train-money-3/rollout.js` calls `determinize` in `br.js`, which greedily deals to the most constrained seats first. The November 17 repair in the live reader starts from a similar assignment and attempts legal two-card swaps. Here, moving between legal layouts requires a three-way exchange. No amount of pair swapping moves the chain off its starting layout. Reversibility alone cannot guarantee convergence from a biased start. Both implementations also contain a fallback that ignores voids after repeated failed attempts. Its frequency on real hands was not measured.

**Reproduction in Node.** Run the following as a CommonJS script from the repository root. It exercises the repository functions in isolation. The extraction markers identify the reviewed versions and may need updating if the source is reorganized. Card IDs 0, 13 and 26 are the three deuces. The acting seat's capacity is unused. This synthetic example tests the prior; it makes no claim about the value of any play.

```js
const fs = require('node:fs');
const vm = require('node:vm');
const base = 'oh-hell-source/';
function section(file, start, end) {
  const source = fs.readFileSync(base + file, 'utf8');
  const first = source.indexOf(start);
  const last = source.indexOf(end, first + start.length);
  if (first < 0 || last < 0) throw Error('Source markers changed: ' + file);
  return source.slice(first, last);
}
const api = { suitOf: card => Math.floor(card / 13), READ: { deal: 'fair' } };
vm.createContext(api);
vm.runInContext(section('train-money-3/br.js', 'function determinize(', '/* Value to'), api);
vm.runInContext(section('engine/play_template.html', 'function dealHidden(', '/* The layouts one decision'), api);
let seed = 12345;
const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const unseen = [0, 13, 26], lens = [1, 1, 1, 1];
const voids = [[0,0,0,0], [0,0,1,0], [1,0,0,0], [0,1,0,0]];
for (const [name, draw] of [
  ['training', () => api.determinize(unseen, lens, voids, 4, 0, rand)],
  ['live', () => api.dealHidden(unseen, lens, voids, 4, rand, 0)]
]) {
  const counts = {};
  for (let i = 0; i < 100000; i++) {
    const key = draw().slice(1).map(hand => hand[0]).join(',');
    counts[key] = (counts[key] || 0) + 1;
  }
  console.log(name, counts);
}
```

**Test on real decisions.** Select saved late positions where the actor has two materially different legal plays. Enumerate all feasible assignments of the unseen cards to hands and stock, counting each distinct allocation once. First compare unweighted seat/card marginals. Then apply the engine's current bid and play likelihoods to the enumerated layouts, normalize, and price each candidate using the same continuation policy. Log void violations, error in the paired dollar gap, card reversals and mistake-verdict reversals. Report how many positions were tractable and their round sizes. Exact enumeration here verifies the sampler under specified beliefs and continuations. It does not establish optimal play against humans. The frequency and dollar impact of the confirmed defect remain open.

## 2. A thin sample can trigger an early stop

**High confidence in the mechanism. Its practical impact is open.** In `readLayouts`, systematic resampling can repeat a high-weight candidate many times. In `readChoose`, the paired standard error uses the number of picks. If all picks have the same payoff difference, the estimated error is zero and the search stops. Thirty copies of one layout can therefore appear decisive. The report uses effective sample size, but its variance can also vanish when all picks agree.

**Test.** On the known trump-ace and zero-discard positions, repeat the live reader with 100 independent seeds. Log unique candidates represented in the picks, effective sample size, why it stopped, chosen card and paired dollar gap. Score each choice against enumeration or an independent high-budget reference. At equal total compute, compare with a reader that requires a second independent candidate pool before settling a close, low-diversity decision. A concentration of wrong picks in low-diversity pools plus lower dollar regret for the alternative would support this explanation. Merely increasing the frequency of the expected play would be weaker evidence.

## 3. Choosing and pricing the best card on the same samples inflates reported mistake costs

**High confidence in the direction of selection bias. Magnitude and verdict error rates are unknown.** The report selects the card with the highest sampled value and subtracts the value of the card actually played, using the same layouts. With five genuinely equal discards, the luckiest estimate tends to win. The displayed dollar advantage can therefore be positive when the true advantage is zero. Pairing and the “level” verdict already help.

**Test.** Use independent batch A to nominate a challenger and batch B to estimate its signed advantage over the played card. Preserve negative validation gaps. Compare both methods with exact endgames, counting false minor and major mistakes by number of legal options. Compare at equal work. For a book example, record the source revision, position, seed, continuation model and fixed work budget. The present clock-based extra sampling can change a report across machines.

## 4. Some of the training teacher's information is unavailable to its student

**High confidence that the mismatch exists. Moderate confidence that it materially contributes to the plateau.** In `train-money-3/table.js`, the generator can perturb bids and hand the teacher the size of the perturbation as seat-specific bid-fitting slack. A wild bid can be ignored completely. The student sees the resulting public bid. It cannot observe the generator's flag. In `selfplay.js`, the rollout teacher also knows which seats are actually using the heuristic. A more precise teacher can still give lessons the deployed student cannot reproduce from its inputs.

**Test before retraining.** Freeze several hundred decisions. Compare the present teacher with one that marginalizes over hidden opponent and bidder types using only public evidence and the acting hand. Start with common candidate deals. Compare preferred cards and measure signed dollar differences on independent continuations. Stratify by perturbation and opponent type, keeping ordinary deals as controls. If the teachers disagree on high-value decisions, try one short run with public-information labels.

**Separate, inexpensive loss-function test.** The acting teacher chooses a winner, but `train.py` trains on a softmax over *all* legal card values. A hard winner-only target is an inaccurate description. Noise can still distort the softmax targets. Existing binary records contain every legal card's estimated value. Train on the same records using the present loss versus regression on each card's value minus the mean legal-card value. Hold out whole deals or generation chunks and score independent dollar regret. If testing the replacement under card reading, refit or check the likelihood temperature because changing the training loss changes the score scale.

## 5. An opening's value can depend on who plays the rest of the hand

**Moderate confidence that continuation policy explains some disputed plays.** On the targeted overbid hand, generation 32 learned to lead trump 72% of the time and earned −$0.09 there versus −$0.77 for the installed network. Across the exam its gain was −$0.008 ± $0.020. The existing weights therefore give a cheap continuation-policy experiment.

**Test.** On that hand, A‑4‑3‑2 and a random control set, force each opening on identical layouts. Compare installed versus generation-32 play in the acting seat on later tricks, fixing all opponents. Then change opponents alone with the acting seat fixed. Use paired differences and independent evaluation. If only the own-seat change reverses the lead ranking, the advice depends on knowing how to follow up. If the opponent change reverses it, identify the opponent behavior responsible. This distinction is worth explaining in the book regardless of aggregate winnings.

## 6. Measure what the hook actually costs the dealer

**High confidence in the diagnostic design. Moderate confidence that the hook explains most of the observed change.** At five players and ten cards, dealer money fell from −$0.08 to −$0.41 as overbid hands rose from 11% to 24%. The dealer's action itself partly determines membership in the overbid group, so that comparison alone cannot identify the cause.

**Test.** Replay paired deals with the old and new policies in the first four seats. At each resulting auction, price every dealer bid, including the forbidden bid as an experimental counterfactual. Select the best unrestricted and legal bids, then estimate their values on independent paired continuations. For each bidding population report unrestricted dealer value, frequency that the hook removes the best bid, average cost when it binds, and average cost across all deals. Keep opponents' pre-dealer behavior fixed within each counterfactual. This measures the immediate price of the restriction at those auctions. A separate experiment would be needed to study how everyone might adapt to a game played permanently without a hook. If unrestricted value stays steady while average hook cost rises by about $0.33, the immediate hook effect explains the observed change. Track made zeros separately: a made zero scores 15 in a ten-card Vienna round.

## 7. Human calibration should test specific card reads

**High confidence that human transfer remains unmeasured. Moderate confidence that recorded human sessions will identify a useful correction.** The notebook's 60% predicted versus 59% observed result concerns whether an opponent holds *a suit*, at four-player bot tables in four- and five-card rounds. A reader can predict suit possession well while mispricing “Does Bagley still hold the king after leading low?”

**Test.** Use complete human deals and hold out entire sessions. At each decision reconstruct only the acting seat's information. Predict who holds the highest outstanding trump, whether a named player can ruff the next lead in a specified suit, and whether a player who ducked holds a higher card in that suit. Compare the current reader with the same model using bids and shown voids while ignoring voluntary card choices. Score against actual holdings, with a probability score such as Brier loss, and report sample counts. If the simpler model wins for particular actions, investigate those likelihoods first. A human-data precedent is Buro et al., [Improving State Evaluation, Inference, and Search in Trick-Based Card Games](https://ijcai.org/Abstract/09/236). For action-based inference in Skat see Rebstock et al., [Policy Based Inference in Trick-Taking Card Games](https://arxiv.org/abs/1905.10911).

## First result to bring back

A table of saved endgames showing exact versus live dollar gaps, the fraction of legal decisions with a reversed recommendation, and any false mistake verdicts would resolve the most consequential open question for the book. Include at least one fully traceable position and separate deliberately difficult cases from a random sample. A real incidence estimate, including a small or zero one, is valuable.

---

## Appendix | Original project brief supplied for review

# Oh Hell toolkit: brief for an outside reviewer

Written 27 November 2026 for a second AI model asked to look over the project for things we have overlooked.
Everything named here is in this repository (`github.com/meg11778/vibecode`). The full lab notebook, with every
measurement and its date, is `oh-hell-source/engine/README.md`; this brief is the map to it.

## What we would like from you

Read the method and the open puzzles below and tell us what looks wrong, wasteful or missing. Most useful:
1. A flaw in how something is measured or modelled (a bias we have not noticed).
2. A reason the card-play training keeps levelling off that we have not considered, and a cheaper way round it.
3. An explanation for any of the open puzzles in the last section.
4. Standard techniques from other imperfect-information trick-taking games (bridge, skat, hearts, spades) that fit
   here and that we are not using.
Please say how confident you are and what test would confirm each idea. We work on a 10-core laptop, with one
20-thread desktop available some nights, so cost matters. Ideas that need a test get tested; nothing is taken on trust.

## The game, as implemented

- Oh Hell, 3 to 6 players, rounds of 1 to 13 cards. Seat left of the dealer bids first and leads. Trump is the suit of
  a turned card, which is out of play. A round dealing the whole deck is no trump.
- Dealer is "hooked": the bids may not add up to the number of tricks.
- Vienna scoring: a made bid scores 10 + tricks; a made zero scores 5 + cards in the round; a missed bid scores the
  tricks taken.
- THE OBJECTIVE IS MONEY, not own points: $1 a point, each player paid their points minus the table average. So a
  trick is worth $1 to whoever takes it, your own made-bid bonus is worth 10 x (P-1)/P dollars, and each opponent you
  bust is worth 10/P dollars. Every bid and play is judged on this.
- Card = suit*13 + (rank-2); suits 0 spades, 1 hearts, 2 diamonds, 3 clubs.

## The two published pages (single HTML files, all computation in the browser)

- `ohhell.html`: bid calculator. Monte Carlo over deals weighted to fit the bids already made; each candidate bid is
  priced by playing the deals out.
- `ohhell-play.html`: play against the bots, with a mistake report for your play, deal set-up, saved hands, and
  (25 Nov) a review of every player's bids and plays.
Built from `oh-hell-source/engine/play_template.html` by `build_play.py`. Tests: `engine/assertions.js` (58 checks)
and `engine/browser-tests/` (Playwright; `t19.js` to `t35.js`, plus rule checks and saved hands in `hands/`).

## How the bots work

1. BID FORMULA (inherited from the original calculator): expected tricks from hand features (`muFor`), scaled by the
   bids ahead (`auctionFactor`), rounded (`bidAt`). Now only a fallback.
2. CARD-PLAY NETWORKS: two small feed-forward networks, 2 hidden layers of 128, 52 outputs (a score per card).
   Network 1 (262 inputs): 4 players with trump, 2 to 12 cards. Network 2 (291 inputs): 4 players no trump, 5 and 6
   players. Inputs are public state plus own hand (`encode.js`). Trained by imitation of a best-response search, then
   self-play with a ONE-STEP ROLLOUT TEACHER: for each legal card, deal the hidden cards some number of times, play
   the rest out with the network, average the money; the network is trained toward a softmax of those values
   (temperature 0.25 points). 3 players and 1-card rounds use hand-written rules.
3. BIDDING NETWORK (`bid-network/bidnet.json`): gives a probability for each bid from hand, seat and bids ahead;
   trained on about a million bids made by the bid simulation.
4. BID SIMULATION (what the bots actually bid with): about 150 sampled deals weighted to fit the bids ahead (by the
   bidding network), seats behind bid by the network, each candidate bid played out with the card-play network,
   best money wins.
5. CARD READING (what the bots actually play with; `readChoose`, `readLayouts` in `play_template.html`): at each
   decision, draw layouts of the hidden cards that fit the bids (accepted with the bidding network's probability),
   weight each by how likely the card-play network would have been to make every opponent's actual plays so far
   (softmax of its scores, sharpness 2, floor 0.02), keep about 30, play every legal card out on each with the plain
   network, pick the best money. When the top two are within 2 standard errors it draws another batch, up to 4.
   Cards that are the same play (touching, or mirror suits) are grouped.
6. MISTAKE REPORT: the same idea with 160 layouts a card, in dollars, with a margin on every figure.

## What has been measured (headline figures; all against our own bots, never against people)

- Card reading over the plain network, one seat: +$0.29 +/-0.04 a deal (25,880 deals).
- Extra batches on close calls: +$0.17 +/-0.03 a deal.
- Simulation bidding over formula bidding: +$0.23 (6 cards) to +$0.67 (10 cards) a hand at four players.
- Bidding network as the simulation's picture of other bidders, over the formula picture: +$0.02 to +$0.42 by size.
- Fitting layouts to the bids only (no fill-up with layouts that ignore the bids): fixed the bots' own sums on
  overbid hands (they were about $1.50 too rosy) but is money-neutral over all deals (-$0.01 +/-0.03).
- Double the layouts per decision: +$0.05 +/-0.03 at twice the time, mostly in rounds of 8+ cards.
- The reading is well calibrated against these bots (said 60%: true 59%; fitted sharpness 1.9 against 2 used).
- One-card rounds are solved exactly for 4 to 6 players (`one-card/`).
- Seat values (`seat-values/`): the dealer is the worst seat at every size; later non-dealer seats do better.
- Rules of thumb tested over many deals: `axioms/README.md` (seven so far). Single hands worked through:
  `hands-to-study/`.

## What has been tried and did NOT work

- Card-play self-play has levelled off in every form tried: longer money-scored runs (a few cents, then flat);
  retraining at tables bid the way today's bots bid (`train-money-3/`, 16 generations: +$0.000 +/-0.019);
  a teacher with ten times the samples (200 a decision, 32 generations: it learned a specific habit it was aimed at,
  opening a trump on an overbid hand 72% against 0%, but money -$0.008 +/-0.020). Parked 26 Nov.
- Distilling the card-reading teacher into a network with 156 extra who-played-what inputs: no gain after ten hours.
- A second bidding network trained on the newer bots' bids: describes them better, no money gain. Not installed.
- The bidding network as the calculator's picture of other bidders: no gain.
- Tighter or exact bid fitting, ten times the layout search budget: no gain.

## Open puzzles (where a fresh eye would help most)

1. WHY DOES CARD-PLAY TRAINING PLATEAU? Our diagnosis: with 20 samples the teacher's top pick is near-random in close
   spots and the target copies each decision's top pick. But fixing that noise taught a habit without winning money.
   Is the network too small, the input encoding missing something, the one-step rollout the limit, the target wrong
   (winner's softmax rather than value regression), or is there simply little left to win against these opponents?
2. THE DEALER'S LOSS IN BIG 5- AND 6-PLAYER ROUNDS grew when the bidding improved (5 players 10 cards: -$0.41 against
   -$0.08; overbid hands 24% against 11%). Unexplained. Untested idea: a table effect of the hook, not anyone's error.
3. THE READING BOT PICKS THE WEAKER OF TWO CLOSE PLAYS too often (takes a clearly right trump ace only 60 to 73%;
   plays its highest losing card 80 to 87% as a zero bidder where the plain network does 95%). We think it is sampling
   noise between plays a few dimes apart. Is there a better estimator than more samples (common random numbers are
   already used; control variates, a prior from the network, sequential halving)?
4. PLAYOUTS CONTINUE WITH THE PLAIN NETWORK, which has known blind spots: never opens a trump on overbid hands with
   side winners, plays a bid of one from the lead badly holding A-4-3-2, leads a small trump into a lone top trump
   while still needing tricks, does not throw high cards after going over. The reading inherits these in every
   imagined continuation.
5. PREDICTABLE BOTS: no deliberate mixing between close plays, so reads of "which card was chosen" are sharper against
   them than they would be against people. Everything is measured against the project's own engines; we have no
   measure of strength against humans and make no claim about it.
6. WEIGHT COLLAPSE late in a hand: few layouts fit both the bids and the play, so late figures are rough.
7. The mistake report is not repeatable figure for figure (a thin read draws extra layouts only when time allows).

## How to check things yourself

- Node only, no dependencies for the engine: `node oh-hell-source/engine/assertions.js ohhell.html` from the root.
- Training code and its exam: `oh-hell-source/train-money-3/` (`README.txt`, `exam.js`, `teacher_check.js`).
- The page's reading code runs in Node through `oh-hell-source/bid-network/bidder-test/arena_node.js`.
- Licence: GPL v3, forked from Jim Agniel's calculator; keep the notices in file headers.
