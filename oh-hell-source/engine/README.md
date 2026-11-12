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
