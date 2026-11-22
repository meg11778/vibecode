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
