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
