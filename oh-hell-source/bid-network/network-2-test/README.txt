OH HELL - BIDDING NETWORK 2 AND CLOSE CALLS (for Bagley)
========================================================

Two tests, both too small an effect to measure on a laptop:

  1. Does the second bidding network win more money than the first when the
     bots use it as their picture of how the other players bid?
  2. Does giving the card-reading bots more imagined layouts on close
     decisions (switched on in the game on 17 November) win more money?

Same setup as last time: Node.js is all this needs (no Python).

Running it
  1. Unzip this folder.
  2. Open the folder in File Explorer, click in the address bar, type cmd and
     press Enter.
  3. Type this and press Enter (8 is the number of hours; any number works):
         node overnight.js 8
  4. Leave the computer on and awake, as before.

  It prints a line each time it starts a new pass. It leaves four processor
  threads free. For a quieter, cooler run use fewer workers:
         set WORKERS=12
         node overnight.js 8

Stopping and starting
  Ctrl+C once: it finishes the batches in progress and stops. Everything
  finished is saved; the same command carries on later.

To look at progress, in a second command window in this folder:
         node summary.js

When it finishes, send Matt one file:   results.jsonl

Built on Jim Agniel's Oh Hell bid calculator (GNU GPL v3), modified by Matt
Glassman. Source: github.com/meg11778/vibecode
