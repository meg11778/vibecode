// the report on Matt's two hands of 13 November: levels carry a margin, the "as the cards lay" line ends at the real result,
// and the cost between cards on a trick is steady from one run to the next
const { chromium } = require('playwright'), fs=require('fs'), parse=require('./handtext.js');
(async () => { const b = await chromium.launch(); const pg = await b.newPage(); const errs=[]; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('file://'+require('path').resolve(__dirname,'../../../ohhell-play.html')+''); let fail=0; const ok=(c,m)=>{ console.log((c?"ok   ":"FAIL ")+m); if(!c) fail++; };
  for(const [f,actual] of [['matt_5p8_jclub.txt',12-(12+13+11+4+11)/5],['matt_4p7_zero.txt',12-(12+11+12+6)/4]]){
    const r=parse(fs.readFileSync(__dirname+'/hands/'+f,'utf8'));
    const run=sv=>pg.evaluate(([r,sv])=>new Promise(res=>{ r.savedAt=sv; window.__ohhell.assessHand(r,()=>{},a=>res(a)); }),[r,sv]);
    const t0=Date.now(), a=await run("a"), sec=(Date.now()-t0)/1000, a2=await run("b");
    console.log(f+" ("+sec.toFixed(1)+"s)");
    for(const p of a.plays) if(!p.same) console.log("  trick "+(p.trick+1)+" played "+p.played+" best "+p.best+" cost "+p.cost+" ±"+(2*p.se).toFixed(2)+" "+p.verdict+" layouts "+p.layouts+(p.rough?" rough":"")+" | "+p.options.map(o=>o.cards.join("=")+" "+o.worth+"±"+o.pm).join(", ")+" || run 2: "+(q=>q.options.map(o=>o.cards[0]+" "+o.worth).join(", "))(a2.plays.find(x=>x.trick===p.trick)));
    console.log("  as the cards lay: "+a.lay.map(l=>l.worth).join(" "));
    ok(a.version===4 && a.lay.length===r.cards, "one as-the-cards-lay figure per trick");
    ok(Math.abs(a.lay[a.lay.length-1].worth-actual)<0.011, "the line ends at the real result "+actual.toFixed(2));
    ok(a.plays.filter(p=>!p.same).every(p=>p.options.every(o=>o.pm!=null)), "every level has a margin");
    // levels agree between two runs within their margins (allowing both margins)
    let within=0, tot=0; for(const p of a.plays) if(!p.same){ const q=a2.plays.find(x=>x.trick===p.trick); for(const o of p.options){ const o2=q.options.find(x=>x.cards[0]===o.cards[0]); tot++; if(Math.abs(o.worth-o2.worth)<=o.pm+o2.pm+0.05) within++; } }
    ok(within>=0.9*tot, "levels repeat within their margins on "+within+" of "+tot+" choices");
  }
  if(errs.length){ console.log(errs); fail++; } console.log(fail?"FAILED":"all passed"); await b.close(); process.exit(fail?1:0); })();
