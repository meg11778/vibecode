OH HELL - THE BID CALCULATOR'S PICTURE OF THE OTHER BIDDERS (for Matt's laptop)
==============================================================================

The bid calculator still uses the old bid formula to guess how the other
seats bid. This run tests the calculator with the bidding network doing that
job instead, on the same deals, and keeps the difference in dollars.

Running it
  1. Unzip this folder.
  2. Open the folder in File Explorer, click in the address bar, type cmd and
     press Enter.
  3. Type this and press Enter (8 is the number of hours; any number works):
         node overnight.js 8
  4. Leave the laptop plugged in and awake.

Stopping and starting
  Ctrl+C once: it finishes the batches in progress and stops (can take a few
  minutes). Everything finished is saved; the same command carries on later.

To look at progress, in a second command window in this folder:
         node summary.js

When it finishes, send back one file:   results.jsonl

Built on Jim Agniel's Oh Hell bid calculator (GNU GPL v3), modified by Matt
Glassman. Source: github.com/meg11778/vibecode
