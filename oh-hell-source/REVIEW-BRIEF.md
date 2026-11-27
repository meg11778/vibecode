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
