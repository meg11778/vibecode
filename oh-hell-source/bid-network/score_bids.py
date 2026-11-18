"""Train the bidding network on the bids saved by the seat-value run.

    python train_bids.py [epochs]          (default 30)

Reads bids.jsonl (set BIDS to point somewhere else), writes bidnet.json and
prints, for bids held out of training:
  - how often the network bids what the simulation bid, and how often the bid
    formula does;
  - what each gives up, in dollars a bid, against the simulation's best bid by
    the simulation's own figures ("regret").

The network sees what a bidder sees: its hand, the turned card, the table
size, the round size, its place in the bidding and the bids already made. The
target is not only the bid the simulation chose but a spread over the bids it
tried, by how close each came to the best in money, so two bids worth the same
share the credit. NumPy only.

Modified from Jim Agniel's Oh Hell calculator (GPL v3) by Matt Glassman.
"""
import json, os, sys, time
import numpy as np

BIDS = os.environ.get("BIDS", "bids.jsonl")
OUT = os.environ.get("OUT", "bidnet.json")
HIDDEN = tuple(int(v) for v in os.environ.get("HIDDEN", "128,128").split(","))
EPOCHS = 0
TAU, BATCH, LR, NB = 0.25, 512, 1e-3, 14
F = 102
rng = np.random.default_rng(0)

def features(P, n, turned, pos, hand, prior):
    """The inputs, 102 numbers. bidnet.js builds the same list; keep the two in step."""
    x = np.zeros(F, dtype=np.float32)
    trump = turned // 13 if turned >= 0 else -1
    masks = [0, 0, 0, 0]
    for c in hand: masks[c // 13] |= 1 << (c % 13)
    side = [s for s in range(4) if s != trump]
    side.sort(key=lambda s: (-bin(masks[s]).count("1"), -masks[s]))      # side suits are interchangeable: longest first
    order = ([trump] if trump >= 0 else []) + side
    for k, s in enumerate(order):
        base = 13 * k
        for r in range(13):
            if masks[s] >> r & 1: x[base + r] = 1
    o = 52
    if trump >= 0: x[o] = 1; x[o + 1 + turned % 13] = 1
    o += 14
    x[o + P - 4] = 1; o += 3
    x[o + n - 1] = 1; o += 13
    x[o + pos] = 1; o += 6
    x[o] = 1 if pos == P - 1 else 0; o += 1
    B = sum(prior)
    x[o] = B / n; x[o + 1] = (n - B) / n; o += 2
    for j, b in enumerate(prior): x[o + j] = b / n; x[o + 5 + j] = 1
    o += 10
    x[o] = sum(1 for b in prior if b == 0) / 5.0
    return x

t0 = time.time()
X, T, LEG, EDGE, HAVE, CH, FM, PN = [], [], [], [], [], [], [], []
with open(BIDS) as fh:
    for line in fh:
        line = line.strip()
        if not line: continue
        r = json.loads(line)
        P, n, pos, prior = r["P"], r["n"], r["p"], r["pr"]
        legal = np.zeros(NB, dtype=bool); legal[: n + 1] = True
        if pos == P - 1 and 0 <= n - sum(prior) <= n: legal[n - sum(prior)] = False
        edge = np.full(NB, -1e9, dtype=np.float32); have = np.zeros(NB, dtype=bool)
        if r.get("tb"):
            for b, e, _ in r["tb"]: edge[b] = e; have[b] = True
            z = (edge - edge[have].max()) / TAU
            t = np.exp(z) * have; t /= t.sum()
        else:
            t = np.zeros(NB, dtype=np.float32); t[r["b"]] = 1
        X.append(features(P, n, r["t"], pos, r["h"], prior)); T.append(t); LEG.append(legal); EDGE.append(edge); HAVE.append(have); CH.append(r["b"]); FM.append(r["f"]); PN.append((P, n, pos))
X = np.array(X, dtype=np.float32); T = np.array(T, dtype=np.float32); LEG = np.array(LEG); EDGE = np.array(EDGE); HAVE = np.array(HAVE); CH = np.array(CH); FM = np.array(FM); PN = np.array(PN)
N = len(X)
print(f"{N} bids read in {time.time() - t0:.0f}s")

def forward(x):
    acts = [x]
    for i in range(len(W)):
        z = acts[-1] @ W[i] + b[i]
        acts.append(np.maximum(z, 0) if i < len(W) - 1 else z)
    return acts

def probs(logits, legal):
    z = np.where(legal, logits, -1e9); z = z - z.max(axis=1, keepdims=True)
    p = np.exp(z) * legal
    return p / p.sum(axis=1, keepdims=True)

def report(idx, label):
    p = probs(forward(X[idx])[-1], LEG[idx]); pick = p.argmax(axis=1)
    rows = np.arange(len(idx)); e, h = EDGE[idx], HAVE[idx]; best = np.where(h, e, -1e9).max(axis=1); priced = h.any(axis=1)
    def score(choice):
        ok = priced & h[rows, choice]
        return (choice == CH[idx]).mean() * 100, (best[ok] - e[rows, choice][ok]).mean() if ok.any() else float("nan"), 100 * (priced & ~h[rows, choice]).sum() / max(1, priced.sum())
    a, g, o = score(pick); fa, fg, fo = score(FM[idx])
    loss = -(T[idx] * np.log(p + 1e-9)).sum(axis=1).mean()
    print(f"{label}: loss {loss:.3f} | network: same bid as the simulation {a:.1f}%, gives up ${g:.3f} a bid ({o:.1f}% outside the bids it priced) | formula: {fa:.1f}%, ${fg:.3f} ({fo:.1f}% outside)")
    return a, g


allidx = np.arange(N)
for path in sys.argv[1:]:
    d = json.load(open(path)); W = [np.array(w, dtype=np.float32) for w in d["W"]]; b = [np.array(v, dtype=np.float32) for v in d["b"]]
    print("\n" + path + "  (" + d.get("trained_on", "") + ")")
    report(allidx, "  all bids")
    for P in (4, 5, 6):
        idx = allidx[PN[:, 0] == P]
        if len(idx): report(idx, f"  {P} players ({len(idx)})")
    idx = allidx[PN[:, 2] == PN[:, 0] - 1]
    if len(idx): report(idx, f"  dealer ({len(idx)})")
picks = []
for path in sys.argv[1:]:
    d = json.load(open(path)); W = [np.array(w, dtype=np.float32) for w in d["W"]]; b = [np.array(v, dtype=np.float32) for v in d["b"]]
    picks.append(probs(forward(X)[-1], LEG).argmax(axis=1))
if len(picks) == 2: print(f"\nthe two networks choose the same bid {100 * (picks[0] == picks[1]).mean():.1f}% of the time")
