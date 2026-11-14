import json, sys, numpy as np, importlib.util, os

A=sys.argv[:]; sys.argv=sys.argv[:1]
src=open('train_bids.py').read().split('t0 = time.time()')[0]
ns={}; exec(src, ns)
net=json.load(open(A[2])); W=[np.array(w,dtype=np.float32) for w in net["W"]]; b=[np.array(v,dtype=np.float32) for v in net["b"]]
out=[]
for line in list(open(A[1]))[:60]:
    r=json.loads(line); x=ns["features"](r["P"],r["n"],r["t"],r["p"],r["h"],r["pr"]); h=x
    for i in range(len(W)):
        h=h@W[i]+b[i]
        if i<len(W)-1: h=np.maximum(h,0)
    out.append([round(float(v),4) for v in h])
json.dump(out,open(A[3],'w'))
