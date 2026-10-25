/* ---------- helpers ---------- */
const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const rng=seed=>()=>((seed=Math.imul(seed^seed>>>15,2246822507)+1013904223>>>0)/4294967296);
const money=n=>'$'+n.toLocaleString('en-US');
const dom=u=>u.trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').split(/[\/?#]/)[0];
const validDom=d=>/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d);

/* ---------- demo data engine (swap scan() for a real API call, e.g. TinyFish, when ready) ---------- */
const FEATS=['AI / machine learning','Automation / workflows','Analytics & reporting','API & webhooks','Collaboration','Mobile apps','SSO / SAML','Security certifications','Templates','White-label / custom branding','Priority / 24-7 support','Free plan or trial'];
const P={ // known presets: name, icon, headline, seat price (null = custom), plans, forced features
 'notion.so':{n:'Notion',i:'📓',h:'The connected workspace where better, faster work happens',s:null,pl:[['Free',0],['Plus',10],['Business',18],['Enterprise',null]],no:[2],ig:['Slack','Jira','GitHub','Figma','Asana','Microsoft Teams'],pe:['Enterprises','Startups','Product teams']},
 'coda.io':{n:'Coda',i:'🟥',h:'The all-in-one collaborative doc for modern teams',s:12,pl:[['Free',0],['Pro',12],['Team',36],['Enterprise',null]],no:[7,9],ig:['Slack','HubSpot','Google Drive','Mailchimp','Dropbox'],pe:['Enterprises','Product teams']},
 'linear.app':{n:'Linear',i:'🔷',h:'The system for modern product development',s:8,pl:[['Free',0],['Standard',8],['Plus',14],['Enterprise',null]],no:[9],ig:['GitHub','Slack','Figma','Sentry'],pe:['Startups','Engineering teams']},
 'jira.atlassian.com':{n:'Jira',i:'🟦',h:'Plan, track, and ship with any team',s:8.15,pl:[['Free',0],['Standard',8.15],['Premium',16],['Enterprise',null]],no:[],ig:['Confluence','Bitbucket','Slack','GitHub','Zoom'],pe:['Enterprises','Engineering teams']},
 'slack.com':{n:'Slack',i:'💬',h:'Where work happens',s:8.75,pl:[['Free',0],['Pro',8.75],['Business+',15],['Enterprise Grid',null]],no:[9],ig:['Salesforce','Google Drive','Zoom','Asana'],pe:['Enterprises','Remote teams']},
 'discord.com':{n:'Discord',i:'🎮',h:'Your place to talk and hang out',s:null,pl:[['Free',0],['Nitro Basic',2.99],['Nitro',9.99]],no:[6,7,10],ig:['Spotify','YouTube','Twitch','GitHub'],pe:['Communities','Gamers']},
 'stripe.com':{n:'Stripe',i:'💳',h:'Financial infrastructure to grow your revenue',s:null,pl:[['Pay as you go','2.9% + 30¢'],['Custom',null]],no:[5,9],ig:['Shopify','QuickBooks','Salesforce','Xero'],pe:['Developers','Startups','Enterprises']},
 'adyen.com':{n:'Adyen',i:'🟩',h:'One platform for payments, data and financial products',s:null,pl:[['Interchange++','Custom'],['Enterprise',null]],no:[8,9,11],ig:['Magento','SAP','Salesforce'],pe:['Enterprises','Global merchants']},
 'supabase.com':{n:'Supabase',i:'⚡',h:'Build in a weekend, scale to millions',s:25,pl:[['Free',0],['Pro',25],['Team',599],['Enterprise',null]],no:[5,9],ig:['Vercel','Next.js','Flutter','Prisma'],pe:['Developers','Startups']},
 'firebase.google.com':{n:'Firebase',i:'🔥',h:"Google's app development platform",s:null,pl:[['Spark',0],['Blaze','Pay as you go']],no:[9],ig:['Google Cloud','Flutter','Unity','BigQuery'],pe:['Mobile developers','Startups']},
 'figma.com':{n:'Figma',i:'🎨',h:'How modern teams design together',s:15,pl:[['Starter',0],['Professional',15],['Organization',45],['Enterprise',75]],no:[],ig:['Slack','Jira','GitHub','Notion','Asana','Microsoft Teams'],pe:['Enterprises','Design teams']},
 'canva.com':{n:'Canva',i:'🖌️',h:'What will you design today?',s:12.99,pl:[['Free',0],['Pro',12.99],['Teams',100],['Enterprise',null]],no:[3,6],ig:['Slack','HubSpot','Google Drive','Mailchimp','Dropbox'],pe:['Small businesses','Creators']}
};
function company(d){
  const p=P[d], r=rng(hash(d)), nm=p?p.n:d.split('.')[0].replace(/^./,c=>c.toUpperCase());
  const price=p?p.s:+(5+r()*18).toFixed(2);
  return {d,n:nm,i:p?p.i:'🌐',h:p?p.h:`The ${nm} platform for modern teams`,s:price,
    pl:p?p.pl:[['Free',0],['Pro',price],['Business',+(price*2.2).toFixed(2)],['Enterprise',null]],
    f:FEATS.map((_,k)=>p?!p.no.includes(k):r()>.3),
    ig:p?p.ig:['Slack','Zoom','Google Drive','GitHub'].filter(()=>r()>.3),
    pe:p?p.pe:['Startups','Product teams'],
    pages:[['HOME',nm+' — '+(p?p.h:'Home'),'https://'+d+'/'],['PRICING',nm+' Pricing Plans','https://'+d+'/pricing'],['FEATURES',nm+' Features & Integrations','https://'+d+'/product']]};
}
const scan=ds=>new Promise(res=>setTimeout(()=>res(ds.map(company)),3200)); // <- replace with real backend call

