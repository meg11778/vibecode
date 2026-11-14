# Seat values with simulation bidding (overnight run)

What each seat is worth at every round size, with every seat bidding by the game's simulation (150 sampled deals a bid) instead of the bid formula. The formula version is in `../seat-values` (chart and data).

    node overnight.js          8 hours, every processor core
    node overnight.js 10       10 hours
    node summary.js            the table so far

Each finished batch of 100 deals is added to `results.jsonl` at once. Stopping early with Ctrl+C keeps everything finished; running it again carries on. Send back `results.jsonl`.

Files: `posmap.js` (one round size), `ohhell.html` and `simbid_block.js` (the engine and the bid simulation, copies of the ones in `../engine`).
Modified from Jim Agniel's Oh Hell calculator (GPL v3) by Matt Glassman.
