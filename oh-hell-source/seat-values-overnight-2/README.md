# Seat values and bids, second round (overnight run)

The bots now bid by simulation with the bidding network as their picture of the other bidders. This run plays every round size at 4, 5 and 6 players with those bots in every seat.

    node overnight.js 16       16 hours, every processor core (default 8)
    node summary.js            the seat table so far
    python train_bids.py       afterwards: trains the second bidding network from bids.jsonl (a few minutes)

Send back `results.jsonl` and, after training, `bidnet.json` with the lines the trainer prints. `bids.jsonl` is large and stays on the computer. Stopping early with Ctrl+C keeps everything finished; running again carries on. If `python` reports that numpy is missing, use `py train_bids.py`.

Modified from Jim Agniel's Oh Hell calculator (GPL v3) by Matt Glassman.
