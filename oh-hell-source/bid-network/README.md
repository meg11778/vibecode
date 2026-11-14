# Bidding network

A small network that predicts the bid the game's simulation would make from what a bidder sees: hand, turned card, table size, round size, place in the bidding, bids already made. Meant to replace the bid formula as the fast picture of how seats bid (the seats behind you inside a simulation, the likelihood of a bid when reading the auction, the candidates a simulation prices).

- `train_bids.py`: trains it from `bids.jsonl`, the file the seat-value overnight run saves (`../seat-values-overnight`). `python train_bids.py` in the folder holding `bids.jsonl`; writes `bidnet.json` and prints agreement with the simulation and dollars given up, with the formula's figures beside them.
- `bidnet.js`: the same inputs and the forward pass in JavaScript (checked against the Python to 0.00005 on 60 bids).
- `evalbid.js`: the network as a bidder in one seat against the formula, same deals, by seat, in dollars.
- `parity.py`: the Python side of that check.

Status, 14 November 2026: pipeline written and run end to end on a few hundred bids, which is far too few to say anything about quality. First real training waits for the overnight bid file.
