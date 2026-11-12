# Card-reading teacher: test of 12 November 2026

`reader.js` values each legal card by playouts, like the rollout teacher, but
first weights the imagined layouts of the hidden cards by how likely the
network would have been to make each opponent's actual plays (softmax of its
scores, sharpness 2, floor 0.02; 360 candidate layouts resampled to 30).

`readtest.js` plays the same deals three ways in one seat, the network in the
other three: network, plain rollout teacher, card-reading teacher. Four seats
with trump, 30 playouts per card. It needs the files of `train-network-1`
alongside (with `history` added to the observation in `table.js`) and the
network as `net.json`. `node sumup.js` totals `res_8.txt` and `res_11.txt`:

| cards | deals | reader over plain teacher | reader over network | plain over network | made: net / plain / reader | hidden cards placed in the right hand: plain / reader |
|---|---|---|---|---|---|---|
| 8 | 5,400 | +0.237 +/-0.131 | +0.148 +/-0.130 | -0.089 +/-0.131 | 61.8 / 61.1 / 63.4% | 0.165 / 0.217 |
| 11 | 2,160 | +0.519 +/-0.235 | +0.297 +/-0.251 | -0.222 +/-0.246 | 60.9 / 59.0 / 64.2% | 0.284 / 0.359 |

Points per round, own points (not money). Only these two round sizes and this
one setting were run at length.
