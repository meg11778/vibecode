# Oh Hell play engine: robustness run for the first network

Retrains the four-seat trump network (rounds of 2 to 12 cards) on the hands
and contracts its first run never dealt it.

    node overnight.js          # 8 hours; Ctrl+C to stop, run again to resume
    node overnight.js 10       # a different number of hours

Needs Node.js and Python with NumPy. Progress is in `gens/log.txt`; the best
network so far is `net_best.json`.

It starts from `net_weights.json` (generation 20 of the first run) and:

- on 40% of deals, each seat with probability a half bids one to three tricks
  away from the bid model;
- on 15% of deals (rounds of 5 cards and up) one seat is dealt a long suit,
  more than half its cards, and on half of those bids anything.

Each generation is tested on ordinary deals and on hard deals (every deal
off-bid, half with a long suit). A new network is kept if it is not worse on
ordinary deals, or if it gives up under 0.05 points there and is clearly better
on the hard ones.
