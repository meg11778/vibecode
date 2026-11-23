OH HELL - HOW MUCH THINKING IS ENOUGH? (for Bagley)
===================================================

This replaces the earlier "ohhell-think" and "ohhell-fit2" packages: if either
is still waiting, run this one instead. One bot plays the same deals five
ways (the game as it is now, the game as it was a few days ago, and three
ways of thinking harder), to see which earns the most.

Same setup as before: Node.js is all this needs.

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
  Ctrl+C once: it finishes the batches in progress and stops (this can take
  a few minutes). Everything finished is saved; the same command carries on.

To look at progress, in a second command window in this folder:
         node summary.js

When it finishes, send Matt one file:   results.jsonl

Built on Jim Agniel's Oh Hell bid calculator (GNU GPL v3), modified by Matt
Glassman. Source: github.com/meg11778/vibecode
