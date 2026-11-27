Oh Hell answer key: overnight run (27 November 2026)

What it does: at decisions in the middle of a hand (4 or 5 cards still hidden in each other hand) and late in 5- and
6-player hands, it works out each card's value exactly for the bots' own beliefs, then checks how often the game's
bots and the mistake report get the same answer.

To run (Windows):
1. Unzip this folder somewhere, for example your Desktop.
2. Open the folder, click in the address bar at the top, type  cmd  and press Enter. A black window opens.
3. Type:   node overnight.js 8      and press Enter.   (8 = hours; any number works)
4. Leave it. It prints a line every few minutes. Ctrl+C stops it safely; running the same command again adds more.
5. When done, send back the file  results.jsonl  from this folder.

To look yourself:   node summary.js results.jsonl
