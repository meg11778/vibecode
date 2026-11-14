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
