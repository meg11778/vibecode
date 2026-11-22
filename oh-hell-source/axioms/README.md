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
