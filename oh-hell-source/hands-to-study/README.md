# Interesting hands to study

Hands where the bots are probably not wrong, but their play or the report's verdict differs from how Matt would play
it at the table. The aim is to work out the logic on both sides: what the bot is counting on, and what Matt's habit
is counting on. (Hands where a bot looks plainly wrong are bugs, and go to the engine conversation and the test
suite. Rules of thumb tested over thousands of deals are in `../axioms/`.)

## How a hand is studied

1. Matt pastes the hand from the game ("Save or share" on the review gives the text) and says which decision puzzles
   him and what he would have played.
2. Claude replays that exact position in node, with the same code the game runs: a seat's choice depends only on its
   own cards and what has been played, so the position can be rebuilt exactly. It reports
   - how often the bot picks each card (the bots sample, so a close choice is not always the same card);
   - what each card is worth in dollars and how often it makes the bid, at Normal and at Very high precision;
   - what the bot believes about the hidden cards, grouped into the few cases that matter, and what each card does
     in each case. This is usually where the logic shows.
3. Say plainly what is the bot's belief (how these bots bid and play) and what would differ against people.
4. If the two views still disagree after that, test it as an axiom over many deals.
5. Save the hand in `../engine/browser-tests/hands/` and the replay script here, with a few lines in the list below.

Templates: `../read-calibration/north_t4.js` (one decision, belief table), `k_or_2.js` and `book1_replay.js` (Matt's
book hand), `lead_5p3.js` (opening lead), `east_truth.js` (what a seat would do with each possible holding).
`OHHELL_ENGINE` must point at a folder holding `ohhell-play.html`.

Points to remember:
- Check the bot's own figures against real play-outs of the same line when a hand type can be dealt many times.
  That is how the "layouts that ignore the bids" error was found (21 Nov 2026).
- When Matt quotes a verdict that looks wrong, first ask whether it is a stored report from before a fix (reports
  are version 8 since 21 Nov 2026).
- Everything is measured against these bots, never against people.

## Hands so far (studied in the main conversation before this list existed)

- Zero bid, 4 players 4 cards, throw the 10♦ or keep the 4♠ (`matt_4p4_discard.txt`): the report's "level" verdict
  was right for these bots; East's own 5♦ throw was a noise mistake, since reduced.
- Book hand 1, 5 players 4 cards, king or two of trumps at trick 3 (`matt_5p4_book_hand1.txt`): the two, by about
  $0.42; the king loses to a lone ace behind (17%), the two only to a low lead from the ace (13%).
- Opening lead with 9♦ 3♦ 2♣, bid 1, 5 players 3 cards, table over (`matt_5p3_trump_lead.txt`): a trump lead beats
  the club by about $1.17 by stripping lone trumps.
- Zero-bid discard, 6♠ 6♥ 9♣ 7♣ (`matt_5p4_zero_discard.txt`): singleton or top of the doubleton; became the
  discard study (`../zero-discard/`).
- North's duck with Q-4 of trumps needing one trick, 4 players 7 cards (`matt_4p7_north_duck.txt`): the 4, because
  after the queen wins the 4 is a second winner; the 4 works when the last player holds one middling trump (11%).

## Hands studied in the hands-to-study conversation (from 22 Nov 2026)

