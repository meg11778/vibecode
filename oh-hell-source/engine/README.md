# Oh Hell play engine

A neural network that plays the cards in Oh Hell. Four seats, Vienna scoring,
trump rounds of 2 to 12 cards. It was trained first by imitating a
best-response search (rounds 2 to 7), then by self-play (rounds 2 to 12), and
it now plays the simulated deals inside `ohhell.html`. Bidding by the simulated
opponents still comes from the calculator's own bid model.

## Two networks

`net_best.json` (262 inputs) plays four seats with a trump suit, 2 to 12 cards.
`net2_best.json` (291 inputs, trained in `../ohhell-engine-2`) plays four seats
at no trump (2 to 13 cards), five seats (2 to 10) and six seats (2 to 8), with
or without trump. A trial of one network for everything cost 0.15 to 0.25
points a round at four seats with trump, and the second network is 0.1 to 0.5
worse than the first there, so each game goes to the network trained for it
(`netFor` in the calculator's engine). Three seats and one-card rounds are
played by the rules.

Second network against the rules engine in the same seat, generation 8 of its
run (2,500 deals per table; improvement over the previous generation was
+0.77, +0.10, +0.04, +0.04, then about zero):

| table | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 4 seats, no trump | +0.22 | +0.49 | +0.63 | +0.92 | +1.24 | +1.49 | +1.39 | +1.74 | +1.78 | +1.97 | +1.79 | +1.72 |
| 5 seats | +0.18 | +0.24 | +0.37 | +0.53 | +0.76 | +1.13 | +1.13 | +1.52 | +1.74 | | | |
| 6 seats | +0.13 | +0.26 | +0.30 | +0.48 | +0.72 | +0.95 | +1.06 | | | | | |

## The twelve-spade hand, and what it changed

Matt Glassman entered every spade but the 3 plus a side deuce, 13 cards, no
trump, and the calculator (network playing) said bid 3 made 1% of the time. The
same hand in diamonds or clubs was fine. Cause: in the second network's input,
suit slot 0 is where trump sits in every trump deal, training shuffled only
slots 1 to 3, and at no trump spades were left in slot 0, so a very long spade
suit was played as if it were trumps. Ordinary deals are unaffected; it shows
from about eight spades and is severe at ten or more (`node freak.js 4 13 0 600`
and `../ohhell-engine-2/ntmap_test2.js`).

Two changes:

- `ntMap`: at no trump a player holding six or more spades has the suits
  relabelled with its shortest suit in slot 0. Long-spade hands recover
  (twelve spades: bids 2 to 10 make 99-100%) and ordinary no-trump deals are
  unchanged (-0.02 +/-0.03 points a round at 13 cards). The reference encoder in
  `../ohhell-engine-2/encode.js` does the same. Retraining with all four suits
  shuffled at no trump would make it unnecessary.
- Two-way pricing in the calculator: every candidate bid is played out with the
  network in the advised seat and again with the rules there (network
  elsewhere), and the better is reported. On ordinary hands it changes only
  hopeless rows; it is there for hands and bids the networks never practised.
  It costs about 1.75 times the playouts, so "Auto" now stops at 2,500
  effective deals.

Still true: the networks trained only at tables where each seat bid what the
bid model would bid on its hand, so play at bids far from a hand's worth, and
on freak distributions (ten-card suits and up), is weak. `freak.js` shows the
network level with or below the rules from a ten-card suit at no trump and an
eleven-card suit with trump.

## Robustness run (11 November 2026)

`net2_best.json` is now generation 11 of a third run (`../ohhell-engine-3`),
started from the previous network (kept as `net2_gen8.json`). Changes: at no
trump training shuffles all four suits (24 ways); on 40% of deals seats bid one
to three tricks off the bid model; on 15% one seat is dealt a long suit and
half the time bids anything. New against old, same seat and deals, 3,000 deals
(`../ohhell-engine-3/cmp.js`; hard = every deal off-bid, half with a long suit):

| table | ordinary deals | hard deals |
|---|---|---|
| 4 seats, 13 cards, no trump | -0.01 +/-0.18 | +0.38 +/-0.16 |
| 4 seats, 8 cards, no trump | -0.07 +/-0.12 | +0.05 +/-0.10 |
| 5 seats, 10 cards | +0.01 +/-0.14 | +0.07 +/-0.13 |
| 5 seats, 6 cards | +0.01 +/-0.09 | +0.02 +/-0.07 |
| 6 seats, 8 cards | -0.12 +/-0.12 | +0.01 +/-0.11 |

So: a clear gain on hard 13-card no-trump deals, nothing measurable elsewhere.
A seat holding a long suit at 13-card no trump, points for that seat with the
rules / old network / new network playing it (`../ohhell-engine-3/freak3.js`,
500 deals, spades, suits not relabelled):

| suit length | formula bid | any bid |
|---|---|---|
| 8 | 9.9 / 10.8 / 11.1 | 6.6 / 6.7 / 7.7 |
| 10 | 9.4 / 8.7 / 9.9 | 7.4 / 5.7 / 7.1 |
| 12 | 7.2 / 3.9 / 7.1 | 8.1 / 5.1 / 7.7 |

The spade fault is gone without `ntMap` (which stays, harmlessly). From an
eleven-card suit the network is level with the rules, not better, and at
"any bid" slightly behind, so two-way pricing stays in the calculator.
Twelve spades and a side deuce, network alone: bids 0 to 9 make 99-100%,
10 97%, 11 79%, 12 57%, 13 39%. Bids 12 and 13 are a guess about whether the
opponents throw all their hearts, so the two add to about 100%.

## Card reading (12-13 November 2026)

**The teacher.** `oh-hell-source/card-reading-test/reader.js` values each card
by playouts, like the rollout teacher, after weighting its imagined layouts of
the hidden cards by how likely the network would have been to make each
opponent's actual plays. One seat against three copies of the network, four
seats with trump, 30 playouts a card:

| scored in | cards | deals | reader over network | plain teacher over network |
|---|---|---|---|---|
| points | 8 | 5,400 | +0.15 +/-0.13 | -0.09 +/-0.13 |
| points | 11 | 2,160 | +0.30 +/-0.25 | -0.22 +/-0.25 |
| money | 6 | 8,000 | +0.18 +/-0.08 | -0.01 +/-0.08 |
| money | 10 | 1,800 | +0.27 +/-0.24 | +0.00 +/-0.22 |

**Distilling it into the network did not work.** A ten-hour run
(`train-network-1-reading`: 156 new inputs for who played what, this teacher,
money scoring, 8 generations) gave a network that was not measurably better
than the one it started from: new against old in one seat among old networks,
in money, +0.02 +/-0.04 (4 cards), -0.03 +/-0.07 (6), +0.05 +/-0.10 (8),
+0.01 +/-0.13 (10), +0.02 +/-0.17 (12), and -0.11 +/-0.08 on hard 8-card
deals. It did play more as a spoiler: a table of four of them makes 4 to 7
points fewer contracts than a table of the old network. Not installed; the
network is kept as `net_g8_reading_418.json`.

**So the game's bots use the teacher directly** (`readChoose` in
`play_template.html`; setting "Bot card play"). In the page, reading seat
against the network, 6 cards, formula bidders: +0.182 +/-0.069 with layouts
kept only when the formula makes exactly each bid (11,000 deals; test-only
setting, it reproduces the reference), +0.101 +/-0.055 with layouts kept in
proportion to each bid's likelihood (17,000 deals; what the game uses, since
its bots bid by simulation and the player bids freely). At 10 cards the looser
version scored +0.15 +/-0.26 (1,500 deals). A first version that weighed bids
and plays together, without drawing layouts to fit the bids first, scored
-0.08 +/-0.06: nearly all the weight fell on a handful of layouts. About 50 to
260 ms a decision in Chromium.

**A seat that has gone over its bid** (`bustStudy`; 3,000 deals, 8 cards,
network in every seat, the reading choice asked in the same positions). Spare
tricks = tricks left less the tricks needed by seats that can still make.

