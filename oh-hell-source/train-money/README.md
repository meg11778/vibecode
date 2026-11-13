# Oh Hell play engine: money-scored run, both networks

    node overnight.js          # 10 hours: 5 for each network
    node overnight.js 12       # a different total

Needs Node.js and Python with NumPy. Safe to stop and start again with the
same command.

Each network keeps its inputs and starts from the one now in the pages. The
only change is what a playout is worth: the seat's points less the table's
average ($1 a point) instead of its own points. The aim is a network whose
habits already include busting others and refusing tricks that let them off,
so that the game's card-reading bots, whose playouts continue with the
network, value those plays properly.

- `net1/`: four seats with a trump suit, rounds of 2 to 12 cards.
- `net2/`: four seats at no trump, five and six seats.

When it finishes, send `net1/net_best.json`, `net1/gens/log.txt`,
`net2/net_best.json` and `net2/gens/log.txt`.
