"""Train the play network on per-card values written by gen.js or selfplay.js.

    python train.py [epochs]

Settings come from the environment so overnight.js can drive it:
    DATA    file patterns separated by ';'      (default data/n*.bin)
    OUT     where to write the weights           (default net_weights.json)
    HIDDEN  hidden layer widths                  (default 128,128)
    INIT    weights file to start from, optional

NumPy only, so it runs anywhere.

The network outputs one score per card. The target is not "the card the teacher
played" but a distribution built from the teacher's value for every legal card:
cards within a whisker of the best share the credit, clearly worse cards get
almost none. That stops the network being punished for choosing between plays
that are worth exactly the same.

The number to watch is regret: how many Vienna points per decision the
network's choice gives up against the best card, by the teacher's own values.
The rules engine's regret on the same decisions is printed next to it.
"""
import glob, json, sys, time
import numpy as np

import os
meta = json.load(open('encode_meta.json'))
F, NC = meta['F'], 52
HIDDEN = tuple(int(v) for v in os.environ.get("HIDDEN", "128,128").split(","))
OUT = os.environ.get("OUT", "net_weights.json")
TAU = 0.25            # Vienna points; how sharply the target prefers the best card
BATCH = 512
LR = 1e-3
EPOCHS = int(sys.argv[1]) if len(sys.argv) > 1 else 40
rng = np.random.default_rng(0)

rec = np.dtype([('x', 'i1', F), ('h', 'u1'), ('q', '<i2', NC)])
scale = np.array(meta['scale'], dtype=np.float32)
# Suit relabellings used to augment the data. With a trump suit, trump stays in
# slot 0 and the three side suits are shuffled (6 ways). At no trump all four
# suits are equal, so all four are shuffled (24 ways): slot 0 must not be
# special there, which is what went wrong with long spade suits.
import itertools
def suit_perm(frm):
    X, Q = np.arange(F), np.empty(NC, dtype=np.int64)
    for s in range(4):
        for r in range(13):
            Q[s * 13 + r] = frm[s] * 13 + r
            for base in (0, 52, 104, 156):
                X[base + s * 13 + r] = base + frm[s] * 13 + r
        X[208 + s] = 208 + frm[s]
        for seat in range(6):
            X[212 + seat * 10 + 6 + s] = 212 + seat * 10 + 6 + frm[s]
    return X, Q
P24 = [suit_perm(p) for p in itertools.permutations(range(4))]
P6 = [pq for p, pq in zip(itertools.permutations(range(4)), P24) if p[0] == 0]
NT_COL = meta['col']['notrump']

files = sorted(f for pat in os.environ.get("DATA", "data/n*.bin").split(";") for f in glob.glob(pat))
if not files:
    sys.exit("no training data found")
