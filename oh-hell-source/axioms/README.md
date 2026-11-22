# Axioms of play, tested

Matt's group has rules of thumb learned at the table. Each one here is written down precisely, tested on the
project's own bots, and marked. Everything is bot against bot: it shows what calculating players do and what a play is
worth against them, not what people do.

## Picking this up in a new conversation

How we work: Matt states a rule of thumb in his own words; Claude writes it down precisely, says how it will be
tested, runs it, and reports in money or make-rates with error bars, including where the rule stops holding. Every
test hand is also a chance to check the bots: compare what the bot thinks a line is worth with what it earns when
played out on real deals (axiom 3 found a real bot error that way).

Tools: each folder's script loads the game page's engine in node (`OHHELL_ENGINE` = a folder holding
`ohhell-play.html`). Plain-network bots play about a thousand deals a second; the card-reading bots take a second or
more per choice, so they are used to price sampled positions ("probe" mode) or need an overnight run.

Open follow-ups Matt may ask for:
- Axiom 1: his classic case alone (bid two, win a side trick, then the two of trumps appears).
- Axiom 2: cash one ace and then lead the trump; other round sizes and seats.
- Axiom 3: more hand types than the one 10-card hand; five and six players.
- Axiom 4: a chart for sharing; the 13-card no-trump round.
- Discard question (21 Nov): does a bot keep the jack and throw the seven when the player about to win the trick is
  known to be out of the jack's suit? One quick position showed no effect; it needs a fairer position (trumps mostly
  gone, the two-bidder holding one trump and a small side card) or a real hand from Matt.
- Matt's wider theme: overbid deals and how to use trumps in them.
- Axiom 6: 6 players; whether people at the table bid the hooked dealer down as often as these numbers say they should.

Overnight queue (low priority; package only when Matt asks and a machine is free):
- Axiom 6 again with the card-reading bot playing the dealer's hand (Matt, 22 Nov: "not that important"). Not yet
  packaged: needs `dealer_hook.js` with `readChoose` for the dealer's seat and far fewer hands and redeals.

## 1. The low-trump tell (21 Nov 2026): PARTLY TRUE

Said as: "when someone wants one more trick and exits with a low trump, they almost certainly hold a high trump
(ace, king or queen) for later." Softer form: "a player who still wants tricks does not lead a lone low trump."

Test (`01-low-trump-tell/`): 100,000 deals at each of six table sizes, plain-network bots, bids drawn from the bidding
network; every lead by a seat that needs tricks and holds a trump. Low = 7 or lower. Then 628 such positions at
4 players 7 cards (low = 6 or lower) priced by the card-reading method.

- Softer form HOLDS for a seat needing exactly one: a lone low trump is led 6% to 10% of the time (card-reading bot
  13% +/-4), and by the reading bot's sums it costs about $1.3 against the best other lead. It does NOT hold for a seat
  needing two or more: lone low trump led 29% to 46%.
- Strong form FAILS as worded: when a seat needing one leads a low trump it holds the ace, king or queen 34% to 45% of
  the time (base rate 18% to 30%, so the lead roughly doubles the chance); it holds SOME higher trump 79% to 92%.
  The rest of the time the trump behind it is an 8 to jack (29% to 39%) or another low one (12% to 19%).
- Weakest early in long rounds: in the first three tricks at 4 players 10 cards the leader's low trump is its only
  trump 43% of the time.
- Not done: card-reading bots in every seat for the whole test (too slow here; the probe suggests the tell is no
  stronger with them: about 26% ace/king/queen, 79% any higher trump, from about 130 leads).

## 2. Two aces and one small trump on opening lead, table overbid (21 Nov 2026): LEAD THE TRUMP

Matt's open question: 7-card round, one small trump, 2-2-2 outside with two aces, bid 2, on lead, table overbid:
cash an ace or lead the trump?

