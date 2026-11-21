const fs=require('fs'), D=JSON.parse(fs.readFileSync('d.json','utf8'));
const W=1200,H=700,top=150,bot=H-120,y0=-1.2,y1=0.45,Y=v=>top+(y1-v)/(y1-y0)*(bot-top);
const blue='#2f6fb3',red='#c2553f',ink='#1c2430',mute='#6b7480',grid='#e4e7eb',bg='#fbfaf7';
const panels=[[4,90,320],[5,385,690],[6,755,1165]]; let s='';
for(const v of [0.4,0.2,0,-0.2,-0.4,-0.6,-0.8,-1.0,-1.2]){ s+=`<line x1="80" x2="${W-30}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v===0?'#8a929c':grid}" stroke-width="${v===0?1.5:1}"/><text x="70" y="${Y(v)+5}" text-anchor="end" font-size="15" fill="${mute}">${v===0?'$0':(v>0?'+':'−')+'$'+Math.abs(v).toFixed(2)}</text>`; }
for(const [P,xa,xb] of panels){ const d=D[P], k=d.seats.length, slot=(xb-xa)/k, bw=Math.min(46,slot*0.72);
  s+=`<text x="${(xa+xb)/2}" y="${top-28}" text-anchor="middle" font-size="21" font-weight="700" fill="${ink}">${P} players</text>`;
  d.seats.forEach((t,i)=>{ const cx=xa+slot*(i+0.5), dealer=i===k-1, c=dealer?red:blue, ya=Y(Math.max(t.ev,0)), yb=Y(Math.min(t.ev,0)), h=yb-ya, r=5;
    const path = t.ev>=0 ? `M${cx-bw/2},${yb} V${ya+r} Q${cx-bw/2},${ya} ${cx-bw/2+r},${ya} H${cx+bw/2-r} Q${cx+bw/2},${ya} ${cx+bw/2},${ya+r} V${yb} Z`
                         : `M${cx-bw/2},${ya} V${yb-r} Q${cx-bw/2},${yb} ${cx-bw/2+r},${yb} H${cx+bw/2-r} Q${cx+bw/2},${yb} ${cx+bw/2},${yb-r} V${ya} Z`;
    s+=`<path d="${path}" fill="${c}"/>`;
    s+=`<text x="${cx}" y="${t.ev>=0?ya-9:yb+22}" text-anchor="middle" font-size="16" font-weight="600" fill="${ink}">${t.ev>=0?'+':'−'}$${Math.abs(t.ev).toFixed(2)}</text>`;
    s+=`<text x="${cx}" y="${bot+28}" text-anchor="middle" font-size="15" fill="${dealer?ink:mute}" font-weight="${dealer?700:400}">${dealer?'Dealer':i===0?'1st':i===1?'2nd':i===2?'3rd':(i+1)+'th'}</text>`; }); }
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif">
<rect width="${W}" height="${H}" fill="${bg}"/>
<text x="40" y="52" font-size="30" font-weight="700" fill="${ink}">What each seat is worth in Oh Hell</text>
<text x="40" y="82" font-size="17" fill="${mute}">Average dollars won or lost per hand at $1 a point, by bidding order, averaged over every round size. Bot against bot.</text>
${s}
<text x="${W/2}" y="${bot+58}" text-anchor="middle" font-size="15" fill="${mute}">Bidding order (1st = left of the dealer, bids and leads first)</text>
<text x="40" y="${H-22}" font-size="13" fill="${mute}">13,500 simulated deals per round size. Each bar is good to about ±$0.02. Vienna scoring, dealer hooked. The project's own bots, not people.</text>
</svg>`;
fs.writeFileSync('seat-values-by-seat.svg',svg);
(async()=>{const {chromium}=require('playwright');const b=await chromium.launch();const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:2});await p.setContent(`<body style="margin:0">${svg}</body>`);await p.screenshot({path:'seat-values-by-seat.png'});await b.close();})();
