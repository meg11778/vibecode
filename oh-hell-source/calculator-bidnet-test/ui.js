const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
for(const h of ['#h=AS.KS.7D.4H.9C&p=4&s=2&b=1.2&tc=9D&go=1','#h=AS.KS.7D.4H.9C&p=4&s=2&b=1.2&t=D&go=1','#h=AS.KS.7D.4H&p=5&s=4&b=1.0.2.1&tc=9S&go=1']){
 await p.goto('about:blank');await p.goto('file:///home/claude/ohhell-engine/'+(process.argv[2]||'ohhell.html')+h);await p.waitForFunction(()=>document.getElementById('results').style.display!=='none'&&!document.getElementById('run').disabled,null,{timeout:120000});
 const r=await p.evaluate(()=>({net:typeof bidNetProbs,best:results.views.all.best,rows:results.views.all.rows.map(r=>r.bid+':'+(r.delta==null?'-':r.delta.toFixed(2))).join(' '),diag:document.getElementById('diag').textContent.slice(0,160)}));console.log(h,JSON.stringify(r));}
console.log('errors',errs.length,errs.slice(0,3));await b.close();})();