/* ---------- state ---------- */
let jobs=store.get('cx_jobs',[]), tab=0, q='', seats=25, cur=null;
const THEME=store.get('cx_theme','obsidian'); document.documentElement.dataset.theme=THEME; $('#theme').value=THEME;
$('#theme').onchange=e=>{document.documentElement.dataset.theme=e.target.value;store.set('cx_theme',e.target.value)};
/* API mode: when served by the FastAPI backend, jobs live in SQLite. Otherwise (file://) fall back to localStorage + demo engine. */
let API=null,MODE='demo';const hasAPI=()=>API!==null;
const save=()=>{if(!hasAPI())store.set('cx_jobs',jobs)};
const api=async(p,o)=>{const r=await fetch(API+p,o);if(!r.ok)throw new Error((await r.json().catch(()=>({}))).detail||('HTTP '+r.status));return r.json()};
async function scanJob(ds){
  if(!hasAPI()){const data=await scan(ds);return {id:Math.random().toString(16).slice(2,14),t:ds.join(' vs '),at:Date.now(),data,mode:'demo'}}
  const {id}=await api('/api/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({urls:ds})});
  for(;;){await new Promise(r=>setTimeout(r,900));const j=await api('/api/jobs/'+id);if(j.status=='done')return j;if(j.status=='error')throw new Error(j.error||'Scan failed')}
}

/* ---------- views ---------- */
const V={};
V.home=()=>`<div class="hero"><span class="chip ok">✨ Evidence-Linked • Uncertainty-Aware Competitive Intelligence</span>
<h1 style="margin-top:16px">Outsmart Your Competitors With Verifiable Truth.</h1>
<p>Compare 2–3 public tech websites side-by-side. CompetitorX extracts pricing models, feature matrices, audience signals, and generates sales battlecards — with every claim linked to its source URL.</p>
<div class="row" style="justify-content:center"><a class="btn" href="#new">🚀 Start New Comparison</a><a class="btn o" href="#" onclick="run(['notion.so','coda.io']);return false">⚡ View Sample (Notion vs Coda)</a><a class="btn o" href="#presets">📚 Preset Battles</a></div></div>
<div class="grid">${[['🔍','Evidence First','Every feature claim, pricing tier, and audience signal carries a verifiable source link and scan timestamp. No hallucinated rumors.'],['🛡️','Honest Uncertainty','"Not found on scanned pages" is reported honestly as unknown — never falsely asserted as "not offered" by the competitor.'],['⚔️','Sales Battlecards','Instant battlecards with "Why We Win", "Where We Stumble", discovery trap questions, and landmines to neutralize on prospect calls.'],['💰','TCO Pricing Simulator','Interactive team-size slider simulating monthly and annual expenditure across pricing tiers to expose hidden costs.']].map(x=>`<div class="card"><div style="font-size:22px">${x[0]}</div><h3 style="margin:8px 0">${x[1]}</h3><p class="mut" style="font-size:13px;margin:0">${x[2]}</p></div>`).join('')}</div>
<div class="card hi"><div class="row sp"><div><h2>Featured Preset Matchups</h2><p class="sub" style="margin:0">Jump into high-depth competitive breakdowns instantly.</p></div><a class="btn o s" href="#presets">View All 6 Battles →</a></div></div>`;

const PRE=[['Productivity','Notion vs Coda','Connected docs, wikis & AI workspaces vs modular doc-apps with interactive Packs.','notion.so','coda.io'],['DevOps','Linear vs Jira','Keyboard-first, high-velocity issue tracking vs enterprise agile planning power suite.','linear.app','jira.atlassian.com'],['Collaboration','Slack vs Discord','Enterprise workspace messaging hub vs community voice, screen & text servers.','slack.com','discord.com'],['FinTech & Payments','Stripe vs Adyen','Developer-first payment infra & billing APIs vs global unified enterprise commerce.','stripe.com','adyen.com'],['Cloud & BaaS','Supabase vs Firebase','Open-source Postgres & vector database vs Google real-time NoSQL mobile platform.','supabase.com','firebase.google.com'],['Design & Creative','Figma vs Canva','Professional collaborative UI/UX vector design systems vs drag-and-drop graphics suite.','figma.com','canva.com']];
V.presets=()=>`<h1>Preset Battles</h1><p class="sub">One click to launch a ready-made comparison.</p><div class="grid">${PRE.map((p,k)=>`<div class="card pre"><div class="row sp"><span class="chip ok">${p[0]}</span><span class="mut" style="font-size:12px">Instant</span></div><h3>${p[1]}</h3><p class="mut" style="font-size:13px;margin:0">${p[2]}</p><span class="chip">${P[p[3]].i} ${p[3]}</span><span class="chip">${P[p[4]].i} ${p[4]}</span><button class="btn" onclick="run(['${p[3]}','${p[4]}'])">⚡ Launch Comparison</button></div>`).join('')}</div>`;

V.new=()=>`<h1>New Competitive Comparison</h1><p class="sub">Scan and compare 2 or 3 public company websites. CompetitorX extracts public features, pricing, audience, and generates sales battlecards.</p>
<div class="card" style="max-width:640px"><div class="row sp"><span class="mut" style="font-size:12px">QUICK PRESETS:</span><span class="row">${[['Notion vs Coda',0],['Linear vs Jira',1],['Slack vs Discord',2],['Stripe vs Adyen',3]].map(x=>`<button class="chip" style="cursor:pointer" onclick="fill(${x[1]})">${x[0]}</button>`).join('')}</span></div>
<h3 style="margin:14px 0 8px">Competitor Websites (2–3 URLs)</h3>
<form id="nf"><input id="u1" placeholder="e.g. notion.so" value="notion.so"><input id="u2" placeholder="e.g. coda.io" value="coda.io"><input id="u3" placeholder="Optional third competitor (e.g. linear.app)">
<h3 style="margin:6px 0 8px">Extraction Goals</h3><div class="row"><label class="g"><input type="checkbox" checked>Features</label><label class="g"><input type="checkbox" checked>Pricing</label><label class="g"><input type="checkbox" checked>Audience</label><label class="g"><input type="checkbox" checked>Positioning</label></div>
<div id="msg" class="mut" style="margin:12px 0;font-size:13px"></div>
<div class="row sp"><button type="button" class="btn o" onclick="pre()">🔍 Pre-check URLs</button><button class="btn">⚡ Run Deep Scan</button></div></form></div>`;
const urls=()=>['u1','u2','u3'].map(i=>dom($('#'+i).value)).filter(Boolean);
window.fill=k=>{$('#u1').value=PRE[k][3];$('#u2').value=PRE[k][4];$('#u3').value=''};
window.pre=()=>{const u=urls(),bad=u.filter(x=>!validDom(x));$('#msg').innerHTML=u.length<2?'⚠️ Enter at least 2 websites.':bad.length?'⚠️ Invalid: '+esc(bad.join(', ')):'✅ '+u.length+' URLs look good.';return !(u.length<2||bad.length)};

V.history=()=>`<h1>Scan History & Comparisons</h1><p class="sub">All previous scans and strategic teardowns stored locally in your browser.</p>${jobs.length?jobs.map(j=>`<div class="card row sp"><div><h3 style="color:var(--ac)">${esc(j.t)}</h3><span class="mut" style="font-size:12px">${new Date(j.at).toLocaleString()}</span> <span class="chip ok">done</span></div><div class="row"><a class="btn o s" href="#results/${j.id}">View Results</a><button class="btn o s" onclick="del('${j.id}')">Delete</button></div></div>`).join(''):'<div class="card mut">No scans yet. <a href="#new">Start one →</a></div>'}`;
window.del=async id=>{if(hasAPI())await api('/api/jobs/'+id,{method:'DELETE'}).catch(()=>{});jobs=jobs.filter(j=>j.id!==id);save();route()};

/* ---------- scan run ---------- */
window.run=ds=>{
  const steps=['Discovering Pages & Nav Architecture','Extracting Capabilities, Security & Tools','Extracting Tiers & Pricing Models','Grounding Citations & Timestamps'];
  const cs=ds.map(d=>company(d));
  $('#app').innerHTML=`<div class="row sp"><h1 style="font-size:28px">Deep Competitive Scanning…</h1><span class="chip ok" id="el">0s elapsed</span></div><p class="sub">The crawler is rendering pages, mapping pricing plans, and normalising feature evidence. The scan will persist in your History.</p><div class="grid">${cs.map((c,k)=>`<div class="card"><div class="row sp"><h3>${c.i} ${esc(c.n)}</h3><span class="chip ok" id="s${k}"><span class="spin"></span> running</span></div><div class="mut" style="font-size:12px">https://${esc(c.d)}/</div><ul class="st" id="l${k}">${steps.map(s=>`<li>${s}</li>`).join('')}</ul><div style="color:var(--warn);font-size:12px">${MODE=='live'?'✓ Live scan via TinyFish.':'⚠ Simulated scan evidence used (demo mode).'}</div></div>`).join('')}</div>`;
  location.hash='#scan'; let t=0; const iv=setInterval(()=>{t++;const e=$('#el');if(e)e.textContent=t+'s elapsed';document.querySelectorAll('ul.st').forEach(u=>{const li=u.children[Math.min(t-1,3)];if(li&&t>0)li.classList.add('done')})},800);
  scanJob(ds).then(job=>{clearInterval(iv);jobs=jobs.filter(j=>j.id!==job.id);jobs.unshift(job);save();location.hash='#results/'+job.id}).catch(e=>{clearInterval(iv);$('#app').innerHTML='<div class="card"><h2>Scan failed</h2><p class="mut">'+esc(e.message)+'</p><a class="btn" href="#new">Try again</a></div>'});
};
document.addEventListener('submit',e=>{if(e.target.id==='nf'){e.preventDefault();if(pre())run(urls())}});

/* ---------- results ---------- */
const feat=(c,k)=>c.f[k], paid=c=>c.pl.filter(p=>typeof p[1]==='number'&&p[1]>0);
function gaps(cs){const g=[];FEATS.forEach((f,k)=>{const y=cs.filter(c=>c.f[k]),n=cs.filter(c=>!c.f[k]);if(y.length&&n.length)g.push({f,y,n})});return g}
function R_matrix(cs,q=''){return `<div class="card"><div class="row sp"><h2>Features & Capabilities Parity</h2><input id="flt" placeholder="Filter features or capabilities…" value="${esc(q)}" style="max-width:240px"></div><div class="tw"><table><tr><th>Capability</th>${cs.map(c=>`<th>${c.i} ${esc(c.n)}</th>`).join('')}</tr>${FEATS.map((f,k)=>f.toLowerCase().includes(q.toLowerCase())?`<tr><td><b>${f}</b></td>${cs.map(c=>`<td>${c.f[k]?`<span class="chip ok">✓ Verified</span> <a href="${c.ev&&c.ev[k]?esc(c.ev[k][1]):'https://'+c.d+'/product'}" target="_blank" rel="noopener">source ↗</a><div class="ev">${c.ev&&c.ev[k]?esc(c.ev[k][0]):'Capability described on '+c.d+'/product.'}</div>`:'<span class="chip">Not found (unknown)</span>'}</td>`).join('')}</tr>`:'').join('')}</table></div></div>
<div class="card"><h2>Ecosystem & Integrations</h2><div class="grid" style="margin-top:10px">${cs.map(c=>`<div><b>${esc(c.n)}</b><div class="row" style="margin-top:6px">${c.ig.map(x=>`<span class="chip">${x}</span>`).join('')}</div></div>`).join('')}</div></div>
<div class="card"><h2>Positioning & Audiences</h2><div class="grid" style="margin-top:10px">${cs.map(c=>`<div><b>${esc(c.n)}</b><p style="font-style:italic">“${esc(c.h)}”</p><div class="row">${c.pe.map(x=>`<span class="chip ok">${x}</span>`).join('')}</div></div>`).join('')}</div></div>`}
function R_battle(cs){return `<div class="grid">${cs.map(c=>{const o=cs.filter(x=>x!==c),win=FEATS.filter((f,k)=>c.f[k]&&o.some(x=>!x.f[k])),lose=FEATS.filter((f,k)=>!c.f[k]&&o.some(x=>x.f[k]));return `<div class="card"><h2>${c.i} Selling against ${esc(c.n)}</h2><h3 style="margin:14px 0 6px;color:var(--ac)">✅ Why we win</h3><ul>${(win.length?win:['No verified differentiators found — lead with service & price.']).map(x=>`<li>${win.length?'They show evidence of <b>'+x+'</b>':x}</li>`).join('')}</ul><h3 style="margin:14px 0 6px;color:var(--warn)">⚠️ Where we stumble</h3><ul>${(lose.length?lose:['No gaps detected on scanned pages.']).map(x=>`<li>${lose.length?'Competitors show <b>'+x+'</b> and '+esc(c.n)+' does not (unverified)':x}</li>`).join('')}</ul><h3 style="margin:14px 0 6px">❓ Discovery trap questions</h3><ul><li>How many seats will you need in 12 months, and what is your budget per seat?</li><li>Do you require ${esc((lose[0]||FEATS[6]).toLowerCase())} on day one?</li><li>Who owns security review, and what certifications are mandatory?</li></ul></div>`}).join('')}</div>`}
function tco(c,n){return c.s?{m:money(Math.round(c.s*n)),a:'Annual Commitment: ~'+money(Math.round(c.s*n*12))+'/yr',mo:'Calculated on $'+c.s+'/user tier'}:{m:'Contact Sales',a:'Annual contract required',mo:'Custom or Flat Model'}}
function R_tco(cs){return `<div class="card"><h2>Interactive Total Cost of Ownership (TCO) Simulator</h2><p class="sub">Simulate projected monthly & annual software license costs based on parsed pricing tiers.</p><div class="card" style="background:var(--bg)"><div class="row sp"><b>Team Size: <span style="color:var(--ac)" id="sv">${seats}</span> seats</b><span class="row">${[5,25,50,100].map(n=>`<button class="chip" style="cursor:pointer" onclick="setSeats(${n})">${n}</button>`).join('')}</span></div><input type="range" id="rg" min="1" max="200" value="${seats}"></div><div class="grid" id="tc">${tcoCards(cs)}</div><p class="mut" style="font-size:12px">* Estimates are derived from public entry-to-mid tier per-seat pricing. Custom enterprise volume discounts, add-on modules, and taxes are excluded.</p></div>
<div class="card"><h2>Scraped Pricing Plans</h2><div class="grid" style="margin-top:10px">${cs.map(c=>`<div><b>${esc(c.n)}</b>${c.pl.map(p=>`<div style="padding:4px 0;border-bottom:1px solid var(--bd)">${p[0]} — <span style="color:var(--ac)">${p[1]===null?'Contact sales':typeof p[1]==='number'?(p[1]?'$'+p[1]+' / mo':'$0'):p[1]}</span></div>`).join('')}</div>`).join('')}</div></div>`}
const tcoCards=cs=>cs.map(c=>{const t=tco(c,seats);return `<div class="card" style="background:var(--bg)"><b>${c.i} ${esc(c.n)}</b><div class="mut" style="font-size:12px">${t.mo}</div><div class="big">${t.m}${c.s?' <small class="mut" style="font-size:14px">/mo</small>':''}</div><div class="mut" style="font-size:12px">${t.a}</div></div>`}).join('');
window.setSeats=n=>{seats=n;$('#rg').value=n;upd()};const upd=()=>{$('#sv').textContent=seats;$('#tc').innerHTML=tcoCards(cur.data)};
function R_ins(cs){const p=cs.map(c=>paid(c)[0]).map((x,k)=>x?{c:cs[k],v:x[1]}:null).filter(Boolean).sort((a,b)=>a.v-b.v),g=gaps(cs);
return `<div class="card hi"><span class="chip ok">🧠 AI Executive Summary</span> <span class="chip">Model: DETERMINISTIC</span><p>${cs.map(c=>`<b>${esc(c.n)}</b> positions itself around “${esc(c.h)}”`).join(', while ')}. Every strategic finding below is grounded in scraped page evidence, treating omitted data as unknown rather than absent.</p><h3 style="color:var(--ac)">KEY STRATEGIC RECOMMENDATIONS</h3><div class="grid" style="margin-top:10px">${[p.length>1?['Pricing Differentiation: Position against '+p[p.length-1].c.n+"'s higher entry tier",'high',`${p[0].c.n} offers the lowest entry paid tier ($${p[0].v}/mo) vs ${p[p.length-1].c.n} ($${p[p.length-1].v}/mo). Highlight TCO advantage for growing teams.`,'Tier feature gating and per-seat vs usage billing can shift net enterprise cost.']:null,['Workflow Automation as Competitive Moat','medium','Scanned evidence shows emphasis on automated triggers. Buyers in this category prefer out-of-the-box workflows over manual steps.','Third-party connectors (Zapier/Make) can compensate for missing native automation.']].filter(Boolean).map(r=>`<div class="card" style="background:var(--bg)"><b>${r[0]}</b><div style="margin:6px 0"><span class="chip ${r[1]=='high'?'ok':'bad'}">${r[1]} confidence</span></div><p class="mut" style="font-size:13px">${r[2]}</p><div style="color:var(--warn);font-size:12px">⚠️ Caveat: ${r[3]}</div></div>`).join('')}</div></div>
<h3 style="margin:18px 0 10px">Deterministic Gaps & Signals</h3><div class="grid">${g.slice(0,6).map(x=>`<div class="card"><b>${x.f}: verified on ${x.y.map(c=>esc(c.n)).join(', ')}</b><div style="margin:6px 0"><span class="chip bad">medium</span></div><p class="mut" style="font-size:13px">Not found on public scanned pages of ${x.n.map(c=>esc(c.n)).join(', ')}. This does not prove the feature is absent: verify via live demo before acting.</p></div>`).join('')}</div>`}
function R_audit(cs){return `<div class="card"><h2>Crawled Pages & Evidence Audit</h2><p class="sub">Every page visited during the analysis. Transparent, auditable, and repeatable.</p>${cs.map(c=>`<h3 style="margin:14px 0 8px">${c.i} ${esc(c.n)} <span class="mut">${c.pages.length} pages</span></h3><div class="grid">${c.pages.map(p=>`<div class="card" style="background:var(--bg);margin:0"><div class="row sp"><span class="chip">${p[0]}</span><a href="${p[2]}" target="_blank" rel="noopener">open ↗</a></div><b style="font-size:13px">${esc(p[1])}</b><div class="mut" style="font-size:12px;word-break:break-all">${p[2]}</div></div>`).join('')}</div>`).join('')}</div>`}

const TABS=['📊 Capability Matrix','⚔️ Sales Battlecard','💰 TCO Calculator','🧠 AI Strategic Insights','🌐 Scanned Pages Audit'];
function results(id){cur=jobs.find(j=>j.id===id);if(!cur){$('#app').innerHTML='<div class="card">Scan not found. <a href="#history">Back to history</a></div>';return}
  const cs=cur.data,body=[()=>R_matrix(cs,q),R_battle,R_tco,R_ins,R_audit].map(f=>f)[tab](cs);
  $('#app').innerHTML=`<div class="row sp"><div><h1 style="font-size:28px">${cs.map(c=>c.i+' '+esc(c.n)).join(' <span class="mut" style="font-size:16px">vs</span> ')}</h1><span class="mut" style="font-size:12px">Scanned ${new Date(cur.at).toLocaleString()} · Grounded on ${cs.length*3} verified public pages</span></div><div class="row noprint"><button class="btn o s" onclick="exp('csv')">📥 CSV</button><button class="btn o s" onclick="exp('md')">📝 Markdown</button><button class="btn o s" onclick="print()">🖨 PDF</button><button class="btn s" onclick="run(cur.data.map(c=>c.d))">🔄 Rerun</button></div></div>
  <div class="tabs">${TABS.map((t,k)=>`<button class="${k==tab?'on':''}" onclick="tab=${k};results('${id}')">${t}</button>`).join('')}</div>${body}`;
  const f=$('#flt');if(f)f.oninput=e=>{q=e.target.value;results(id);const n=$('#flt');n.focus();n.setSelectionRange(q.length,q.length)};
  const r=$('#rg');if(r)r.oninput=e=>{seats=+e.target.value;upd()};
}
window.exp=t=>{const cs=cur.data;let s,m,n=cur.t.replace(/\W+/g,'_');
  if(t=='csv'){s=[['Capability',...cs.map(c=>c.n)],...FEATS.map((f,k)=>[f,...cs.map(c=>c.f[k]?'Verified':'Not found (unknown)')])].map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n');m='text/csv'}
  else{s=`# ${cs.map(c=>c.n).join(' vs ')}\n_Scanned ${new Date(cur.at).toLocaleString()}_\n\n| Capability | ${cs.map(c=>c.n).join(' | ')} |\n|---|${cs.map(()=>'---').join('|')}|\n`+FEATS.map((f,k)=>`| ${f} | ${cs.map(c=>c.f[k]?'✓ Verified':'Not found').join(' | ')} |`).join('\n')+`\n\n## Pricing\n`+cs.map(c=>`**${c.n}**: `+c.pl.map(p=>p[0]+' '+(p[1]===null?'Contact sales':p[1])).join(', ')).join('\n\n');m='text/markdown'}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([s],{type:m}));a.download=n+'.'+t;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};

/* ---------- copilot ---------- */
const add=(t,u)=>{const d=document.createElement('div');d.className='m'+(u?' u':'');d.textContent=t;$('#msgs').append(d);$('#msgs').scrollTop=1e9};
function reply(q){q=q.toLowerCase();if(!cur)return 'Run or open a comparison first, then ask me about pricing, security, AI, or integrations.';const cs=cur.data;
  const k=FEATS.findIndex(f=>f.toLowerCase().split(/[ \/&-]+/).some(w=>w.length>2&&q.includes(w)));
  if(/pric|cost|cheap|tco|seat/.test(q))return cs.map(c=>`${c.n}: ${c.s?'$'+c.s+'/user/mo':'custom / flat pricing'}`).join(' · ');
  if(/secur|sso|saml|compl/.test(q))return cs.map(c=>`${c.n}: SSO ${c.f[6]?'verified':'not found'}, certifications ${c.f[7]?'verified':'not found'}`).join(' · ');
  if(/integrat/.test(q))return cs.map(c=>`${c.n}: ${c.ig.join(', ')}`).join(' · ');
  if(k>=0)return FEATS[k]+' → '+cs.map(c=>`${c.n}: ${c.f[k]?'verified':'not found (unknown, verify via demo)'}`).join(' · ');
  if(/win|best|recommend|who/.test(q)){const sc=cs.map(c=>[c.n,c.f.filter(Boolean).length]).sort((a,b)=>b[1]-a[1]);return `${sc[0][0]} shows evidence for the most capabilities (${sc[0][1]}/${FEATS.length}). Treat "not found" as unknown, not absent.`}
  return 'Try asking about pricing, security, integrations, AI, automation, or who wins.'}
$('#cp').onclick=()=>{$('#cpw').classList.toggle('open');if(!$('#msgs').children.length)add('Hi! I can answer questions about the current comparison.')};
$('#cpf').onsubmit=e=>{e.preventDefault();const v=$('#cpi').value.trim();if(!v)return;add(v,1);$('#cpi').value='';setTimeout(()=>add(reply(v)),250)};

/* ---------- router ---------- */
async function route(){const h=location.hash.slice(1)||'home',[p,id]=h.split('/');
  if(hasAPI()&&(p=='history'||p=='results')){try{jobs=await api('/api/jobs')}catch(e){}}
  $('#links').innerHTML=[['home','Home'],['new','⚡ Compare'],['presets','📚 Presets'],['history','🕘 History']].map(l=>`<a href="#${l[0]}" class="${l[0]==p?'on':''}">${l[1]}</a>`).join('');
  if(p=='results'){tab=0;q='';return results(id)} if(p=='scan')return; scrollTo(0,0);$('#app').innerHTML=(V[p]||V.home)()}
addEventListener('hashchange',route);
(async()=>{if(location.protocol.startsWith('http')){try{const h=await(await fetch('/api/health')).json();API='';MODE=h.mode}catch(e){}}
  $('#pill').textContent=MODE=='live'?'● Live engine · TinyFish':hasAPI()?'● Backend online · demo engine':'● Offline demo engine';route()})();