Test (`02-ace-or-trump/`): seat 0 is given such a hand (trump 2 to 6, ace + one other in two suits, two cards below the
ace in the third) and bids 2 (the bidding network's own first choice 76% of the time at four players, 47% at five).
Others get random cards and bid as the bots do. Every opening lead is played out on the same deal, plain network in all
seats: 150,000 deals at four players, 120,000 at five. Then 295 overbid deals priced by the card-reading method.

- Overbid by 1: trump lead beats the ace by $0.70 +/-0.05 (4 players) and $0.72 +/-0.06 (5). The bid is made 62%
  against 57%, and falls short 26% against 34%. Overbid by 2 or more: +$0.77 +/-0.14 and +$0.64 +/-0.15.
- Holds whether the trump is a 2-3 or a 4-6, and whether the ace is with a low card or with a jack to king (smaller
  there: +$0.55).
- The card-reading bot agrees: leads the trump about 80%, an ace 12%; by its own sums trump is better by
  $0.51 +/-0.06 (248 positions, over by 1).
- Leading low from under the ace is the worst lead by far (-$1.6 against the ace).
- UNDERBID tables are different: level overall (+$0.13 under by 1, -$0.01 under by 2+), and with the ace backed by a
  jack to king the ace lead is better by $0.3 to $0.4.
- Limits: after the first card everyone plays as the network does, and the network itself prefers the trump lead,
  so the ace line may be played on less well than a person would. Not tested: cashing one ace and then the trump;
  other round sizes; a seat other than first.
- Next (Matt): the long-suit case. 11-card round, several winners in one side suit and a bunch of small trumps,
  overbid: draw trumps first?

## 3. Side-suit winners and small trumps, table overbid: lead trumps when you get in (21 Nov 2026): TRUE EARLY, NOT "EVERY TIME"

Matt's hand: 4 players, 10 cards, spades trump (A♠ turned), first to bid and on lead with
4♠ 3♠ 2♠ A♥ Q♥ J♥ A♣ 2♣ J♦ 4♦, bid 3 (the bidding network's own bid every time).

Test (`03-draw-trumps/`): 80,000 random deals of the other cards, others bid as the bots do, plain network plays on.
One line per opening lead, plus "a trump every time you are on lead while you need tricks" and "a trump on your first
two leads".

- Over by 1 (18,210 deals): open a trump $+0.03, A♥ -$0.69, J♦ -$0.57, 4♦ -$0.29, A♣ -$1.17, Q♥ -$1.08 (each +/-0.07).
  So the trump opening beats the ace of hearts by about $0.72; short of the bid 25% against 35%; heart tricks 1.67
  against 1.41. Over by 2 or more: trump -$0.71, 4♦ -$0.76, A♥ -$1.28 (+/-0.17).
- Trump on the first two leads is best (+$0.13 over by 1); a trump EVERY time is worse (-$0.21): the third trump lead
  spends your last one. So "draw early", not "always".
- Underbid tables reverse it: opening a trump is worst-but-two (-$0.29, -$0.61); a heart honour or the J♦ is best.
- BOT WEAKNESS FOUND: the plain network opens the A♥ 70% and J♦ 30% on the overbid deals, never a trump, giving up
  $0.6 to $0.7. The card-reading bot (486 overbid deals, Normal precision) opens a trump about 40%, a diamond 35%,
  A♥ 14%; its sums put the trump first by $0.2 to $0.3, inside its own noise.
- TO CHECK: on these deals the reading bot's sums (+$1.71 for the trump opening) are far above what the same line
  earns when played out on real deals (+$0.03). Likely the known problem that at 10 cards most imagined layouts fail
  to fit three opponents' bids and are topped up with layouts that ignore the bids, which makes an overbid table look
  softer than it is.
- Limits: one hand; the network plays on after the scripted leads; four players only.

## 4. A-4-3-2 in a side suit is a zero, not a one (22 Nov 2026): TRUE at every size and seat tested

Test (`04-a432/`): one seat holds A-4-3-2 of a side suit plus random cards from the other suits; 40,000 deals a
table size; plain network plays except where a plan overrides it. DUCK: never lead the ace, follow low, throw the ace
on the first plain discard. CASH: lead the ace the first time on lead, or play it the first time the suit is led.
Success = the suit's four cards take no trick (DUCK) or exactly one (CASH).

| Table | DUCK takes none | CASH takes exactly one | ace trumped |
|---|---|---|---|
| 4 players, 7 cards | 94.5% | 68.6% | 16.7% |
| 4 players, 10 cards | 92.9% | 77.0% | 13.2% |
| 4 players, 12 cards | 93.2% | 83.2% | 7.8% |
| 5 players, 7 cards | 97.9% | 55.8% | 24.4% |
| 5 players, 10 cards | 96.9% | 78.0% | 14.1% |
| 6 players, 8 cards | 98.6% | 59.5% | 23.0% |

Seat barely matters (within about 2 points), except that the leader's ace is trumped about twice as often when it is
led at trick one (4p7: 26.7% against 13%; 5p7: 41.6% against about 20%).
4-card round, the hand IS A-4-3-2 (network plays for the bid): bid 0 makes 99.5% / 99.9% / 100.0% at 4 / 5 / 6
players; bid 1 makes 35.7% / 34.8% / 31.5%; zero is better by $3.82 / $4.20 / $4.72 a hand (+/-0.04). On lead the
scripted CASH does better than the network's bid-1 play (58% at 4 players, 38% at 5, 33% at 6: the ace is trumped
31% / 60% / 66%), so the network plays a bid of 1 badly from the lead here; off lead the ace often never gets played.
How DUCK fails in long rounds: the suit is led a fourth time (ace forced: 1.7% at 4p10, 4.7% at 4p12) or a small
card wins late once the suit is gone (4 to 6% at four players). Both plans are simple scripts, so a careful player
should beat both figures; the gap is what matters. Counts the suit only, not the whole hand's bid.

## 5. A zero bidder follows suit with its highest losing card (22 Nov 2026): TRUE about 19 times in 20 for the network, less for the card-reading bot

Said as: "a zero bidder never plays a lower card than it needs to. If the queen is winning and the zero bidder plays
the 2, it has no other card of the suit below the queen (a touching 3 apart)."

Test (`05-zero-follows-high/`): 60,000 deals a size, plain network, bids from the bidding network. Seats that bid 0
and have taken no trick, following suit. Touching = every rank between is already seen or in the same hand.

- The hand-reader's view (every losing follow by a live zero bidder): it still holds a higher losing card, not
  touching, 1.3% (4p5), 2.3% (4p7), 3.8% (4p10), 1.7% (5p6), 3.0% (5p8), 1.8% (6p6) of the time.
- When it had a real choice: highest losing card 96.6 / 95.0 / 92.7 / 95.2 / 92.4 / 94.2%; a lower card 3 to 6%
  (nine times in ten skipping just one card); took the trick 0.2 to 2%. More lower cards early in the hand, in longer
  rounds, and when the table is overbid. Seats that have exactly made a bid of one or more: 94 to 98%.
- Cost of the network's lower cards, finishing the real deal both ways: $-0.02 +/-0.05 (4p7, 3,663 plays) and
  +$0.05 +/-0.04 (5p8, 11,342 plays). So they are close to free: mostly spots where the skipped card could not matter.
- CARD-READING BOT (the one in the game), 823 sampled choices: highest losing card 87% (4p7) and 80% (5p8); lower card
  11% and 16%; took the trick 2% and 4%. Cost of its lower cards not resolved (+$0.07 +/-0.40, 111 plays). Likely
  noise between near-equal cards in its sampled layouts. A rule "a seat that wants no more tricks plays its highest
  losing card" would make the bots follow the axiom; not built, because no cost has been shown.
- Limits: bots, not people. Against people the inference should be at least as strong as against the network.

## 6. Hooked dealer: "would X be easier to make overbid or underbid?" (22 Nov 2026): RIGHT DIRECTION, WRONG ZERO POINT

Said as: "you are the dealer and the bid you want, X, is the one you may not make. Imagine you could bid X and ask
whether it would be easier to make at an overbid table or an underbid one. Overbid: bid X+1. Underbid: bid X-1."

Test (`06-dealer-hook/`): dealer hands torn across the hook (the bidding network gives X-1 and X+1 at least 15% each
and 80% together; it never chooses X itself because it has learned the hook). Each hand and turned card is kept and
the other cards redealt 3,000 to 4,000 times, the other seats bidding as the bots do. Three tables turn up by
themselves: bids ahead leave exactly X (the same deal is played with the dealer bidding X+1 and X-1: "up minus
down", in money); bids ahead one higher (dealer bids X at a table over by one); one lower (X at a table under by
one). TILT = make rate of X when over minus make rate when under. LEAN = average tricks taken when bidding X, minus X.
Plain network plays every seat. 362 hands at 4 players 7 cards, 271 at 4 players 10, 228 at 5 players 8 (about 560 to
860 hooked deals a hand). +/- is two standard errors across hands.

| | 4p, 7 cards | 4p, 10 cards | 5p, 8 cards |
|---|---|---|---|
| up minus down, all hands | -$0.99 +/-0.11 | -$1.29 +/-0.15 | -$2.00 +/-0.19 |
| makes X+1 / makes X-1 | 34.5% / 48.4% | 34.9% / 53.1% | 31.4% / 58.3% |
| fifth of hands with the lowest tilt | -$2.06 +/-0.18 | -$2.70 +/-0.29 | -$3.25 +/-0.35 |
| middle fifth | -$0.95 +/-0.19 | -$1.02 +/-0.22 | -$2.02 +/-0.34 |
| fifth with the highest tilt (about +0.07 to +0.24) | -$0.12 +/-0.22 | -$0.30 +/-0.26 | -$0.60 +/-0.40 |
| axiom as stated (up when tilt > 0), against always down | -$0.16 +/-0.06 | -$0.20 +/-0.07 | -$0.17 +/-0.09 |
| best cut on lean, fitted on other hands, against always down | +$0.02 +/-0.02 | $0.00 +/-0.02 | $0.00 +/-0.03 |

- The DIRECTION is right: the more a hand's X is "easier overbid", the better bidding up does, steadily, at every size
  (each 10 points of tilt is worth $0.57 / $0.77 / $0.83 of up-minus-down).
- The ZERO POINT is wrong: tilt above zero is not enough. Bidding down is better by $1 to $2 on the average torn hand
  and still level-or-better for the fifth of hands that tilt most towards overbid. Against these bots no rule tested
  beats "always bid X-1" by more than a few cents; bidding up only pays, if at all, when the hand is worth about a
  quarter of a trick more than X.
- Why: at the hooked table the dealer who goes down needs to lose one trick at a table where everybody has a trick to
  spare, and makes 48 to 58%; the dealer who goes up needs an extra trick at a table fighting for tricks and makes 31
  to 35%. Going down also busts more opponents (1.15 to 1.21 against 1.00). The bigger X is, the bigger the gap
  (4p10: -$0.5 at X=2, -$2.6 at X=6).
- Tilt is mostly lean: the two go together (correlation 0.76 to 0.89). A hand makes X more easily when overbid mainly
  because it is a little too good for X. With lean held equal, tilt still adds something at each size ($0.26 +/-0.16,
  $0.32 +/-0.18, $0.33 +/-0.19 per 10 points), so the kind of hand matters a little beyond its strength; both are
  measured with noise, so this is suggestive rather than settled.
- What tilts a hand towards "overbid": top cards (a trump ace to queen +16 points of tilt at 4p7, a side ace +9) and a
  small X. Towards "underbid": a bigger X and (4p7, 5p8) short suits, tricks that depend on what the others do.
- THE GAME'S BOT AGREES (`hook_bot_check.js`, the game's own 150-deal bid simulation on hooked deals of these hands):
  it bids X-1 76% / 72% / 79% of the time and X+1 23% / 24% / 16%; its own sums for up-minus-down match the measured
  figure hand by hand (difference +$0.03 +/-0.09, +$0.05 +/-0.11, +$0.15 +/-0.14); when it does bid up the hand is
  about level by measurement. The bidding network on its own would go up 39 to 46% and gives up $0.17 to $0.44 a
  hooked hand against always-down: it is a poor guide at the hook, though the game does not use it alone there.
