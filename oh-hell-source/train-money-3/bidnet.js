/* The bidding network (as built into the game page), for use in node. bidNetProbs(P, n, turned, pos, hand, prior)
   gives the chance of each bid 0..n for the seat bidding in place `pos` (0 = first) holding `hand`, after the bids
   in `prior`. It was trained on what the game's simulation bidders bid, so it stands in for today's bots. */
const fs = require('fs'), path = require('path');
module.exports = new Function(fs.readFileSync(path.join(__dirname, 'bidnet_block.js'), 'utf8') + '\nreturn { bidNetProbs, bidNetCovers };')();
