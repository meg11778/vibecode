# Oh Hell play engine: card-reading, money-scored run (network 1)

Four seats with a trump suit, rounds of 2 to 12 cards.

    node overnight.js          # 8 hours; Ctrl+C to stop, run again to resume
    node overnight.js 10       # a different number of hours

Needs Node.js and Python with NumPy. Progress is in `gens/log.txt`; the best
network so far is `net_best.json`.

What is new:

- The network has 418 inputs instead of 262: the extra 156 say which cards
  each other seat has played. `net_weights.json` is the current network
  widened with `convert.js`; the new inputs start with zero weight, so it
  plays exactly as before (checked: 8,352 decisions, none different).
- The teacher (`reader.js`) weights its imagined layouts of the hidden cards
  by how likely the network would have been to make each opponent's actual
  plays, then runs its playouts on those. In a test on 12 November 2026 this
  teacher beat the plain one by 0.24 +/-0.13 points a round at 8 cards and
  0.52 +/-0.24 at 11.
- Playouts are scored in money: the seat's points less the table's average.
  All figures in the log are dollars a round.

It keeps the last run's hard deals: 40% with off-model bids, 15% with a long
suit. The teacher costs about five times as much per decision as the old one,
so a generation records 10,000 decisions per round size instead of 30,000.