- Limits: plain-network play in every seat, and that network has a known weakness as the stretching seat at overbid
  tables (axiom 3: it does not draw trumps), which could make bidding up look worse than it is for a good player.
  Hands were chosen by the bidding network's doubt, not by a person's. Six players and 13-card no trump not run.
  X=1 (down means a zero bid) is in the sample: -$0.71 +/-0.20 at 4p7, -$0.56 +/-0.46 at 4p10.

## 7. "Get in and get out" in underbid hands (22 Nov 2026): TRUE EARLY IN THE HAND; late in the hand the opposite

Said as: "in an underbid hand, once you are comfortable you can take no tricks afterwards, take your tricks early and
get off lead; do not duck just to duck (a duck with a purpose, such as throwing a dangerous singleton, is different)."
Classic hand: A♠ (trumps), ♥10-4-3-2, ♣3-2, no diamond, bid 1, a diamond is led. Novices throw the ♥10; Matt takes the
ace of trumps and gets out with a club.

Test (`07-get-in-get-out/classic.js`): 7-card round, the hand in a random seat other than the leader's, bid 1 (the
bidding network's own bid every time), other cards random, others bid as the bots do; deals kept when the opening lead
is a diamond and nobody has trumped yet. Each line played out on the same deal, plain network otherwise. 80,000 deals
each at four and five players.

