OH HELL - LAYOUTS THAT FIT THE BIDS (overnight run)
===================================================

The bots imagine the hidden hands before choosing a card. On big or overbid
deals most of what they imagine ignores the bids, which makes the table look
softer than it is. This run tests three fixes against the game as it is.

Running it
  1. Unzip this folder.
  2. Open the folder in File Explorer, click in the address bar, type cmd and
     press Enter.
  3. Type this and press Enter (8 is the number of hours; any number works):
         node overnight.js 8
  4. Leave the computer plugged in and awake.

  It leaves two processor threads free. To use fewer, type this first:
         set WORKERS=6

Stopping and starting
  Ctrl+C once: it finishes the batches in progress and stops (can take a few
  minutes). Everything finished is saved; the same command carries on later.

To look at progress, in a second command window in this folder:
         node summary.js

When it finishes, send back one file:   results.jsonl

Built on Jim Agniel's Oh Hell bid calculator (GNU GPL v3), modified by Matt
Glassman. Source: github.com/meg11778/vibecode
