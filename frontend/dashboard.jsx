/* eslint-disable no-undef */
/* RentScope Dashboard (vanilla animations, no external icon/motion/chart libs)
   - Tailwind via CDN for utilities
   - Inline SVG icons
   - Canvas for simple charts (no Recharts)
*/

const { useEffect, useMemo, useRef, useState } = React;

/* ---------------- Icons (inline SVG) ---------------- */
const I = {
  Radar: (p)=>(<svg viewBox="0 0 24 24" className={`h-4 w-4 ${p.className||""}`} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7a5 5 0 1 0 5 5"/><circle cx="13" cy="12" r="1"/><path d="M21 3l-7 7"/></svg>),
  Home:(p)=>(<svg viewBox="0 0 24 24" className={`h-4 w-4 ${p.className||""}`} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 11l9-8 9 8"/><path d="M9 21V9h6v12"/></svg>),
  Layout:(p)=>(<svg viewBox="0 0 24 24" className={`h-4 w-4 ${p.className||""}`} fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>),
  Building:(p)=>(<svg viewBox="0 0 24 24" className={`h-4 w-4 ${p.className||""}`} fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M7 6V3h10v3"/><path d="M8 12h1M12 12h1M16 12h1M8 16h1M12 16h1M16 16h1"/></svg>),
  Bell:(p)=>(<svg viewBox="0 0 24 24" className={`h-5 w-5 ${p.className||""}`} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14v-3a6 6 0 0 0-12 0v3c0 .53-.21 1.04-.59 1.41L4 17h5"/><path d="M9 17a3 3 0 0 0 6 0"/></svg>),
  Info:(p)=>(<svg viewBox="0 0 24 24" className={`h-4 w-4 ${p.className||""}`} fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h2v4h-2"/></svg>),
  Trend:(p)=>(<svg viewBox="0 0 24 24" className={`h-5 w-5 ${p.className||""}`} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 17l6-6 4 4 7-7"/><path d="M14 8h7v7"/></svg>),
  Wallet:(p)=>(<svg viewBox="0 0 24 24" className={`h-5 w-5 ${p.className||""}`} fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M16 10h4v6h-4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"/></svg>),
  Shield:(p)=>(<svg viewBox="0 0 24 24" className={`h-5 w-5 ${p.className||""}`} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3l7 4v5a9 9 0 0 1-7 9 9 9 0 0 1-7-9V7l7-4z"/><path d="M9 12l2 2 4-4"/></svg>),
  MapPin:(p)=>(<svg viewBox="0 0 24 24" className={`h-5 w-5 ${p.className||""}`} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 21s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10z"/><circle cx="12" cy="11" r="2.5"/></svg>),
};

/* ---------------- Dummy data + helpers (sim) ---------------- */
const SUBURB = {
  Nedlands:{ median:800, period:12, step:0.05, dist:7, uni:true, last12:[0.2,0.3,0.4,0.4,0.2,0.1,0,-0.1,0.1,0.2,0.3,0.2] },
  "Canning Vale":{ median:650, period:6, step:0.01, dist:17, uni:false, last12:[0.1,0.1,0.2,0.1,0.1,0,0,0,0.1,0.2,0.1,0.1] },
  Joondalup:{ median:500, period:12, step:0.03, dist:26, uni:true, last12:[0,0.1,0.1,0.1,0,-0.1,0,0.1,0.2,0.1,0.1,0] },
  Armadale:{ median:450, period:12, step:0.025, dist:36, uni:false, last12:[0.2,0.2,0.1,0,-0.1,-0.1,0,0.1,0.2,0.1,0,0] },
  "East Perth":{ median:700, period:12, step:0.04, dist:2, uni:false, last12:[0.3,0.2,0.1,0.1,0.1,0,0,0.2,0.3,0.2,0.2,0.1] },
};

function addMonths(d,m){ const x=new Date(d); const mo=x.getMonth()+m; x.setMonth(mo); if(x.getMonth()!==((mo%12)+12)%12) x.setDate(0); return x; }
function monthsBetween(a,b){ const y=b.getFullYear()-a.getFullYear(), m=b.getMonth()-a.getMonth(); let t=y*12+m; if(b.getDate()<a.getDate()) t-=1; return t; }

function predictNext(weekly, start, suburbKey, today){
  const s = SUBURB[suburbKey]; const last=start; const monthsSince=monthsBetween(last,today);
  const nDate=addMonths(last, Math.floor(monthsSince/s.period+1)*s.period);
  const proj=+(weekly*(1+s.step)).toFixed(2);
  const m=s.last12.reduce((a,b)=>a+b,0)/s.last12.length; const v=s.last12.reduce((a,b)=>a+(b-m)*(b-m),0)/s.last12.length;
  const conf=Math.max(.35,Math.min(.95,1-(.02*3+v*8))); // simple cap for demo
  return { next:nDate, projected:proj, monthsUntil:monthsBetween(today,nDate), confidence:conf };
}

/* ---------------- Small UI primitives ---------------- */
const Card = ({children,className=""})=>(<div className={`rs-card ${className}`}>{children}</div>);
const CardHeader = ({children,className=""})=>(<div className={`px-5 pt-5 ${className}`}>{children}</div>);
const CardContent = ({children,className=""})=>(<div className={`px-5 pb-5 ${className}`}>{children}</div>);
const Label = ({children})=>(<label className="text-sm text-neutral-600">{children}</label>);
const Input = (p)=>(<input {...p} className={`w-full px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-sky-400 ${p.className||""}`} />);
const Select = ({value,onChange,children})=>(
  <select value={value} onChange={e=>onChange(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-sky-400">{children}</select>
);
const Switch = ({checked,onChange})=>(
  <button onClick={()=>onChange(!checked)} className={`h-6 w-10 rounded-full transition relative ${checked?"bg-emerald-500":"bg-neutral-300"}`}>
    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked?"right-0.5":"left-0.5"}`} />
  </button>
);

/* ---------------- Simple Canvas charts ---------------- */
function LineCanvas({dataLeft, dataRight, stress=0.3}){
  const ref=useRef(null);
  useEffect(()=>{
    const c=ref.current; if(!c) return; const dpr=window.devicePixelRatio||1;
    const w=c.clientWidth, h=c.clientHeight; c.width=w*dpr; c.height=h*dpr;
    const ctx=c.getContext('2d'); ctx.scale(dpr,dpr);
    ctx.clearRect(0,0,w,h);
    // axes
    ctx.strokeStyle="#e5e7eb"; ctx.lineWidth=1; ctx.beginPath();
    ctx.moveTo(40, 16); ctx.lineTo(40, h-28); ctx.lineTo(w-16, h-28); ctx.stroke();
    // stress line (right axis 0..1 -> y)
    const yR=y=> (h-28) - y*(h-44);
    ctx.strokeStyle="#ef4444"; ctx.setLineDash([4,4]); ctx.beginPath();
    ctx.moveTo(40, yR(stress)); ctx.lineTo(w-16, yR(stress)); ctx.stroke(); ctx.setLineDash([]);
    // left series (rent)
    const maxL=Math.max(...dataLeft)*1.2; const yL=v=> (h-28) - (v/maxL)*(h-44);
    ctx.strokeStyle="#2563eb"; ctx.lineWidth=2; ctx.beginPath();
    dataLeft.forEach((v,i)=>{const x=40 + i*( (w-56)/(dataLeft.length-1) ); const y=yL(v); i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
    ctx.stroke();
    // right series (ratio)
    ctx.strokeStyle="#10b981"; ctx.lineWidth=2; ctx.beginPath();
    dataRight.forEach((v,i)=>{const x=40 + i*( (w-56)/(dataRight.length-1) ); const y=yR(v); i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
    ctx.stroke();
    // legend dots
    ctx.fillStyle="#10b981"; ctx.beginPath(); ctx.arc(60, h-12, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle="#2563eb"; ctx.beginPath(); ctx.arc(180, h-12, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle="#4b5563"; ctx.font="12px ui-sans-serif"; ctx.fillText("Affordability ratio", 72, h-8);
    ctx.fillText("Weekly rent ($)", 192, h-8);
  },[dataLeft,dataRight,stress]);
  return <canvas ref={ref} className="w-full h-72 block rounded-xl bg-white/60" aria-label="Current vs projected chart" />;
}

function BarMini({you,median}){
  const ref=useRef(null);
  useEffect(()=>{
    const c=ref.current; if(!c) return; const dpr=window.devicePixelRatio||1;
    const w=c.clientWidth, h=c.clientHeight; c.width=w*dpr; c.height=h*dpr;
    const ctx=c.getContext('2d'); ctx.scale(dpr,dpr); ctx.clearRect(0,0,w,h);
    const max=Math.max(you,median)*1.2; const barW= Math.min(80,(w-100)/2);
    const y=v=> (h-24) - (v/max)*(h-48);
    // grid
    ctx.strokeStyle="#e5e7eb"; ctx.strokeRect(40, 12, w-56, h-36);
    // bars
    ctx.fillStyle="#2563eb"; ctx.fillRect(60, y(you), barW, (h-24)-y(you));
    ctx.fillStyle="#a5b4fc"; ctx.fillRect(60+barW+40, y(median), barW, (h-24)-y(median));
    // labels
    ctx.fillStyle="#374151"; ctx.font="12px ui-sans-serif";
    ctx.fillText("You", 60, h-6); ctx.fillText("Suburb", 60+barW+40, h-6);
  },[you,median]);
  return <canvas ref={ref} className="w-full h-36 block rounded-xl bg-white/60" aria-label="Rent vs median" />;
}

/* ---------------- Main Component ---------------- */
function MiniMetric({ label, value, Icon }){
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="text-sm font-medium text-neutral-600 flex items-center gap-2">
          {Icon && <Icon />} {label}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold">{value}</div>
        <div className="text-xs text-neutral-500 mt-1">Tip: open Forecast tab for details.</div>
      </CardContent>
    </Card>
  );
}

export function RentScopeDashboard(){
  // today is fixed for a stable demo
  const today = useMemo(()=> new Date("2025-08-29T12:00:00+08:00"),[]);
  // state
  const [name] = useState("Alex");
  const [suburb,setSuburb]=useState("Nedlands");
  const [weekly,setWeekly]=useState(500);
  const [income,setIncome]=useState(1500);
  const [leaseStart,setLeaseStart]=useState("2024-10-01");
  const [landlord,setLandlord]=useState("agency");
  const [overpay,setOverpay]=useState(.10);
  const [dwelling,setDwelling]=useState("apartment");
  const [beds,setBeds]=useState(2);
  const [length,setLength]=useState(12);
  const [leaseType,setLeaseType]=useState("fixed");
  const [car,setCar]=useState(false);
  const [pets,setPets]=useState(false);

  // derived
  const s = SUBURB[suburb];
  const pred = predictNext(Number(weekly), new Date(leaseStart), suburb, today);
  const ratio = Math.max(0, Math.min(1, Number((Number(weekly)/Number(income||1)).toFixed(3))));
  const ratioPct = Math.round(ratio*100);
  const benchMedian = s.median;
  const chartLeft = Array.from({length:19}, (_,i)=> (i < pred.monthsUntil ? Number(weekly): pred.projected));
  const chartRight= Array.from({length:19}, (_,i)=> Number(( (i < pred.monthsUntil ? weekly : pred.projected) / (income||1)).toFixed(3)));

  // tabs
  const [tab,setTab]=useState("overview");

  // notif popover (demo)
  const [open,setOpen]=useState(false);
  const [notes,setNotes]=useState([
    {id:"n1", text:"Better accommodation available. Click to view.", type:"info", action:()=> document.getElementById('alt').scrollIntoView({behavior:'smooth'})},
    {id:"n2", text:`Price hike detected in ~${pred.monthsUntil} months. View forecast.`, type:"warn", action:()=>window.scrollTo({top:600,behavior:'smooth'})},
    {id:"n3", text:"You are all up to date.", type:"ok"},
  ]);
  const unread=notes.length;
  const dismiss=id=> setNotes(n=> n.filter(x=>x.id!==id));
  const dismissAll=()=> setNotes([]);

  return (
    <div className="min-h-screen">
      <div className="rs-bg"></div>

      {/* Header */}
      <header className="rs-header">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <a href="index.html" className="flex items-center gap-3 no-underline">
            <div className="h-9 w-9 rounded-xl bg-white/80 backdrop-blur border border-white/60 shadow-sm flex items-center justify-center">
              <I.Radar className="text-sky-600" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight text-neutral-900">RentScope</div>
              <div className="text-xs text-neutral-500">Predict. Prepare. Stay secure.</div>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-2 text-sm">
            <a className="px-3 py-2 rounded-xl text-neutral-700 hover:bg-neutral-200/60 flex items-center gap-2" href="index.html">
              <I.Home /> Home
            </a>
            <a className="px-3 py-2 rounded-xl text-white bg-neutral-900 flex items-center gap-2" href="dashboard.html">
              <I.Layout /> Dashboard
            </a>
            <a className="px-3 py-2 rounded-xl text-neutral-700 hover:bg-neutral-200/60 flex items-center gap-2" href="#alt">
              <I.Building /> Browse
            </a>
          </nav>

          <button className="relative p-2 rounded-xl hover:bg-neutral-100" onClick={()=>setOpen(v=>!v)} aria-label="Notifications">
            <I.Bell />
            {unread>0 && <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">{unread}</span>}
          </button>
        </div>
      </header>

      {/* Utilities banner */}
      <div className="relative z-10 bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-6 py-3">
        From 1 July, utilities typically increase by ~2.5% annually on average. This assumption is included in forecasts.
      </div>

      {/* Notifications */}
      {open && (
        <div className="fixed right-4 top-16 z-[9999]">
          <Card className="shadow-xl w-[320px]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="font-medium">Notifications</div>
                <button onClick={dismissAll} className="text-sm text-sky-700 hover:underline">Mark all read</button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {notes.length===0 && <div className="text-sm text-neutral-500">Nothing new</div>}
              {notes.map(n=>(
                <div key={n.id} className={`flex items-start gap-3 p-3 rounded-2xl border ${n.type==="warn"?"border-amber-300 bg-amber-50": n.type==="ok"?"border-emerald-300 bg-emerald-50":"border-neutral-200 bg-white"}`}>
                  <div className="mt-0.5">{n.type==="warn"? <I.Info className="text-amber-600"/> : n.type==="ok"? <I.Shield className="text-emerald-600"/> : <I.Trend className="text-sky-600"/>}</div>
                  <div className="text-sm flex-1">{n.text}</div>
                  <div className="flex items-center gap-2">
                    {n.action && <button onClick={n.action} className="text-xs text-sky-700 hover:underline">Open</button>}
                    <button onClick={()=>dismiss(n.id)} className="text-xs text-neutral-500 hover:underline">Dismiss</button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight rs-float-in">Welcome, {name}</h1>
          <p className="text-neutral-600 flex items-center gap-2">
            <I.Info className="text-sky-600" />
            Latest update for {suburb}: No strong deviation detected. Average increase pattern {Math.round(SUBURB[suburb].step*100)}% every {SUBURB[suburb].period} months.
          </p>
        </section>

        {/* Inputs */}
        <Card>
          <CardHeader>
            <div className="text-lg font-medium flex items-center gap-2">Your inputs <span className="rs-badge">(simulation)</span></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2"><Label>Suburb</Label>
                <Select value={suburb} onChange={setSuburb}>{Object.keys(SUBURB).map(s=><option key={s} value={s}>{s}</option>)}</Select>
              </div>
              <div className="space-y-2"><Label>Weekly rent ($)</Label>
                <Input type="number" value={weekly} onChange={e=>setWeekly(Number(e.target.value||0))} />
              </div>
              <div className="space-y-2"><Label>Weekly income ($)</Label>
                <Input type="number" value={income} onChange={e=>setIncome(Number(e.target.value||0))} />
              </div>
              <div className="space-y-2"><Label>Lease start</Label>
                <Input type="date" value={leaseStart} onChange={e=>setLeaseStart(e.target.value)} />
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2"><Label>Landlord type</Label>
                <Select value={landlord} onChange={setLandlord}>
                  <option value="agency">Agency</option><option value="private">Private</option><option value="community">Community housing</option>
                </Select>
              </div>
              <div className="space-y-2"><Label>Dwelling type</Label>
                <Select value={dwelling} onChange={setDwelling}>
                  <option>apartment</option><option>house</option><option>villa</option><option>studio</option><option>share</option>
                </Select>
              </div>
              <div className="space-y-2"><Label>Bedrooms</Label>
                <Select value={String(beds)} onChange={v=>setBeds(Number(v))}><option>1</option><option>2</option><option>3</option><option>4</option></Select>
              </div>
              <div className="space-y-2"><Label>Lease length (mo)</Label>
                <Select value={String(length)} onChange={v=>setLength(Number(v))}><option>6</option><option>12</option><option>18</option><option>24</option></Select>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2"><Label>Lease type</Label>
                <Select value={leaseType} onChange={setLeaseType}><option value="fixed">Fixed term</option><option value="periodic">Periodic</option></Select>
              </div>
              <div className="space-y-2"><Label>Car space</Label>
                <div className="flex items-center gap-3"><Switch checked={car} onChange={setCar}/><span className="text-sm">{car?"Yes":"No"}</span></div>
              </div>
              <div className="space-y-2"><Label>Pets allowed</Label>
                <div className="flex items-center gap-3"><Switch checked={pets} onChange={setPets}/><span className="text-sm">{pets?"Yes":"No"}</span></div>
              </div>
              <div className="space-y-2">
                <Label>Overpay threshold ({Math.round(overpay*100)}%)</Label>
                <div className="flex items-center gap-3">
                  <input type="range" min={0.05} max={0.25} step={0.01} value={overpay} onChange={e=>setOverpay(Number(e.target.value))} className="w-full"/>
                  <div className="text-sm w-14 text-right">{Math.round(overpay*100)}%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 font-medium">
              <I.Trend className="text-sky-600" /> Current vs projected rent (18 months)
            </div>
            <div className="text-sm text-neutral-600">Blue = Weekly rent; Green = rent-to-income ratio; Red dashed = 30% stress</div>
          </CardHeader>
          <CardContent>
            <LineCanvas dataLeft={chartLeft} dataRight={chartRight} stress={0.3}/>
            <div className="mt-3 text-xs text-neutral-600 flex items-center gap-2"><I.Info className="text-neutral-400"/> What this means for you: plan savings ahead of the step change to avoid budget shocks.</div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="rounded-2xl border bg-white/70 backdrop-blur p-2 flex items-center gap-2 w-full">
          {[
            {k:"overview",t:"Overview"},
            {k:"forecast",t:"Forecast"},
            {k:"risk",t:"Risk"},
            {k:"alternatives",t:"Alternatives"},
          ].map(x=>(
            <button key={x.k} onClick={()=>setTab(x.k)} className={`px-3 py-1.5 rounded-xl text-sm ${tab===x.k?"bg-neutral-900 text-white":"text-neutral-700 hover:bg-neutral-200/60"}`}>
              {x.t}
            </button>
          ))}
        </div>

        {tab==="overview" && (
          <>
            <div className="grid md:grid-cols-3 gap-4">
              <MiniMetric label="Next increase" value={pred.next.toLocaleDateString()} Icon={I.Trend}/>
              <MiniMetric label="Projected weekly rent" value={`$${pred.projected.toFixed(2)}`} Icon={I.Wallet}/>
              <MiniMetric label="Confidence" value={`${Math.round(pred.confidence*100)}%`} Icon={I.Shield}/>
            </div>
            <div className="text-xs text-neutral-500 flex items-center gap-2 mt-1"><I.Info className="text-neutral-400"/> These cards summarise timing, size, and certainty of the next change.</div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader><div className="flex items-center gap-2 font-medium"><I.Wallet className="text-emerald-600"/> Rent vs median</div></CardHeader>
                <CardContent>
                  <BarMini you={Number(weekly)} median={benchMedian}/>
                  <div className="mt-2 text-sm text-neutral-600">Median in {suburb}: ${benchMedian.toFixed(0)}</div>
                  <div className="mt-1 text-xs text-neutral-500 flex items-center gap-2"><I.Info className="text-neutral-400"/> We flag overpaying when rent exceeds the suburb median by your threshold (default 10%).</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><div className="flex items-center gap-2 font-medium"><I.Trend className="text-amber-600"/> Trend alert</div></CardHeader>
                <CardContent>
                  <div className="text-sm text-neutral-600">Recent vs 12 month average</div>
                  <div className="text-lg font-semibold">0.04 %</div>
                  <div className="text-sm text-neutral-700 mt-1">No strong deviation detected</div>
                  <div className="mt-2 text-xs text-neutral-500 flex items-center gap-2"><I.Info className="text-neutral-400"/> Short-term acceleration suggests earlier increases; slowdowns may ease pressure.</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 font-medium"><I.Wallet className="text-emerald-600"/> Affordability overview</div>
                  <div className="text-sm text-neutral-600">Rent as a % of income (goal below 30%)</div>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-3 bg-neutral-200 rounded-full overflow-hidden">
                    <div className={`h-3 ${ratioPct>=40?"bg-rose-500": ratioPct>=30?"bg-amber-500":"bg-emerald-500"}`} style={{width:`${Math.min(100,ratioPct)}%`}}/>
                  </div>
                  <div className="mt-2 text-sm flex items-center justify-between">
                    <span>{ratioPct}% of income</span>
                    <span className="text-neutral-500">Save ~${Math.max(0, (pred.projected-weekly)/Math.max(1,pred.monthsUntil*4)).toFixed(2)}/wk for next rise</span>
                  </div>
                  <div className="mt-3 text-xs text-neutral-500 flex items-center gap-2"><I.Info className="text-neutral-400"/> Staying under 30% usually signals manageable housing costs. Over 40% is high stress.</div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {tab==="forecast" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 font-medium"><I.Trend className="text-sky-600"/> Forecast details</div>
              <div className="text-sm text-neutral-600">How we form the projection</div>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 text-sm text-neutral-700 space-y-1">
                <li>Periodicity for {suburb}: {s.period} months; typical step ~{Math.round(s.step*100)}%.</li>
                <li>Confidence reflects local variance (higher volatility lowers confidence).</li>
                <li>Utilities uplift of ~2.5% annually is included in affordability projections.</li>
              </ul>
              <div className="mt-3 text-xs text-neutral-500 flex items-center gap-2"><I.Info className="text-neutral-400"/> Refer to the hero chart above for the full timeline.</div>
            </CardContent>
          </Card>
        )}

        {tab==="risk" && (
          <Card>
            <CardHeader><div className="flex items-center gap-2 font-medium"><I.Shield className="text-sky-700"/> Risk details</div></CardHeader>
            <CardContent className="text-sm text-neutral-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Rent burden is considered high when rent exceeds 30% of income.</li>
                <li>Areas with high turnover and eviction pressure increase renewal risk.</li>
                <li>Agency-managed properties trend toward stricter renewal policies than private landlords.</li>
              </ul>
            </CardContent>
          </Card>
        )}

        {tab==="alternatives" && (
          <Card id="alt">
            <CardHeader>
              <div className="flex items-center gap-2 font-medium"><I.MapPin className="text-sky-600"/> Alternatives</div>
              <div className="text-sm text-neutral-600">Similar-price options in nearby suburbs</div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-3">
                {["Joondalup","Canning Vale","Armadale"].map((name,i)=>(
                  <div key={i} className="rounded-2xl border p-4 bg-white/60">
                    <div className="text-sm text-neutral-600">house · 3 bed</div>
                    <div className="text-lg font-semibold">{name} option</div>
                    <div className="text-xs text-neutral-500">{name} · ~{SUBURB[name].dist} km to CBD · {SUBURB[name].uni?"Near university":"General"}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="font-medium">${Math.round(SUBURB[name].median*.9)}/wk</div>
                      <a href="#" className="px-3 py-2 rounded-xl bg-neutral-100 text-neutral-900 hover:bg-neutral-200 inline-flex items-center">View</a>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-neutral-500 flex items-center gap-2"><I.Info className="text-neutral-400"/> Compare to fair benchmarks before deciding to renew or move.</div>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="relative z-10 border-t mt-10">
        <div className="max-w-7xl mx-auto px-6 py-8 text-sm text-neutral-600 flex items-center gap-2">
          <I.Home /> Designed for WA renters. Demo data only.
        </div>
      </footer>
    </div>
  );
}

// Default export for React.createElement above
const RentScopeDashboard = RentScopeDashboard;