| ruff and exit with the ♣3, minus throwing the ♥10 | 4 players | 5 players |
|---|---|---|
| table under by 2 or more | +$0.16 +/-0.03 | +$0.16 +/-0.02 |
| table under by 1 | +$0.28 +/-0.03 | +$0.19 +/-0.02 |
| table over by 1 | -$0.02 +/-0.04 | +$0.13 +/-0.04 |
| table over by 2 or more | +$0.15 +/-0.12 | +$0.01 +/-0.09 |

- Underbid: taking the ace at once is better at both sizes and from every position in the trick (+$0.12 to +$0.31).
  The ruff line makes the bid 99.9 to 100%; throwing the ♥10 goes over 1.4 to 1.6% of the time at four players (0.1
  to 0.2% at five), the rest of the gap comes from what happens to the other seats. Throwing a club instead of the
  ♥10 is no better (+$0.18 to +$0.27 behind the ruff).
- At four players the gap disappears when the table is OVERBID (-$0.02 +/-0.04), as the axiom's "in underbid hands"
  says; at five players a smaller gap remains.
- The exit matters only if it is the ♥10: ruff then ♥10 goes over 27 to 36% at four players and costs $2.1 to $2.7.
  ♣3, ♣2 and ♥2 are within 4 cents of each other.
