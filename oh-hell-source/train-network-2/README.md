# Oh Hell play engine: robustness run

Retrains the second card-play network (4 seats at no trump, 5 and 6 seats) so
it copes with hands and contracts the earlier runs never dealt it. Prompted by
Matt Glassman's twelve-spade hand at 13-card no trump.

## Run it

    node overnight.js          # 8 hours; Ctrl+C to stop, run again to resume
    node overnight.js 10       # a different number of hours

Needs Node.js and Python with NumPy. Progress is printed and saved in
`gens/log.txt`. The best network so far is always `net_best.json`.

## What is different from the last run

It starts from that run's network (`net_weights.json`) and:

- at no trump, training shuffles all four suits (24 ways), so no suit slot is
  special; with a trump suit it still shuffles the three side suits;
- on 40% of deals, each seat with probability a half bids one to three tricks
  away from the bid model;
- on 15% of deals (rounds of 5 cards and up) one seat is dealt a long suit,
  more than half its cards and up to all of them, and on half of those it bids
  anything from 0 to every trick.

When deals are sampled to fit the auction, a seat that bid off the model is
allowed that much slack (`makeBidCheck` in `table.js`).

Each generation is tested on ordinary deals, as before, and on hard deals
(every deal off-bid, half with a long suit). A new network is kept if it is not
worse on ordinary deals, or if it gives up under 0.05 points there and is
clearly better on the hard ones.

Four seats with a trump suit (the first network) is not part of this run.
