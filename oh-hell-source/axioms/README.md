# Axioms of play, tested

Matt's group has rules of thumb learned at the table. Each one here is written down precisely, tested on the
project's own bots, and marked. Everything is bot against bot: it shows what calculating players do and what a play is
worth against them, not what people do.

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