| seat | choice | n | network | reading |
|---|---|---|---|---|
| over, spare tricks remain | leads a boss card when it holds a non-boss | 93 | 94% | 25% |
| over, spare tricks remain | takes the lead in the trick when it could play under | 20 | 100% | 80% |
| over, spare tricks remain | cannot win: throws its highest card | 147 | 20% | 26% |
| over, no spare tricks | leads a boss card | 150 | 89% | 40% |
| over, no spare tricks | takes when it could play under | 37 | 97% | 54% |
| has exactly its bid | cannot win: throws its highest card | 803 | 75% | 42% |

Reading stops most of the cashing of winners that the money scoring makes
wrong. It does not make a busted seat discard like a seat protecting its bid,
and with no spare tricks it looks too reluctant to take. Both follow from the
playouts continuing with the network, which was trained on own points.

## Robustness run for the first network (12 November 2026)

`net_best.json` is now generation 13 of a run in `../ohhell-engine-4`, started
from generation 20 of the first run (kept as `net_gen20.json`): 40% of deals
with off-model bids, 15% with a long suit. New against old, same seat and
deals (`../ohhell-engine-4/cmp.js`; hard = every deal off-bid, half with a long
suit; long = every deal off-bid with a long suit):

| cards | ordinary (5,000) | hard (5,000) | long (4,000) |
|---|---|---|---|
| 5 | -0.04 +/-0.06 | +0.07 +/-0.05 | |
| 8 | -0.05 +/-0.10 | -0.03 +/-0.08 | +0.07 +/-0.07 |
| 10 | -0.03 +/-0.12 | +0.06 +/-0.10 | +0.12 +/-0.09 |
| 12 | +0.06 +/-0.13 | +0.09 +/-0.11 | +0.17 +/-0.10 |

A small gain on long-suit deals, nothing measurable on ordinary ones. The
tables below describe generation 20; the new network is within noise of them.

## Where the first network stands

`net_best.json` is generation 20 of an eight-hour self-play run. Against the
calculator's rules engine in the same seat, same deals and bids (last five
generations averaged, 4,000 deals each):

| cards | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| gain | +0.18 | +0.35 | +0.58 | +0.82 | +1.04 | +1.34 | +1.53 | +1.77 | +2.05 | +2.29 | +2.48 |

Improvement over the previous generation was +0.10, +0.07, +0.06, +0.03, +0.02
for generations 1 to 5 and indistinguishable from zero (each +/-0.025) for
generations 6 to 20.

It also beats the rules engine when its bid is shifted one or two tricks off
what the bid model would choose (`node probe.js`), which the calculator relies
on to price every candidate bid.

## Why self-play stopped improving

The self-play teacher values each card by playing the hand out with the network
(`rollout.js`). Put in one seat against the network alone, same deals and bids
(`node probe.js rollout:net_best.json net_best.json net_best.json <n> <deals> <seed> 0 <playouts>`):

| cards | 20 playouts per card | 100 playouts per card |
|---|---|---|
| 6  | -0.25 +/-0.15 | +0.03 +/-0.13 |
| 9  |               | -0.07 +/-0.23 |
| 10 | -0.26 +/-0.26 |               |
| 12 | +0.10 +/-0.28 |               |

The teacher is no better than the network at either setting, so one-card
lookahead has nothing left to teach it. More generations, a larger network or
more playouts will not move it; a different kind of teacher (deeper search, or
sampling hidden hands from how opponents have played) might.

## Bidding by simulation

`simbid_block.js` chooses a bid by playing candidate bids out with the network
on 150 deals sampled to fit the bids already made (about 0.06 s at 3 cards,
0.5 s at 12). `node simbid.js <n> <deals> <seed>` plays each deal twice, one
seat bidding once from the bid formula and once by simulation, everyone else
bidding from the formula and the network playing every card:

| cards | simulation minus formula | contracts made | bid changed |
|---|---|---|---|
| 3  | +0.13 +/-0.08 | 66.6% -> 69.0% | 14% of hands |
| 5  | +0.29 +/-0.12 | 61.9% -> 65.6% | 30% |
| 7  | +0.46 +/-0.15 | 61.6% -> 65.8% | 39% |
| 9  | +0.72 +/-0.20 | 61.3% -> 66.5% | 46% |
| 10 | +0.68 +/-0.22 | 60.9% -> 65.3% | 49% |
| 12 | +0.65 +/-0.20 | 63.6% -> 68.1% | 53% |

About three changed bids in four are to a lower bid. The bots in
`ohhell-play.html` bid this way.

## Studying hands in the game

`ohhell-play.html` (built by `build_play.py` from `play_template.html`):

- Assessment. After a hand, each of the player's choices is valued by playing
  every legal card out 160 times with the network in every seat, on layouts of
  the hidden cards drawn to fit the bids (weighted by bid likelihood), the
  cards played and shown voids. Cost under 0.25 points is fine, up to 1 minor,
  over 1 major, and a gap within twice its standard error is "too close to
  call". About 1 s for a 7-card hand, 6 s for 13 cards. Fed the network's own
  plays it faults roughly one decision in nine (69 decisions: 59 fine, 2 too
  close, 3 minor, 5 major), so a flag is an opinion, not a proof.
- Setting up a hand. The player picks cards, place in the bidding, trump, and
  optionally any bids and the opening lead. Other hands are dealt by rejection:
  a seat with a set bid must make exactly that bid by the bid formula, and the
  leader must hold the set lead and the play engine must choose it (or an
  equivalent card). Up to 60,000 layouts or 4 seconds.
- Any reviewed hand can be played again, with the same cards or with the same
  seat and hand against new opponents.

### 150 or 500 sampled deals for a bot's bid

