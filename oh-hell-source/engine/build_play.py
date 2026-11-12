"""Build ohhell-play.html: the table (play_template.html), the engine section of ohhell.html and the bid simulation (simbid_block.js)."""
h=open('ohhell.html').read().split('\n')
a=next(i for i,l in enumerate(h) if '===== cards:' in l); b=next(i for i,l in enumerate(h) if '===== UI =====' in l)
open('ohhell-play.html','w').write(open('play_template.html').read().replace('/*__ENGINE__*/','\n'.join(h[a:b])).replace('/*__SIMBID__*/',open('simbid_block.js').read()))
print('built ohhell-play.html')