data = np.concatenate([np.fromfile(f, dtype=rec) for f in files])
rng.shuffle(data)
nval = min(20000, len(data) // 10)
val, trn = data[:nval], data[nval:]
print(f'{len(trn)} training decisions, {len(val)} held out')

def unpack(d):
    x = d['x'].astype(np.float32) / scale
    q = d['q'].astype(np.float32) / 100.0
    legal = d['q'] > -32768
    return x, q, legal

def targets(q, legal):
    z = np.where(legal, q, -1e9)
    z = (z - z.max(axis=1, keepdims=True)) / TAU
    p = np.exp(z) * legal
    return p / p.sum(axis=1, keepdims=True)

sizes = (F,) + HIDDEN + (NC,)
W = [rng.normal(0, np.sqrt(2.0 / a), (a, b)).astype(np.float32) for a, b in zip(sizes[:-1], sizes[1:])]
B = [np.zeros(b, dtype=np.float32) for b in sizes[1:]]
INIT = os.environ.get("INIT")
if INIT and os.path.exists(INIT):
    j = json.load(open(INIT))
    if tuple(j['sizes']) == sizes:           # continue from an earlier network
        W = [np.array(w, dtype=np.float32) for w in j['W']]
        B = [np.array(b, dtype=np.float32) for b in j['b']]
        print('starting from', INIT)
params = W + B
mom = [np.zeros_like(p) for p in params]
var = [np.zeros_like(p) for p in params]

def forward(x):
    acts = [x]
    for i in range(len(W)):
        z = acts[-1] @ W[i] + B[i]
        acts.append(np.maximum(z, 0) if i < len(W) - 1 else z)
    return acts

def masked_logp(logits, legal):
    z = np.where(legal, logits, -1e9)
    z = z - z.max(axis=1, keepdims=True)
    e = np.exp(z) * legal
    p = e / e.sum(axis=1, keepdims=True)
    return p

def evaluate(d):
    x, q, legal = unpack(d)
    logits = forward(x)[-1]
    pick = np.where(legal, logits, -1e9).argmax(axis=1)
    best = np.where(legal, q, -1e9).max(axis=1)
    rows = np.arange(len(d))
    regret = best - q[rows, pick]
    hreg = best - q[rows, d['h']]
    # group label: number of seats, with no-trump deals kept apart
    seats = 3 + d['x'][:, meta['col']['seats']:meta['col']['seats'] + 4].argmax(axis=1)
    n = seats * 10 + d['x'][:, meta['col']['notrump']]
    return regret, hreg, n

step = 0
t0 = time.time()
for epoch in range(EPOCHS):
    lr = LR * (0.5 * (1 + np.cos(np.pi * epoch / EPOCHS)))
    order = rng.permutation(len(trn))
    tot = 0.0
    for s in range(0, len(order) - BATCH + 1, BATCH):
        d = trn[order[s:s + BATCH]]
        x, q, legal = unpack(d)
        (X6, Q6), (X24, Q24) = P6[rng.integers(6)], P24[rng.integers(24)]
        nt = (d['x'][:, NT_COL] > 0)[:, None]     # no-trump rows: shuffle all four suits
        x = np.where(nt, x[:, X24], x[:, X6])
        q = np.where(nt, q[:, Q24], q[:, Q6])
        legal = np.where(nt, legal[:, Q24], legal[:, Q6])
        t = targets(q, legal)
        acts = forward(x)
        p = masked_logp(acts[-1], legal)
        tot += -(t * np.log(p + 1e-12)).sum(axis=1).mean()
        g = (p - t) / len(d)
        gW, gB = [None] * len(W), [None] * len(W)
        for i in reversed(range(len(W))):
            gW[i] = acts[i].T @ g
            gB[i] = g.sum(axis=0)
            if i:
                g = (g @ W[i].T) * (acts[i] > 0)
        step += 1
        for j, gr in enumerate(gW + gB):
            mom[j] = 0.9 * mom[j] + 0.1 * gr
            var[j] = 0.999 * var[j] + 0.001 * gr * gr
            mh = mom[j] / (1 - 0.9 ** step)
            vh = var[j] / (1 - 0.999 ** step)
            params[j] -= lr * mh / (np.sqrt(vh) + 1e-8)
    if epoch % 5 == 4 or epoch == EPOCHS - 1:
        r, h, _ = evaluate(val)
        print(f'epoch {epoch + 1:3d}  loss {tot / (len(order) // BATCH):.4f}  '
              f'held-out regret: net {r.mean():.4f}  rules {h.mean():.4f}   [{time.time() - t0:.0f}s]')

r, h, n = evaluate(val)
print('\nheld-out regret per decision (Vienna points)')
print('  table            | decisions |   net   |  rules  | net picks a best card')
for k in sorted(set(n.tolist())):
    m = n == k
    label = f'{k // 10} seats, ' + ('no trump' if k % 10 else 'trump   ')
    print(f'  {label} | {m.sum():9d} | {r[m].mean():.4f}  | {h[m].mean():.4f}  |  {100 * (r[m] < 0.005).mean():.1f}%')

json.dump({'sizes': sizes, 'scale': scale.tolist(),
           'W': [np.round(w, 5).tolist() for w in W], 'b': [np.round(b, 5).tolist() for b in B],
           'trained_on': f'{len(trn)} decisions from {len(files)} files, 4 to 6 seats, trump and no trump, Vienna scoring'},
          open(OUT, 'w'))
print('\nwrote ' + OUT)