`node simbid2.js <n> <deals> <seed> 150 500`: same deals, the test seat bids
once from 150 sampled deals and once from 500; scored in money (points less
the table's average). 12 November 2026:

| cards | deals | 500 over 150, dollars a hand | bids differ | seconds per bid, 150 / 500 |
|---|---|---|---|---|
| 6 | 4,800 | +0.049 +/-0.061 | 12% | 0.17 / 0.56 |
| 10 | 2,100 | +0.017 +/-0.117 | 19% | 0.38 / 1.24 |

No measurable gain, three times the wait: the bots stay at 150. (In money the
formula scored -0.03 and +0.09 a hand on these deals and the 150-deal
simulation +0.23 and +0.67.) The figures shown for the player's own bid use
600, since they are worked out once after the hand.

## In the calculator

`node embed.js net_best.json > netdata.js` and
`node embed.js net2_best.json NET2 > netdata2.js` pack the weights (16-bit,
base64, about 160 KB each); `netblock.js` is the in-page player for both. All
three sit inside the engine section of `ohhell.html`. `node equiv.js` checks
the in-page player against the reference implementations: 98.6% to 100% of
deals end identically, the rest differing through 16-bit rounding on
near-ties. `node assertions.js ohhell.html` runs the calculator's test suite,
58 checks, rules and both networks.

## First network: imitation, rounds 2 to 7

Paired test against the calculator's heuristic: same deals, same bids, the
network swapped into two seats. Gain is Vienna points per round over what the
heuristic scored in the same seats. 20,000 deals per round size.

| cards | gain  | contracts made |
|-------|-------|----------------|
| 2     | +0.16 | 70% -> 72%     |
| 3     | +0.24 | 65% -> 68%     |
| 4     | +0.32 | 62% -> 65%     |
| 5     | +0.49 | 59% -> 64%     |
| 6     | +0.76 | 56% -> 64%     |
| 7     | +0.94 | 54% -> 63%     |

The network matches its teacher within noise and plays a deal in about
0.3 milliseconds; the teacher needs about 200 at seven cards.

## Checks on the network

Single seat, paired, same deals and bids (`node check.js table`, `node check.js exploit ...`).

| cards | net over heuristic, other 3 seats heuristic | net over heuristic, other 3 seats net | best-response search over the net, at a table of nets | same search over the heuristic, at a table of heuristics |
|---|---|---|---|---|
| 2 | +0.21 | +0.14 | +0.04 | +0.21 |
| 3 | +0.35 | +0.21 | +0.06 | +0.42 |
| 4 | +0.52 | +0.55 | +0.15 | +0.74 |
| 5 | +0.71 | +0.70 | -0.08 | +0.84 |
| 6 | +0.95 | +0.86 | +0.02 | +1.20 |
| 7 | +1.12 | +0.95 | -0.06 | +1.46 |

The last two columns are a lower bound on how exploitable each player is: they
show what this particular search can take, not what the best possible opponent
could. At six and seven cards the network column is good to about +/-0.3 and
+/-0.5.

## Self-play

    node overnight.js          # 8 hours; Ctrl+C to stop, run again to resume

Each generation plays rounds of 2 to 12 cards with rollouts from the current
network, trains a new network on the values, and keeps it only if it is not
worse on fresh deals. Progress is in `gens/log.txt`; the best network so far is
`net_best.json`. Needs Node.js and Python with NumPy.

Two short generations run while building this (8,000 decisions per round size):

| cards | generation 1 over heuristic | generation 2 over heuristic | generation 2 over generation 1 |
|---|---|---|---|
| 2-7  | +0.19 to +1.20 | +0.13 to +1.19 | about 0 |
| 8    | +1.41 | +1.32 | +0.14 |
| 9    | +1.40 | +1.48 | +0.16 |
| 10   | +1.67 | +1.66 | +0.36 |
| 11   | +1.67 | +1.94 | +0.30 |
| 12   | +1.76 | +1.98 | +0.33 |

`net_weights.json` is where a new run starts; it is currently a copy of
`net_best.json`. `net_imitation.json` is the first network. The 13-card
no-trump round and other table sizes are not covered.

## Files

| file | what it is |
|------|------------|
| `engine.js` | rules and heuristic, extracted verbatim from `ohhell.html` |
| `table.js` | dealing, bidding and the trick loop, one policy per seat |
| `br.js` | best-response search with inference from the auction (the teacher) |
| `encode.js` | what a seat can see -> 262 network inputs |
| `gen.js` | plays the teacher and writes training data |
| `train.py` | trains the network (NumPy only) |
| `net.js` | runs the trained network in plain JavaScript |
| `net_best.json` | network 1: four seats with trump, rounds 2-12 |
| `net2_best.json` | network 2: four seats no trump, five and six seats |
| `net_weights.json` | starting point for the next self-play run (a copy of `net_best.json`) |
| `net_imitation.json` | the first network, trained on the best-response teacher |
| `evaluate.js` | the paired head-to-head test |
| `check.js` | net-among-nets test and the exploitability probe |
| `rollout.js` | values a card by playing the hand out on sampled deals |
| `selfplay.js` | plays one batch of self-play deals and records the values |
| `arena.js` | paired single-seat match between any two players |
| `overnight.js` | the self-play loop: play, train, test, repeat |
| `probe.js` | paired test with the seat's bid shifted, or with the rollout teacher in the seat |
| `embed.js`, `netblock.js` | pack the weights and play them inside `ohhell.html` |
| `equiv.js` | checks the in-page network against `net.js` |
| `assertions.js` | the calculator's test suite |
| `ohhell.html` | the calculator with the network built in |
| `simbid_block.js`, `simbid.js` | bidding by simulation, and its test against the formula |
| `freak.js` | network against rules for a seat holding a long suit, at and away from the formula bid |
| `ohhell-play.html` | play against three to five bots; built by `build_play.py` from `play_template.html` and the calculator's engine section |

## Reproduce

    node gen.js 7 3260 107 40 data/n7.bin     # one per round size, ~13 min in all
    OUT=net_imitation.json python3 train.py 40   # ~1 min
    node evaluate.js net net_imitation.json   # the table above
    node evaluate.js br 30                    # the teacher, for comparison

`engine.js` is rebuilt from the HTML, never edited: take the lines between the
`===== cards:` and `===== UI =====` markers and append the `module.exports` line.

## Limits

- Every opponent in training and in every test is one of this project's own
  engines, bidding from the calculator's model. Nothing here measures the
  network against people.
- Four to six seats. The calculator falls back to the rules engine for three
  seats and one-card rounds.
- It plays cards. It does not bid; the calculator prices each bid by playing it
  out with the network in every seat.

## 13 November 2026 (evening): card reading at other tables, bid fit, report margins

All figures are dollars per deal for one card-reading seat against the network alone on the same deals, 95% error bars. Measured in the page (`readArena`, `readArena2`), never against people.

**Other tables, opponents bidding by formula** (`readArena`, soft bid fit)

| Table | Deals | Reading over network |
|---|---|---|
| 5 players, 6 cards | 9,900 | +0.05 ± 0.07 |
| 6 players, 5 cards | 9,900 | +0.04 ± 0.05 |
| 5 players, 9 cards | 2,700 | −0.05 ± 0.17 |
| 4 players, 13 cards, no trump | 1,620 | +1.22 ± 0.25 |

The no-trump gain is not yet split between reading the cards and simply playing each choice out (200 deals gave ±0.73, no answer).

**Bid fit with every seat bidding by simulation** (`readArena2`, 6 cards)

| Setting | 4 players (2,100 deals) | 5 players (1,120 deals) |
|---|---|---|
| current (soft) | +0.02 ± 0.15 | +0.06 ± 0.20 |
| soft, only layouts that fit (`strict`) | +0.04 ± 0.16 | −0.03 ± 0.21 |
| twice as tight (`sig:0.5`) | −0.04 ± 0.16 | −0.04 ± 0.22 |
| exact formula bid | −0.15 ± 0.16 | −0.28 ± 0.23 |
| bids only (`noPlay`) | −0.10 ± 0.15 | +0.06 ± 0.21 |

Nothing beats the current setting; the exact fit is worse at 5 players (−0.35 ± 0.23 paired). Simulation bids differ from the formula on about a third of bids. The layout search runs out of tries on about 60% of decisions at 4 players and 80% at 5, then tops up with layouts that ignore the bids. The live game is unchanged. The gain from reading against simulation bidders is not resolved at this sample size.

**Report.** "Worth" levels were being read from trick to trick, which they do not support: each trick draws its own layouts, and late in a hand the weight can sit on about ten of them (Matt's 5-player 8-card hand, tricks 5 and 6: the level swung between −0.4 and +1.9 from run to run while the ranking held). The report (assessment version 4) now shows a ± margin on each level using the effective number of layouts, marks a decision "rough" below 30, draws up to four times the candidates when that happens (capped at about 1.5 s a decision), and adds "as the cards lay": the result on the actual deal if every seat plays on as the bots do after each card played. Both of Matt's hands are in `browser-tests/` (`t19.js`).

## 13 November 2026 (late): reading against simulation bidders, and the no-trump split

Same method (`readArena2`, one card-reading seat against the network on the same deals, dollars per deal, 95% error bars). "Bids only" (`noPlay`) still draws layouts to fit the bids and plays every choice out, but ignores what the opponents have played.

| Table | Deals | Reading over network | Bids only over network | Reading over bids only (paired) |
|---|---|---|---|---|
| 4 players, 6 cards, every seat bidding by simulation | 6,600 | +0.12 ± 0.09 | −0.10 ± 0.09 | +0.22 ± 0.08 |
| 4 players, 13 cards, no trump, formula bids | 2,200 | +1.03 ± 0.22 | +0.51 ± 0.22 | +0.52 ± 0.21 |

So the gain against simulation bidders is real at 4 players and 6 cards (about 12 cents a deal), and it comes from weighing layouts by the opponents' plays: playing out on bid-fitted layouts alone is, if anything, slightly worse than the network. At 13 cards with no trump about half the gain comes from playing each choice out and half from reading the play. The layout search ran out of tries on about 60% of decisions in both. Not measured: 5 and 6 players with simulation bidders at this sample size.

## 14 November 2026: money-scored run of both networks; network 1 replaced

Training: `train-money` (the existing 262- and 291-input networks trained on, every position scored in dollars: $1 a point, each seat paid its points less the table average), five hours each on Matt's laptop. Network 1 ran 5 generations, network 2 ran 6; every generation was accepted, each within a cent or two of the one before, so the logs alone did not settle it. Final against start, one seat swapped, same deals and bids (`arena.js`, dollars a deal, 95%):

| Network | Deals | Other seats | Ordinary deals | Hard deals (off-model bids, long suits) |
|---|---|---|---|---|
| 1 (4 players, trump, 2 to 12 cards) | 330,000 each | previous network | +0.058 ± 0.010 | +0.022 ± 0.009 |
| 1 | 330,000 each | new network | +0.082 ± 0.011 | +0.046 ± 0.009 |
| 2, 4 players no trump (2 to 13) | 180,000 each | previous network | +0.028 ± 0.014 | +0.007 ± 0.011 |
| 2, 5 players (2 to 10) | 135,000 each | previous network | +0.020 ± 0.014 | −0.007 ± 0.011 |
| 2, 6 players (2 to 8) | 105,000 each | previous network | +0.006 ± 0.012 | +0.009 ± 0.010 |

Network 1's gain grows with the round: about 3 cents at 2 cards, 6 at 4 to 9, 8 at 10 to 12. It makes its own bid about half a percentage point less often than the previous network in the same seat; a whole table of it makes 58% of contracts at 7 cards where the previous network's table made 67% (rules 55%). It passes every fixed hand in `assertions.js`.

Network 2 was **not installed**: the gain is one to three cents, and it fails the twelve-spades no-trump hand (bid 3 made 36.5%, bid 5 90.5%, long hearts bid 3 45.5%; the installed network makes each at least 95%).

**A seat that has gone over its bid, with the money network** (`bustStudy`, 3,000 deals, 8 cards, the money network in every seat; compare the table of 13 November):

| seat | choice | n | network | reading |
|---|---|---|---|---|
| over, spare tricks remain | leads a boss card when it holds a non-boss | 117 | 52% (was 94%) | 32% (was 25%) |
| over, spare tricks remain | takes the lead in the trick when it could play under | 32 | 81% | 47% |
| over, spare tricks remain | cannot win: throws its highest card | 304 | 17% | 25% |
| over, no spare tricks | leads a boss card | 184 | 68% (was 89%) | 47% (was 40%) |
| over, no spare tricks | takes when it could play under | 63 | 90% | 76% (was 54%) |
| has exactly its bid | cannot win: throws its highest card | 680 | 74% | 42% |

So the network itself now cashes winners far less after going over, and reading with it is less reluctant to take when a trick must break someone. Discarding high cards after going over has not moved.

**Card reading with the new network 1** (in the page, 4 players, 6 cards, formula bids, 4,200 deals per row; old and new weights in one test page):

| Other seats | new net − old net | reading(old) − old net | reading(new) − new net | reading(new) − reading(old) |
|---|---|---|---|---|
| previous network | +0.08 ± 0.08 | +0.10 ± 0.11 | −0.05 ± 0.11 | −0.07 ± 0.10 |
| new network | +0.02 ± 0.08 | +0.03 ± 0.11 | +0.06 ± 0.11 | +0.05 ± 0.11 |

Reading with the new network is not measurably different from reading with the old one (combined about −0.01 ± 0.07). The pattern, each reading doing better against the network it assumes, is suggestive but inside the error bars. Not measured: reading bots against reading bots, simulation bidding with the new network, and the calculator's bid ranking with it.

Installed: `net_best.json` is the money network (previous kept as `net_gen13_points.json`); `netdata.js`, `ohhell.html`, `ohhell-play.html` rebuilt. The "weights intact" check now asks only that a network table makes more contracts than a rules table (58.2% against 55.0%).

## 14 November 2026 (later): equal results in card reading go to the network's choice

Found by Matt: 5 players, 3 cards, trump hearts. West bid 1 against four zero bids, won trick 1 with the J♠, then led the A♠ holding A♠ and 7♥. The ace cannot lose the trick; the low trump can. On 8,000 layouts the trump lead is worth $0.14 more (West makes 1.9% against 0%; the layouts give a zero bidder a higher trump only 2.8% of the time). With the game's 30 layouts usually none held a higher trump, both leads came out exactly equal, and the equal result went to whichever card came first in card order: the ace, 63 times in 100. `readChoose` now gives equal results to the card the network prefers (`READ.tieNet`, on). The hand is `browser-tests/t22.js` (trump led 100 of 100; 37 of 100 before). New against old on the same deals: +0.002 ± 0.010 (5 players, 3 cards, 4,800 deals), +0.013 ± 0.039 (4 players, 6 cards, 1,000 deals), so no measurable change in results overall.

Also from Matt's hands today (`t21.js`): bid 0 on lead with 2♠ 2♥ and one diamond, 5 players, 3 cards, bids two under. Zero made when leading the diamond / a deuce, 6,000 to 12,000 layouts: 6♦ 97.0 / 95.6%, 7♦ 95.0 / 93.3, 8♦ 92.5 / 90.9, 9♦ 86.3 / 87.5, 10♦ 83.6 / 84.7, J♦ 75.6 / 81.2, A♦ 52.3 / 71.1. The middle diamond is best led at once up to the 8; from the 9 up a deuce is better. `t20.js` checks that "as the cards lay" ends at the actual result.

## 14 November 2026 (midday): more layouts when playouts are short; a Precision setting

`readChoose` played 30 layouts for every decision. It now holds the work (layouts x choices x cards still to be played) near `READ.budget` = 2880, so 30 stays the count when many cards are left and it rises to at most `READ.kMax` = 300 when few are (Matt's West hand, two cards each at five players: 144). The 360 candidates drawn and weighed are unchanged, so there is no extra reading. New against fixed 30 on the same deals, each over the network: +0.015 ± 0.026 (5 players, 3 cards, 13,500 deals), +0.013 ± 0.085 (4 players, 6 cards, 2,700 deals): no measurable difference in results. Time per decision in Chromium, fixed / adaptive: 124 / 128 ms (4 players, 8 cards), 212 / 210 (4 players, 12), 41 / 51 (5 players, 3), 185 / 192 (6 players, 8).

Precision setting (`READ.prec`: Normal 1, High 4, Very high 10; remembered in the browser): multiplies the candidates and layouts of the bots' card reading and the layouts of the report (160, 640, 1,600 per decision). A report made at a lower setting offers "Assess again at the current Precision". At High a bot's decision took 190 to 930 ms in the same timings. Not measured: whether High or Very high plays better. Tests: `browser-tests/t23.js`.

One-card rounds solved for 4, 5 and 6 players: see `../one-card`.

## 14 November 2026 (afternoon): seat values, and the formula's dealer

`../seat-values` (script, data, chart): every seat's average result at every round size, 4 to 6 players, 120,000 deals a square, formula bids, network card play. The dealer is the worst seat everywhere (4 players: -2.15 at 1 card, about -0.35 at 7 to 8, -0.69 at 12), the first seat the best from about 6 cards up, and in the big rounds each later seat does worse than the one before. At one card the bots are within about 0.1 of the solved game (`../one-card`).

The dealer result is largely the bid formula's doing. `auctionFactor` scales a later bidder's estimate by the tricks left over: at 4 players and 10 cards the dealer's average bid is 2.67 against 2.26 for the first seat, and it makes 50%. One seat changed, same deals, seats ahead bidding by formula (`../seat-values/dealer.js`):

| Table | Deals | Dealer, formula | Dealer, no adjustment for bids ahead | Dealer, simulation bid |
|---|---|---|---|---|
| 4 players, 10 cards | 1,200 | -0.46 ± 0.27 | -0.12 (+0.33 ± 0.23 over formula) | +0.20 (+0.66 ± 0.24) |
| 5 players, 10 cards | 700 | -0.68 ± 0.37 | -0.31 (+0.37 ± 0.26) | +0.08 (+0.76 ± 0.30) |
| 4 players, 6 cards | 1,500 | -0.32 ± 0.23 | -0.30 (+0.02 ± 0.17) | +0.12 (+0.44 ± 0.16) |
| 5 players, 6 cards | 1,200 | -0.60 ± 0.26 | -0.57 (+0.03 ± 0.16) | -0.20 (+0.40 ± 0.17) |

With the adjustment halved or removed in every seat at 4 players and 10 cards (30,000 deals): seats +0.45 / +0.01 / 0.00 / -0.46 as it is, +0.32 / -0.05 / -0.02 / -0.25 halved, +0.26 / -0.10 / -0.01 / -0.16 removed. Not yet done: every seat bidding by simulation (`../seat-values-overnight`, running on Matt's laptop), and any change to the formula itself, which is also the opponent model in the calculator, the bid simulation and the card reading.

## 14 November 2026: Jim Agniel's current bid tables against the fork's

Jim's current `ohhell.html` (agniel/vibecode, last changed 26 September 2026) and the fork use the same 13 hand features, the same bid rule and the identical `auctionFactor`. They differ in the coefficient tables (the fork's were refitted in September 2026 to its own card play, 40,000 hands a round size; Jim's are fitted to about 310,000 hands under his play policy) and in the fork's handling of the turned card. One seat bidding from Jim's tables instead of the fork's, same deals, every card played by the fork's networks, 40,000 deals each, dollars a deal:

4 players: 2 cards -0.00 ± 0.01, 3 -0.03 ± 0.01, 4 -0.05 ± 0.01, 5 -0.10 ± 0.02, 6 -0.16 ± 0.02, 7 -0.18 ± 0.03, 8 -0.15 ± 0.03, 10 -0.15 ± 0.04. 5 players: 3 cards -0.01 ± 0.01, 6 -0.12 ± 0.02, 10 -0.36 ± 0.04. 6 players: 4 cards -0.02 ± 0.01, 8 -0.20 ± 0.03.

Jim's tables bid higher (2.60 against 2.43 a hand at 4 players and 10 cards) and differ from the fork's on 2% to 34% of hands. This judges his tables with the fork's card play, which they were not fitted to; it says nothing about his calculator with his own play policy. Script: `../seat-values/jim_cmp.js` (needs a clone of agniel/vibecode).

## 14 November 2026: the report gives Worth at every trick

Matt's choice for the whole-hand view: keep "As the cards lay" and make Worth readable from trick to trick. Assessment version 5: every card of yours is played out, including tricks with one legal card, equivalent cards or a card set in the setup (greyed rows now carry Worth ± margin). The note under the table says what each column answers (Cost: was this the right card; Worth: how was I doing on what I could know; As the cards lay: what actually decided the hand) and points to the Precision setting for comparing Worth across tricks.

Spread of Worth over five repeat reports (standard deviation, dollars), Normal against Very high Precision:

| Hand | Normal (160 layouts) | Very high (1,600) |
|---|---|---|
| Matt's 4 players, 7 cards | 0.38, 0.21, 0.12, 0.09, 0.06, 0, 0 (3 s) | 0.09, 0.08, 0.09, 0.06, 0.02, 0, 0 (18 s) |
| Matt's 5 players, 8 cards | 0.46, 0.40, 0.52, 0.54, 0.39, 0.55, 0.09, 0 (6 s) | 0.07, 0.07, 0.15, 0.29, 0.35, 0.59, 0.01, 0 (39 s) |

So Very high makes the line trustworthy to about 10 cents where the layouts fit the auction, and leaves tricks 4 to 6 of the second hand rough (90 to 200 effective layouts: one seat's bid there fits few layouts). Also fixed: on a phone the saved-hand list in the deal setup made the page 50 px too wide.

## 15 November 2026: second money run installed; seat values with simulation bidding; first bidding network

**Network 1, second money run** (`../train-money-2`, Bagley's desktop: 72 generations at about 12 minutes each, 60,000 records and 8,000 test deals a generation; log in `bagley-log.txt`). The log is flat: gain over the rules averaged in blocks of 12 generations +1.147, +1.152, +1.158, +1.159, +1.160, +1.157; the per-generation gains over the current network sum to +0.08 ± 0.13; 71 of 72 accepted. Final against the installed network, one seat, 330,000 deals a row:

| Other seats | Ordinary deals | Hard deals |
|---|---|---|
| installed network | +0.036 ± 0.010 | +0.037 ± 0.009 |
| the new network | +0.031 ± 0.010 | +0.035 ± 0.008 |

Installed (`net_best.json`; the 14 November network is kept as `net_money_gen5.json`). All 58 assertions pass. Not rerun with it: the over-bid study, the card-reading comparison. The training has levelled off; more generations of the same run are not expected to help.

**Seat values with simulation bidding** (`../seat-values/posmap_sim.json`, `sim_results.jsonl`; Matt's laptop, 18 hours, 7,100 deals a square, each figure ±0.10 to ±0.12). Dealer at 4 players: -2.09, -1.39, -0.75, -0.44, -0.31, -0.17, -0.07, +0.05, +0.04, -0.12, -0.01, -0.25, -0.36 (1 to 13 cards); the formula had -0.35 to -0.69 from 7 cards up. First seat +0.13 to +0.25 from 3 cards up; second seat -0.11 to -0.20 at 7 to 10 cards. At 5 players and 10 cards the dealer is -0.08, at 6 players and 8 cards -0.31. So good bidding removes most of the dealer's big-round loss; the dealer does not measurably pass the first seat. The heat map shows both layers.

**Bidding network** (`../bid-network`, trained on the 957,300 simulated bids that run saved; 102 inputs, 2 x 128, 30 epochs, a few minutes). On 40,000 held-out bids: same bid as the simulation 88.2% (formula 66.4%); gives up $0.050 a bid by the simulation's own prices (formula $0.491); dealer's bids 86.4% and $0.074 (formula 69.1%, $0.535); 4 players 82.6%, 5 players 89.9%, 6 players 92.6%. As a bidder in one seat against the formula, same deals, formula bidders elsewhere, network card play (`evalbid.js`, 24,000 deals a row, about ±0.10 a seat), average over seats: 4 players +0.19 (3 cards), +0.35 (6), +0.45 (8), +0.53 (10), +0.68 (12), +0.88 (13, no trump); 5 players +0.31 (5), +0.51 (8), +0.77 (10); 6 players +0.29 (4), +0.65 (8). Positive in every seat of every row; the dealer bids about 0.3 of a trick lower than the formula. Not yet done: against simulation bidders, and in any of the formula's jobs in the pages.

## 15 November 2026 (later): the twelve-spades hand in money; network 2's money version installed; bidding network wired in

**The twelve-spades "failure" was the test, not the network.** The money-trained network 2 was set aside on 14 November because it made bid 3 only 36% of the time on Matt's twelve-spades no-trump hand. Measured in money (600 deals, that hand in the lead seat, other seats formula bids and the previous network): bid 3, previous network $1.90 ± 0.16 a deal (makes 100%, 1.35 of 3 others broken), money network $4.44 ± 0.29 (makes 45%, takes 8.1 tricks, 2.02 others broken); bid 5, $3.58 against $3.81; bid 8, $6.76 against $6.70. Holding the whole suit and a low bid, running it earns more than making the bid. The calculator's own figures agree (bid 3: $5.24 against $2.10). `assertions.js` now judges bids 2, 3 and 5 on that hand by a money floor (what making the bid exactly earns) and keeps the make-rate checks for bids 6, 8 and 10; both the previous and the new page pass all 58.

**Network 2 replaced** by generation 6 of its money run (`net2_best.json`; previous kept as `net2_gen11_points.json`). Gains measured 14 November: +0.028 ± 0.014 (4 players no trump), +0.020 ± 0.014 (5 players), +0.006 ± 0.012 (6 players); no change on hard deals. The "more contracts than a rules table" margins in `assertions.js` are lowered to 3, 3 and 2 points. Browser tests pass, including full games at 4, 5 and 6 players. A second leg of this run is packaged as `../train-money-2-net2`.

**Bidding network in the engine** (`bidnet_block.js`, built into the game page; both uses are switched off): `simulateBid` with `opt.model:"net"`, card reading with `READ.bid:"net"`. First measurements, all inside their margins: in one seat against today's simulation the network alone is +0.06 ± 0.12 (4 players, 8 cards, 1,800 deals) and +0.05 ± 0.12 (5 players, 8 cards, 1,500); the simulation with the network as its picture of the others +0.08 ± 0.14 and +0.04 ± 0.14 at about 75% more time a bid; the formula -0.31 ± 0.19 and -0.50 ± 0.20. Card reading at a table of simulation bidders, network picture over formula picture: +0.06 ± 0.20 (4 players, 6 cards, 1,000 deals), +0.26 ± 0.25 (5 players, 6 cards, 600); the layout search runs out of tries on 43% of decisions against 58%, and 68% against 82%. The deciding runs are `../bid-network/bidder-test` on a second machine.

## 15 November 2026 (afternoon): network 2, second leg of the money run: flat, not installed

Matt's laptop, five generations (about 47 minutes each). Per-generation gains over the current network: -0.01, -0.01, +0.01, +0.01, -0.01 (each ±0.016). Final against the installed network, one seat, 15,000 deals a round size: 4 players no trump +0.004 ± 0.013 (180,000 deals), 5 players +0.030 ± 0.013 (135,000), 6 players +0.003 ± 0.012 (105,000). Not installed; the run was stopped. With network 1's second leg (+0.04 after 72 generations) this says the money self-play has levelled off for both networks. Log: `../train-money-2-net2/laptop-log.txt`.

## 16 November 2026: mirror-image suits are one choice

Found by Matt: 5 players, 4 cards, on lead at trick 3 with J♠ and J♦, no spade or diamond yet played. The two leads are the same play, but the report priced them a few cents apart. Causes: each of the 160 layouts treats the two suits differently, so the averages differ by chance (on 8,000 layouts: $1.681 against $1.669, margin ±0.055); and the network itself is not exactly suit-symmetric (its scores for the two jacks are -1.78 and -1.83). `mirrorGroups` now joins two side suits when no card of either has been played or turned, nobody has shown out of either, and the seat holds the same ranks in both; the report and the card-reading bots then treat twin cards as one choice. Test `browser-tests/t24.js`.

## 16 November 2026 (later): cards separated only by a card in the current trick

Found by Matt: 5 players, 7 cards, trump diamonds. The 5♦ is led, the ace goes on it, and he holds 6♦ and 4♦. The two are the same play (both lose the trick, and the 5 is then gone), but `equivGroups` kept apart any two cards with a card of the current trick between them, so the report priced them separately and preferred the 4. The rule now also joins them when the higher of the two cannot beat the card winning the trick. It still keeps them apart when the higher one would win (5 led, holding 6 and 4, nothing higher played; or a 5 of trumps ruffing and you hold the 6 and 4 of trumps). Applies to the report, the card-reading bots and the hover figures. Tests: `browser-tests/equiv_rules.js` (13 cases, node) and `t25.js` (the hand).

## 17 November 2026: the bidding network becomes the bots' picture of the other bidders

Bagley's desktop, `../bid-network/bidder-test`, 8 hours, 431,800 deals (results in `../bid-network/bidder-test/results-2026-11-16.jsonl`).

**Bidders in one seat, dollars a deal against the simulation with the formula picture; other seats bid from the bidding network; 29,800 deals a row.**

| Table | Formula | Bidding network alone | Simulation, network picture |
|---|---|---|---|
| 4 players, 3 cards | -0.167 ± 0.027 | -0.003 ± 0.017 | +0.040 ± 0.020 |
| 4 players, 5 cards | -0.288 ± 0.039 | +0.004 ± 0.023 | +0.018 ± 0.026 |
| 4 players, 7 cards | -0.339 ± 0.044 | +0.018 ± 0.028 | +0.027 ± 0.032 |
| 4 players, 9 cards | -0.394 ± 0.048 | +0.009 ± 0.030 | +0.047 ± 0.036 |
| 4 players, 11 cards | -0.515 ± 0.051 | +0.015 ± 0.034 | +0.049 ± 0.039 |
| 4 players, 13 cards | -0.797 ± 0.056 | -0.023 ± 0.037 | +0.419 ± 0.046 |
| 5 players, 4 cards | -0.219 ± 0.033 | +0.021 ± 0.018 | +0.027 ± 0.022 |
| 5 players, 7 cards | -0.354 ± 0.043 | +0.026 ± 0.025 | +0.055 ± 0.031 |
| 5 players, 10 cards | -0.518 ± 0.051 | +0.031 ± 0.029 | +0.130 ± 0.038 |
| 6 players, 4 cards | -0.300 ± 0.033 | +0.002 ± 0.016 | +0.034 ± 0.020 |
| 6 players, 8 cards | -0.476 ± 0.047 | +0.028 ± 0.025 | +0.112 ± 0.035 |

The two simulations chose the same bid on 78% of deals; a bid took 239 ms with the formula picture and 418 ms with the network picture on that machine.

**Card reading in one seat at a table of simulation bidders (formula picture), dollars a deal over the plain network.**

| Table | Deals | Formula picture | Network picture | Network over formula | Layout search out of tries |
|---|---|---|---|---|---|
| 4 players, 4 cards | 14,900 | +0.034 ± 0.034 | +0.065 ± 0.036 | +0.030 ± 0.035 | 35% -> 20% |
| 4 players, 6 cards | 14,850 | +0.074 ± 0.054 | +0.143 ± 0.055 | +0.069 ± 0.055 | 58% -> 42% |
| 4 players, 9 cards | 14,850 | -0.067 ± 0.075 | +0.129 ± 0.074 | +0.196 ± 0.075 | 80% -> 67% |
| 4 players, 12 cards | 14,850 | +0.257 ± 0.088 | +0.433 ± 0.087 | +0.176 ± 0.085 | 86% -> 73% |
| 5 players, 5 cards | 14,850 | +0.072 ± 0.045 | +0.133 ± 0.045 | +0.061 ± 0.045 | 69% -> 52% |
| 5 players, 8 cards | 14,850 | +0.026 ± 0.067 | +0.075 ± 0.067 | +0.049 ± 0.069 | 91% -> 76% |
| 6 players, 5 cards | 14,800 | -0.020 ± 0.043 | +0.081 ± 0.042 | +0.101 ± 0.043 | 82% -> 66% |

Note the formula-picture column: at a table of simulation bidders, card reading with the formula picture is not clearly better than the plain network at 5 and 6 players or at 9 cards. With the network picture it is positive in every row.

**Switched on in the game page:** `SIMBID_MODEL="net"` (the bid simulation weighs deals, bids the seats behind and centres its candidates with the bidding network; where the simulation has nothing to go on the network's own bid stands in) and `READ.bid="net"` (card reading and the report keep a layout with the probability the bidding network gives each seat's bid). Tables the network does not cover (three players, one-card rounds) use the formula as before. In Chromium a dealer's bid at 4 players and 10 cards takes about 0.6 s, up from 0.3 s. Matt's zero-bid hand (first to bid at 5 players with A♥ Q♥ A♦) now bids 1: `browser-tests/t26.js`. Not done: the calculator (`ohhell.html`) still uses the formula as its picture of the bids. Not measured: the two switches together at a table where every seat uses them; the bidding network was trained on bids made with the formula picture, so it should be retrained on the new bids.

## 17 November 2026 (later): hidden cards were dealt unevenly once a seat had shown out of a suit

Found from Matt's hand (4 players, 4 cards, trump hearts, a zero bid): at trick 3 he threw the 10♦ and kept the 4♠, and the report mildly preferred throwing the 4♠. West had shown out of spades and East out of hearts.

**The bug.** `dealHidden` dealt the unseen cards seat by seat, most-restricted seat first, each seat taking the first cards in a shuffled pile that it was allowed to hold. That is not an even draw from the deals that fit: a seat dealt later gets more than its share of the cards the earlier seats could not take. In this hand East was given a spade as its last card 47% of the time; an even deal gives 30%. It only matters once somebody has shown out of a suit.

**The fix.** The first-fit deal is now only a starting point. It is followed by `8 x (cards dealt)` random exchanges, each swapping a seat's card with another seat's card or with an undealt card, and made only if both cards are allowed where they land. Every exchange is its own reverse, so the deals that fit all come up equally often. With no voids the old deal was already even and the exchanges are skipped. `READ.deal="first"` gives the old deal for comparison. Applies to the card-reading bots, the report and the hover figures.

**Checks.** `browser-tests/deal_rules.js` (node): on this hand's position the share of each suit in East's last card matches the exact count; no voids are broken; hand sizes hold. `browser-tests/t27.js`: on Matt's hand, throwing the 10♦ is not marked a mistake in six reports, and at Very high precision costs at most a few cents. Browser tests t9 and t18 to t26 pass.

**Effect on the bots' card play: not measurable at this sample.** One seat reading with each deal against the plain network, bidding-network bidders, same deals: new deal minus old +$0.13 ± 0.26 (4 players, 7 cards, 300 deals) and +$0.04 ± 0.29 (5 players, 6 cards, 300 deals). That rules out a large loss and nothing more.

**Still open on this hand: the reading of East's discard is too confident.** With the even deal the two throws come out level (97.5% against 97.7% of the zero bid made), where bids alone say the 10♦ is right by about 68 cents. The reading puts East's last card at a diamond 3% of the time (bids alone: 34%), because East threw the 5♦ at trick 2 and the network, holding 5♦ 6♣ and another diamond, much prefers to throw the 6♣. The real East held 10♠ 6♣ 5♦ and threw the 5♦, which the network on its own ranks last of the three. The sharpness of the reading (`beta` 2, `eps` 0.02) was tuned against opponents that play the plain network; the game's bots also read cards and stray from it. `readCalib` (a test hook) records what card-reading bots actually choose beside the network's scores, so the sharpness can be fitted to them. Matt's guidance: a seat that has shown out is a certainty and should be used fully; inferences from which card someone chose are probabilities and must be calibrated, and the report should need to be quite sure before preferring to keep a 10 over a 4.

## 17 November 2026 (evening): the sharpness of the card reading, measured. It was not the problem

The entry above guessed that the reading of East's 5♦ discard was over-confident because its sharpness had been tuned against plain-network opponents. Three measurements, all with card-reading bots in every seat and bids drawn from the bidding network (`oh-hell-source/read-calibration/`), say otherwise.

**1. How well the network's scores predict a card-reading bot's play** (`calib_node.js`, `fit.js`). 9,039 choices (4 players, 4 and 6 cards). The bot played the network's first choice 76% of the time. Best fit of `P(card) = (1-eps) softmax(beta x score) + eps/legal`: beta 1.9 (1.7 to 2.0), eps 0.04 (0.03 to 0.05). The published setting is beta 2, eps 0.02: log-likelihood per choice -0.6512 against -0.6485 at the best fit. By kind of choice (754 choices from the second run): leads are less predictable (best beta 1.2), follows more (2.3), throws 1.8. The setting stays.

**2. Is the picture of the hidden cards right, end to end?** (`post_calib.js`, `post_sum.js`). Before each choice the reading's chance that each other seat still holds each suit it has not shown out of was written beside the truth: 7,618 cases at 4 players, 4 and 5 cards.

| The reading said | The seat held the suit | cases |
|---|---|---|
| 1% | 4% ± 2 | 475 |
| 10% | 14% ± 4 | 346 |
| 22% | 25% ± 3 | 881 |
| 40% | 43% ± 3 | 1,447 |
| 60% | 59% ± 2 | 2,040 |
| 76% | 73% ± 2 | 1,541 |
| 89% | 86% ± 3 | 529 |
| 98% | 99% ± 1 | 359 |

Log score -0.553 for the reading, -0.582 for the bids alone. In the 910 cases where the seat had earlier thrown a card of that suit (Matt's case), the reading said 48.3% on average, the truth was 49.6%, and the bids alone said 59.6%; log score -0.545 against -0.631. The reading is a little too sure at the ends there (said 1%: held 8% ± 5; said 90%: held 80% ± 11).

**3. Matt's hand replayed** (`east_truth.js`, `east_truth.txt`). East's choices depend only on East's cards and what everyone has seen, so they can be replayed exactly. For each of the 30 cards East might still hold, a card-reading bot was put in East's seat 200 times at each of East's three turns.

- Holding the 5♦, the 6♣ and **any other diamond**, the bot threw the 5♦ **0 times in 200, for each of the 11 diamonds**. With a lower diamond it throws the 6♣; with a higher one it throws that.
- With a spade as the third card it threw the 5♦ about 20% of the time (the real East, with the 10♠: 22%). With a club from the 7 up: 89 to 100%.
- With an even chance for each card beforehand, East's last card is a club 83.5%, a spade 16.5%, a diamond 0.0%, the 2♠ 2.2%. The reading's own formula on the same footing gives clubs 74.7%, spades 21.2%, diamonds 4.1%.

So against these bots the read is sound and, on this hand, not sure enough: once East throws the 5♦ it holds no other diamond, the 10♦ cannot lose the last trick, and the 4♠ loses it only to the 2♠ (about 2%, and then only if West has no trump and North no higher spade). The report's "level" is right for this table.

**What it does mean.** The bots are predictable. Each one plays the card its own sums rate best, with no mixing, and within a run of touching cards it always plays the one the network prefers (holding 6♦ 5♦ it never plays the 5). A reader gains from that, and the report prices Matt's plays against these bots, not against people: a person in East's seat could throw the 5♦ from 5♦ 2♦ 6♣ and the report's certainty would be wrong. Not done: bots mixing between plays that are close or the same (which would make them harder to read and the reading honestly less sure); a separate, looser reading for study against human-like opponents.

**East's own throw at trick 2 (Matt's follow-up question).** `read-calibration/east_t2.js` replays East's real choice (10♠ 6♣ 5♦, zero bid, hearts led). Priced on many layouts (Very high precision, 40 runs) the throws are worth: 6♣ +$0.29, 5♦ -$0.17, 10♠ -$1.71. Throwing the 6♣ leaves East out of clubs, so the 10♠ can go on a club lead. So the 5♦ was a mistake of about 45 cents by the bot's own sums. It happened because at Normal precision each figure moves about $0.40 from run to run: the bot chose the 5♦ in 24% of 300 runs (the 6♣ 76%, the 10♠ never); at Very high precision 3%. Same cause as the NE queen lead of 16 Nov. Not done: drawing more layouts only when the two best choices are close.

## 17 November 2026 (night): close calls get more layouts

The card-reading bot priced every choice on one batch of layouts. When its two best cards were close, noise decided: East's 5♦ throw above (45 cents worse than the 6♣) came out 24% of the time. `readChoose` now compares its two best choices layout by layout after each batch, and while the gap is under `READ.z` (2) standard errors it reads and plays another batch, up to `READ.rounds` (4) in all. Clear choices cost nothing extra. `READ.rounds=1` is the old behaviour.

**East's throw** (300 runs, node): the 5♦ chosen 24% with one batch, 11% with up to two, 7% with up to four. In Chromium (`browser-tests/t28.js`, 150 runs): 23% to 8%; that choice takes 485 ms on average instead of 162 (longest 757).

**Cost of noise by the bot's own sums** (`read-calibration/regret.js`, `regret_sum.js`, `r_4x4.txt`, `r_4x7.txt`). Card-reading bots in every seat; each choice priced once at 10x precision as the reference, then each setting chooses four times; cost = reference worth of the best card minus that of the card chosen. Times are node on a busy 2-core machine.

| | 4 players, 4 cards (154 choices) | 4 players, 7 cards (116 choices) |
|---|---|---|
| one batch: cost per choice | $0.039 ± 0.016, 278 ms | $0.098 ± 0.036, 439 ms |
| up to 2 batches: saves | $0.018 ± 0.011, 389 ms | $0.018 ± 0.028, 693 ms |
| up to 4 batches: saves | $0.025 ± 0.015, 544 ms (longest 2.6 s) | $0.046 ± 0.035, 1,123 ms (longest 3.0 s) |
| Precision x2 on every choice: saves | $0.018 ± 0.012, 546 ms | $0.034 ± 0.026, 875 ms |

About half of all choices have their two best cards within 50 cents. Small samples: the saving is real at 4 cards and likely at 7; it is not shown to beat simply doubling the Precision for the same time. The reference is the bot's own pricing, so this says the bot follows its own sums better, not that it wins more money: **not measured against opponents** (a few cents a choice would need tens of thousands of deals). Switched on in the game (`READ.rounds=4`); the report's own pricing is unchanged. Phone speed not measured.

## 18 November 2026: seat values with the new bidding; bidding network 2

**Seat values again** (Matt's laptop, 8 hours, `seat-values-overnight-2/results-2026-11-18.jsonl`; 2,000 to 2,200 deals a square, each figure ±$0.15 to ±$0.23; table in `seat-values/posmap_sim2.json`, made by `seat-values/aggregate.js`). Every seat bids by the simulation with the bidding network as its picture. Against the 14 November run (formula picture, 7,100 deals a square):

- The dealer is not lifted. Four players, 7 to 12 cards: −$0.16 a hand on average (squares from −$0.35 to +$0.15). The dealer is ahead of the first seat only at 8 cards (+$0.13, inside the margin).
- Five and six players, big rounds: the dealer is worse. Five players, 7 to 10 cards: −$0.35 on average against −$0.20; six players, 6 to 8 cards: −$0.52 against −$0.39. Pooled over 5 players 9 and 10 cards and 6 players 8 cards the change is about −$0.34 ± 0.14.
- The tables bid more in those rounds: bids add up to more than the tricks in 23% of hands at 5 players 10 cards (11% before), 24% at 6 players 8 cards (11%). Contracts made fall a point or two.
- The first seat stays positive at almost every size.
- Heat map artifact "Oh Hell Seat Values" has this as a third layer, shown first.

**Bidding network 2** (`bid-network/bidnet2.json`; trained on Matt's laptop from 254,250 of the 282,500 bids of that run). Trainer's held-out figures: same bid as the simulation 86.2%, gives up $0.063 a bid (4 players 80.6% / $0.087; 5 players 87.2% / $0.056; 6 players 91.8% / $0.042; dealer 86.2% / $0.082).

Both networks scored on 2,328 fresh bids made here by the game's simulation as published, ten table sizes (`bid-network/fresh-bids-2026-11-18.jsonl`, `bid-network/score_bids.py`):

| | same bid as the simulation | gives up, a bid |
|---|---|---|
| network 1 (installed) | 81.1% | $0.125 |
| network 2 | 85.4% | $0.063 |
| formula | 64.2% | $0.498 |

The two networks choose the same bid 85.1% of the time. So network 2 is the better description of how the bots bid now (the target moved when network 1 became the picture). Whether using it as the picture wins money is **not measured**: `bid-network/network-2-test/` (zip `ohhell-bid2` for Bagley's machine) runs the simulation in one seat with each network as its picture at a table bidding as published, and one card-reading seat with each picture. The same run compares one batch of layouts with up to four on close calls (17 November's change) against opponents. Network 2 is not installed.

## 18 November 2026 (later): cards that are the same play

Matt's choice, after the finding that a bot holding touching cards always played the one the network preferred (holding 6♦ 5♦ it never played the 5, so a reader could rule the 6 out).

- **Bots** (`botPlay`, both card-play settings): the chosen card's group of same-play cards (`equivGroups`, and twin suits under `mirrorGroups` for reading bots) is picked from at random. `READ.anyTouch=false` restores the old habit. By construction the cards in a group play the same, so this should cost a bot nothing; not measured.
- **Card reading** (`readLayouts`): the chance of an opponent's play is now the chance of its group, shared evenly among the group's cards (`READ.touch`). On Matt's discard hand the picture of East's last card is unchanged (diamond 2.9%, club 74.7%). Effect on results not measured; the arenas' opponents play the plain network, which still plays one fixed card of a group, so only live play matches the new reading exactly.
- Not done (Matt undecided): mixing between plays that are close but not the same.
- Test `browser-tests/t29.js`; t19 to t28 and the two play-through tests pass.

**Late seat against second seat** (Matt: at six players seat 5 should be better than seat 2). Pooling the two simulation runs: seat 5 minus seat 2 at six players is +$0.18, +0.17, +0.29, +0.21, +0.11, +0.05, +0.09, −0.00 from 1 to 8 cards (each about ±$0.07 to ±$0.14), +$0.16 ± 0.04 over all sizes. Five players, seat 4 minus seat 2: +$0.15 ± 0.04 over all sizes, positive at every size but 10 cards (−$0.03 ± 0.16). The squares in the 18 November layer that showed the reverse (six players, 7 and 8 cards) are inside its ±$0.20.

## 18 November 2026: Matt's book hand 1, king or two; old reports marked

5 players, 4 cards, spades trump (`hands/matt_5p4_book_hand1.txt`, `browser-tests/t30.js`, `read-calibration/k_or_2.js`). Trick 3: NW (bid 2, has 1) leads the 4♠, NE and East show out, You (bid 1, none) hold K♠ 2♠, West (bid 1, none) plays last with two cards. Matt played the king and lost it to West's lone ace; he remembered the analysis calling the king clearly right and doubted it.

- **Today's method prefers the two**, by about $0.42: 2♠ +$0.94 ± 0.18, K♠ +$0.52 ± 0.21 at Very high precision (network alone: 2♠ −0.88, K♠ −1.19). The two loses only when NW holds the ace (13% in the reading); the king loses when West holds the ace alone (17%).
- **The method before 17 November preferred the king by about $2** (K♠ +$1.71, 2♠ −$0.26 with the uneven deal and the formula picture; +$1.40 against +$0.65 with the uneven deal alone; +$1.35 against +$0.06 with the formula picture alone). With two seats out of spades the uneven deal gave West two spades 57% of the time (even deal: 19%) and the lone ace 9% (17%).
- **At Normal precision the report cannot settle it**: five runs gave the two ahead by $0.40 to $0.68 four times and the king ahead by $0.70 once, each figure ±$0.6.
- **Stored reports**: new reports are version 6. A stored version-5 report is still shown, with a line saying it predates the correction and a button "Assess again with the current method".

**Matt's trump-lead question (18 Nov 2026)**: 5 players, 3 cards, on lead with 9♦ 3♦ 2♣, bid 1, bids 1 0 1 1 1 (`hands/matt_5p3_trump_lead.txt`, `read-calibration/lead_5p3.js`). He led the club; the report preferred a trump. At 10x precision: 3♦ $2.49, 9♦ $2.48, 2♣ $1.32. On 4,000 layouts fitted to the bids, network in every seat after the lead: own bid made 83.5% (3♦), 81.0% (9♦), 77.5% (2♣); opponents busted per hand 1.55, 1.62, 1.21. Where no opponent holds two trumps (62% of layouts) a trump lead makes 92% against about 80% for the club; where someone does (38%) the three leads are within a few points. The 9♦ lead fails outright in the 4.5% of layouts where it wins and no opponent has a second trump (the 3♦ is then a forced second trick). Not a bug; the report stands.

## 18 November 2026: the report shows how often each choice makes your bid

Asked for by Matt for Bust Out (a player who busts sits out the next hand, so the safest line can matter more than the dollars). The report (assessment version 7) has a **Makes** column: the share of the same playouts in which you make your own bid after the card you played. Under "Every choice" each card's make % follows its worth, and a card that makes at least 3 points more often than the card worth most is marked "safest". Cost and the verdict are unchanged (money). A stored version-6 report is shown as it is with a button to assess again and add the figures. `playOut` reports whether its seat made (`playOut.made`). Test `browser-tests/t31.js` (on the trump-lead hand: 3♦ 82%, 9♦ 82%, 2♣ 79% at High precision). Not done: a Bust Out setting that would price the missed hand into bids and plays.