- BOTS: the plain network takes the ace 98 to 99% at four players but only 67 to 76% at five (it throws the ♥10 22 to
  33% there). The game's card-reading bot (539 sampled positions) takes the ace only 60 to 73% on the underbid deals
  and throws a heart or a club the rest of the time, although its own sums put the ace ahead of the ♥10 by $0.20 to
  $0.33, in line with the measured figures: the known noise between plays a few dimes apart.
- Limits of this part: one hand, the first trick only, plain network plays on.

Second hand, and on lead (`scripted.js`, 60,000 deals a row; Matt: "take ALL your tricks at once, and even more so
on lead"). Hand 2 = the same with ♣A-2 and a bid of 2. Figures: the get-in-get-out line minus the other line.

| underbid tables (by 2 or more / by 1) | 4 players | 5 players |
|---|---|---|
| hand 2, diamond led: ruff, ♣A, ♣2 against throwing the ♥10 | +$0.57 / +$0.65 | +$0.51 / +$0.67 |
| ... against ruff, exit ♥2, get in again later with the ♣A | +$0.97 / +$1.05 | +$0.74 / +$0.96 |
| hand 2 on lead: A♠, A♣, ♣2 against ♥2 first | +$0.43 / +$0.64 | +$0.21 / +$0.32 |
| ... against A♣, ♣2, keeping the trump ace | +$0.41 / +$0.41 | +$0.12 / +$0.33 |
| ... against A♣ before A♠ | +$0.16 / +$0.15 | +$0.16 / +$0.26 |
| hand 1 on lead: A♠ then ♣3 against ♣3 first, keeping the ace | -$0.03 / +$0.23 | -$0.21 / -$0.06 |

(+/- 0.03 to 0.08.) Hand 2 backs Matt fully, at overbid tables too (+$0.6 to +$1.1 against the ♥10 throw): a side ace
is a winner that can be lost by waiting, so take everything at once, trump ace first. Hand 1 on lead is the one
EXCEPTION found: at five players, and at four when under by two or more, leading the ♣3 and keeping the trump ace
earns as much or more money although it goes over a little more often (0.9 to 4.7% against 0 to 0.2%). A guess, not
tested: cashing the trump ace at trick one draws trumps the opponents were stuck with.
BOT WEAKNESS: with hand 2 and a diamond led at a four-player table under by one, the plain network throws the ♥10
69% of the time and ruffs only 19% (five players: ruffs 37 to 61%), giving up about $0.65 each time.

General test (`general.js`, ordinary underbid deals at 4p7, 4p10, 5p8, 6p6; 200,000 to 400,000 deals a size).
A. THE DANGER SPOT (Matt: on lead, bid made, hand still underbid). A seat that has exactly made, with spare tricks
still out, takes the trick it leads to 12% of the time with 7 cards left, 18% with 4, 27% with 3, 41% with 2 and
70% with 1 (4p7; 4p10 the same; 5p8 9.5% to 64%; 6p6 7% to 58%). The same seat NOT on lead takes that trick 4 to 12%
whatever the count. So the spot is three to six times as dangerous late as early, as Matt says.
B. TAKE NOW OR LATER. The first moment a seat needs exactly as many tricks as it has sure winners (top remaining
trumps) and may win the trick with one or legally not. TAKE = the sure winner now, the others at once, then the
network; DUCK = the network's best other card, then the network. TAKE minus DUCK:

| | 4p7 | 4p10 | 5p8 | 6p6 |
|---|---|---|---|---|
| safe hand, on lead, 6+ cards left | +$0.12 +/-0.17 | +$0.28 +/-0.12 | +$0.08 +/-0.15 | +$0.24 +/-0.20 |
| safe hand, on lead, 4-5 left | +$0.08 +/-0.14 | -$0.18 +/-0.13 | +$0.25 +/-0.13 | +$0.40 +/-0.14 |
| safe hand, on lead, 2-3 left | -$0.90 +/-0.12 | -$0.72 +/-0.11 | -$0.71 +/-0.12 | -$0.38 +/-0.12 |
| can ruff, 2-3 left (safe / not safe) | -$1.88 / -$2.79 | -$1.95 / -$3.12 | -$1.25 / -$3.05 | -$0.51 / -$1.96 |
| another trump behind the sure winner | -$1.15 +/-0.05 | -$0.99 +/-0.05 | -$1.29 +/-0.05 | -$1.40 +/-0.05 |
| can ruff, and the duck throws a singleton | -$1.32 +/-0.18 | -$1.76 +/-0.20 | -$1.47 +/-0.14 | -$1.04 +/-0.10 |

("Safe" = no other trump and a 2, 3 or 4 in every side suit held.)
- EARLY, with a safe hand, taking at once is level to better and makes the bid 3 to 6 points more often. LATE (2 or 3
  cards left) taking now is clearly worse: the seat is put on lead in the danger spot with almost nothing to get out
  with, while a top trump kept to the very end wins the last trick and never has to lead. So the rule the bots
  support is: get in and get out EARLY; if you have left it late, keep the sure winner for the end.
- Matt's exception holds strongly: when the duck throws a singleton it is worth $1.0 to $1.8 more than ruffing.
- With another trump behind the sure winner, do not cash: the second trump becomes a winner too (goes over 45 to 58%).
- Over all moments, every kind of hand and timing mixed, TAKE is worse by $0.69 to $0.81, and cashing two top trumps
  at once is worse than cashing one and letting the network choose ($0.72 to $1.11): a top trump, unlike a side ace,
  cannot be lost by waiting. "Comfortable that you can take zero afterwards" and "early" are both doing real work.
- Limits: plain network in every seat; "sure winners" are top trumps only (side aces only in the scripted hands);
  "safe" is a crude stand-in for Matt's judgement; moments are the first in each deal, as the network's play reached
  them. Not run with card-reading bots.

Follow-ups the same evening (`late.js`, `general.js` with a LOCK split; ordinary underbid deals, plain network;
200,000 to 700,000 deals a size at 4p7, 4p10, 5p8, 6p6). Matt's two ideas: trumps you alone hold are "zombie cards"
to be collected last; and a lone top trump cannot safely be held because someone will lead trumps to put you on lead
late ("knuckling": ruff high with the queen from Q-2, exit with the 2).

KNUCKLE. A trick starts with 2 to 4 cards left and spare tricks out; the leader K has a trump and a non-trump; another
seat V holds the top remaining trump as its only trump and needs exactly one. K leads its lowest trump, against K's
best non-trump lead. K's money, knuckle minus other:

| K has made its bid | 4p7 | 4p10 | 5p8 | 6p6 |
|---|---|---|---|---|
| 2 cards left | +$3.94 +/-0.25 | +$3.92 +/-0.27 | +$3.10 +/-0.25 | +$2.42 +/-0.19 |
| 3 cards left | +$1.85 +/-0.19 | +$2.25 +/-0.21 | +$1.64 +/-0.17 | +$1.36 +/-0.12 |
| 4 cards left | +$0.90 +/-0.14 | +$1.22 +/-0.16 | +$0.86 +/-0.12 | +$0.67 +/-0.08 |

- With 2 cards left the knuckle sends V over 54 to 64% of the time against 11 to 13%, and K itself makes 85 to 89%
  against 41 to 62%: the low trump is K's own safe exit as well as V's trap, exactly as Matt describes.
- It is a move for a seat that has MADE. When K still needs tricks the trump lead costs K $0.66 to $1.14 (it gives away
  a lead K needed); when K is already over it is worth little ($0.03 to $0.14).
- THE BOTS KNUCKLE: the plain network leads a trump here 88 to 92% of the time when it has made. The game's
  card-reading bot (219 sampled moments) does it 75% (4p7) and 69% (5p8). A seat that still needs tricks leads the
  trump 35 to 43% as the network, which looks too often given what it costs; not looked into.

ZOMBIE TRUMPS. A seat holds every remaining trump, needs exactly that many tricks and has other cards. WAIT = never
play a trump while another card may legally be played; CASH = lead the trumps at the first chance. Rare: 708 moments at
4p10, 963 at 5p8 (too few at 4p7 and 6p6).
- WAIT beats CASH by $0.57 +/-0.20 (4p10) and $0.62 +/-0.17 (5p8); on lead by $0.83 and $1.27. The network already
  waits (level with WAIT to within a few cents).
- But the hand is not safe: WAIT still goes over 28% (4p10) and 19% (5p8), almost all of it when the seat is ON LEAD
  at that moment (over 41% and 32%; when following only 7%). The trumps are guaranteed; the other cards are not.

LOCK, by the trumps the others hold (the take-now-or-later test, seats with one top trump needing one): with 2 or 3
cards left, taking now is worse than holding by $0.73 to $1.00 when the others hold two or more trumps and by $1.2 to
$1.3 when they hold exactly one. Moments where the others hold no trump were too few to report (the test takes the
first moment in a deal, which is usually early). So against these bots, which do knuckle, holding a late lock still
beat cashing it late; nothing here measures a table of people who knuckle at every chance.