- Win the trump ace, then what? 5 players, 9 cards, spades trump (5♠ turned); third seat A♠ 2♠ A♥ 4♥ 3♥ 2♥ J♣ 4♣ 2♦,
  bids 0 0 2 4 2 (one under), a zero bidder leads the 4♠ (`matt_5p9_ace_then_what.js`; a described position, so there
  is no game text in `hands/`; bids and hand can be changed on the command line). 6,000 layouts fitted to the bids
  and the lead, network in every seat after the forced cards: A♠ then 2♦ $1.10 (makes 92%), A♠ then A♥ $1.00 (92%),
  A♠ then J♣ $0.95 (91%), duck with the 2♠ $0.75 (86%); 2♦ minus J♣ +$0.15 ±0.05, A♥ minus J♣ +$0.05 ±0.05, 2♦ minus
  A♥ +$0.09 ±0.05. The card-reading bot wins the ace 90% (100% at 10x precision) and then leads the 2♦ 70% (100% at
  10x). Why: the J♣ wins only 20% of the time (no layout has every higher club undealt), so it mostly gives up the lead
  and delays the A♥, which stands up 87% now and less later; the 2♦ keeps both chances and adds the 2♠ as a ruffing
  trick (it takes a trick on 20% of layouts, against 8% after the J♣ and 4% after the A♥). The differences are small.
  Failures (share of layouts, 2♦ / A♥ / J♣ / duck): one short 4.3 / 4.6 / 7.4 / 8.4%, over 4.0 / 3.5 / 2.0 / 5.3%. Short
  is the A♥ trumped (mostly by the seat that bid 4) or stranded: held to the last trick because you never regained
  the lead and no live heart was led (J♣ line 2.6% + 0.6% where the heart led was already trumped; 2♦ line 1.6% +
  0.5%). That is not a network misplay (`WHY=1` shows it). Over is mostly the J♣ winning a club trick when following.
  Split: J♣ wins trick 2 (20%): makes 98.5%; loses (80%): makes 88.6%. A♥ wins (87%): 96.3%; trumped (13%): 62.8%.
  Over-ducking opponents (`DUCK=1`): the bots beat the jack with a higher club while holding one below it on 55% of
  layouts. If such a seat ducks 25 / 50 / 75 / 100% of the time, the J♣ line is worth $1.09 / $1.21 / $1.34 / $1.52
  (makes 92.0 / 93.2 / 94.6 / 96.4%); it draws level with the 2♦ line ($1.10) at about 25% and leads by $0.12 ±0.05
  at 50%. Only the trick-2 club is changed; a table that ducks everywhere is not modelled.
  After the J♣ wins trick 2 (`T3=1`, 1,211 layouts): every lead but the A♥ makes 98 to 98.5% (±0.4) and loses trick 3
  (the 4♣ wins it 1.6%). By money: 4♣ $2.07, small heart $1.97 to $2.00, 2♦ $1.86, 2♠ $1.62 (4♣ minus 2♠ +$0.45
  ±0.07); the gap is opponents busted (1.50 after the 4♣, 1.36 after the 2♠). The A♥ wins 87% and makes 13%.
  The card-reading bot at that lead (`RB=1`, 12 sampled positions): 4♣ 80% at Normal (small heart 13%, 2♦ 7%), 92% at
  10x; never the 2♠ or A♥; its own figures (4♣ $2.14 to $2.24, small heart $1.91 to $1.97, 2♦ $1.82 to $1.88, 2♠ about
  $1.5) match the play-outs. The plain network alone earns $1.77 there, about $0.30 under the best lead.
  Who goes down after each trick-3 lead (a busted zero bidder is worth 14/5 = $2.80 here, another seat $2.00): zero
  bidders busted per hand 0.75 after the 4♣, 0.71 after a small heart, 0.69 after the 2♦, 0.54 after the 2♠; the
  other two seats 0.75 / 0.76 / 0.72 / 0.83. That accounts for the whole money gap (4♣ over 2♠: +$0.60 from zero
  bidders, -$0.15 from the others).
- Ruff or pitch at trick 1? 5 players, 4 cards, hearts trump (K♥ turned), bids 0 1 1 1 0 (one under); a zero bidder's
  8♦ is winning, you hold Q♥ 10♠ 6♠ 3♠ needing one, the other zero bidder (dealer) still to play
  (`matt_5p4_ruff_or_pitch.txt`, `matt_5p4_ruff_or_pitch.js`). The report is right: 4,000 layouts, ruff $2.63 (makes
  97.0%), throw the 10♠ or 6♠ $2.99 (makes 86.4%), +$0.36 ±0.06; the 3♠ $2.76. Throwing leaves the trick with one of
  the two zero bidders every time (NW 67%, West forced to win 33%): zero bidders busted per hand 1.12 against 0.42,
  worth +$1.25 at $1.80 each, against -$0.85 for your own bonus. The card-reading bot throws a spade 96% (100% at
  10x). The throw loses only when the A♥ is out (27% of layouts: makes 52 to 84% there, 92% otherwise).
