# Answer key for late positions

Started 27 November 2026, on the recommendation of the outside review (`../outside-review/`).

The game's card reading and its mistake report both estimate one quantity by sampling: each legal card's average
money over every layout of the hidden cards, weighted by how well the layout explains the bids (bidding network) and
the cards played (card-play network, `READ.beta`, `READ.eps`), with the plain network playing on. `key.js` works that
quantity out without the game's sampler. The weight of a layout is a product of one factor per seat (each factor
depends only on that seat's hand and public information), so every hand each seat could hold is listed with its
factor, and layouts are then drawn exactly in proportion to weight, or all listed when few. No fitting budget, no
resampling of a few candidates, no dealing step.

    node key.js <players> <cards> <deals> <seed> [most cards hidden in one hand = 3] [reader seeds = 30] [report seeds = 10] > out.jsonl
    node summary.js out.jsonl ...

Deals are bid by draws from the bidding network and played by the plain network; one late decision a deal is taken
at random. Each line has the key, the live reader's pick on each seed, the report's sums on each seed for the card the
network played, and what every choice earns on the deal as it really lay.

Checks on the key itself: listing every layout and exact drawing (20,000) agree on 44 positions (largest difference
in a gap $0.064, mean $0.003). Against the real deal the key's values are unbiased (-$0.03 +/-0.29).

## First result, 27 November 2026 (`results/`, 109 decisions: 60 at 4 players 7 cards, 50 at 10 cards; 3 or fewer cards hidden in each hand)

- LIVE READER: gives up $0.008 +/-0.005 a late decision against the key (the plain network's own play: $0.155
  +/-0.125). Where the key separates the best card by $0.25 or more (half the decisions) it picks another card 1.8% of
  the time; the plain network 16%. The errors sit in thin reads: reads carried by under 10 layouts are wrong 6.1%
  ($0.043 given up), 10 to 30 layouts 2.5%, over 30 layouts 0.2%.
- REPORT: no inflation seen here (reported cost minus the key's +$0.007 +/-0.012; a play that is really best or level
  is charged $0.012 on average). Plays the key calls fine are flagged as mistakes 0.3% of the time. Plays the key
  calls mistakes are passed as fine 16% of the time and "too close to call" 13% (90 reports from 9 decisions: small).
  Worst case: 4p10 seed 12 deal 32, a $2.15 mistake reported as major 6 times in 10, close 3, fine once, with 4 to 12
  layouts carrying the read.
- So in late positions the sampler is close to its own target, and the trouble that exists is weight collapse (few
  layouts carrying the read), not the selection effect or the early stop the review suggested. Those two were not
  seen to matter HERE; decisions here mostly have two or three choices, and the selection effect grows with the number
  of near-equal choices, so earlier positions are not covered by this.

Limits: 109 decisions, 4 players only; run before the positions the project already knows are troublesome (openings,
mid-hand) because the key needs every possible hand of each seat listed: 3 cards hidden is about 5,000 hands a seat,
5 cards about 300,000. Exact for these beliefs and this continuation only; says nothing about play against people.
