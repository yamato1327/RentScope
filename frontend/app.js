// ---- Config ----
// const API_BASE = "http://localhost:4000"; // change to tunnel/Render URL when sharing
const API_BASE = "https://rentscope-backend.onrender.com";
// ---- Token helpers ----
function saveToken(t){ localStorage.setItem("token", t) }
function getToken(){ return localStorage.getItem("token") }
function isAuthed(){ return !!getToken() }
function logout(){ localStorage.removeItem("token"); location.href = "home.html" }
function requireAuth(){
  if(!isAuthed()){
    const path = location.pathname;
    // Public pages allowed without auth:
    const publicPages = ["home.html","index.html","signup.html","/"];
    const isPublic = publicPages.some(p => path.endsWith(p));
    if(!isPublic) location.href = "index.html";
  }
}

// ---- Home page ----
const ctaStart = document.getElementById("ctaGetStarted");
if (ctaStart){
  ctaStart.addEventListener("click", ()=>{
    if (isAuthed()) location.href = "start.html";
    else location.href = "index.html";
  });
}
const ctaBrowse = document.getElementById("ctaBrowse"); // link only

// ---- Login page ----
const liForm = document.getElementById("loginForm");
if (liForm){
  liForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email = document.getElementById("liEmail").value.trim();
    const password = document.getElementById("liPassword").value;
    const res = await fetch(`${API_BASE}/api/auth/login`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    document.getElementById("liMsg").textContent = data.error || "Logged in!";
    if (data.token){ saveToken(data.token); location.href = "start.html"; }
  });
  const demoBtn = document.getElementById("demoBtn");
  if (demoBtn){ demoBtn.addEventListener("click", ()=>{ saveToken("demo"); location.href="start.html"; }); }
}

// ---- Signup page ----
const suForm = document.getElementById("signupForm");
if (suForm){
  suForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email = document.getElementById("suEmail").value.trim();
    const password = document.getElementById("suPassword").value;
    const res = await fetch(`${API_BASE}/api/auth/signup`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    document.getElementById("suMsg").textContent = data.error || "Account created!";
    if (data.token){ saveToken(data.token); location.href = "start.html"; }
  });
}

// ---- Start (choice) page ----
if (location.pathname.endsWith("start.html")) {
  requireAuth();
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  const chooseMarket = document.getElementById("chooseMarket");
  const chooseMine   = document.getElementById("chooseMine");
  if (chooseMarket){
    chooseMarket.addEventListener("click", (e)=>{ e.preventDefault(); location.href = "predict.html?mode=market"; });
  }
  if (chooseMine){
    chooseMine.addEventListener("click", (e)=>{ e.preventDefault(); location.href = "predict.html?mode=myrent"; });
  }
}

// ---- Predict page (form submit) ----
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) logoutBtn.addEventListener("click", logout);

const predictForm = document.getElementById("predictForm");
if (predictForm){
  requireAuth();
  predictForm.addEventListener("submit", (e)=>{
    e.preventDefault();
    const urlParams = new URLSearchParams(location.search);
    const mode = urlParams.get("mode") || "market";
    const suburb = document.getElementById("suburb").value.trim();
    const weeklyRent = Number(document.getElementById("rent").value);
    const bedrooms = Number(document.getElementById("bedrooms")?.value || 0);
    const landlord = document.getElementById("landlord")?.value || "";
    const reviewed = document.getElementById("reviewed")?.value || "";
    const income = Number(document.getElementById("income")?.value || 0);
    const benchmark = Number(document.getElementById("benchmark")?.value || 0);
    localStorage.setItem("lastQuery", JSON.stringify({ mode, suburb, weeklyRent, bedrooms, landlord, reviewed, income, benchmark }));
    location.href = "results.html";
  });
}

// ----- Results page -----
if (location.pathname.endsWith("results.html")){
  requireAuth();
  (async ()=>{
    const q = JSON.parse(localStorage.getItem("lastQuery") || "{}");
    if (!q.suburb || !q.weeklyRent){ location.href = "predict.html"; return; }

    const fmt = n => isNaN(n) ? "—" : `$${n}`;
    const _ = id => document.getElementById(id);
    _("uRent").textContent = fmt(q.weeklyRent) + "/wk";
    _("uSuburb").textContent = q.suburb || "—";
    _("uBed").textContent = q.bedrooms ?? "—";
    _("uLandlord").textContent = q.landlord || "—";
    _("uReviewed").textContent = q.reviewed || "—";
    _("uIncome").textContent = q.income ? `$${q.income}` : "—";
    _("uBench").textContent = `${q.benchmark ?? 0} pp`;
    _("asOf").textContent = `As of ${new Date().toLocaleDateString()}`;

    const res = await fetch(`${API_BASE}/api/predict`,{
      method:"POST",
      headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${getToken()}` },
      body: JSON.stringify({ suburb: q.suburb, weeklyRent: Number(q.weeklyRent) })
    });
    const data = await res.json();
    if (data.error){ alert(data.error); location.href="predict.html"; return; }

    const annualPct = 4.9;
    const cadence = "every 12 months";
    const nextIncrease = Math.max(0, Math.round((data.median * 0.05) / 5) * 5 / 52 * 52 / 52);
    const projected = Math.round((data.inputRent + nextIncrease) / 5) * 5;
    _("tAnnual").textContent = `${annualPct}%`;
    _("tCadence").textContent = `Cadence — ${cadence}`;
    _("tNext").textContent = `$${Math.round(nextIncrease)}/wk`;
    _("tProj").textContent = `Projected weekly rent $${projected}`;
    _("tWindow").textContent = "August 2026";
    _("tWindowDate").textContent = "Around 29/08/2026";

    const diff = data.inputRent - data.median;
    const verdict = diff >= 0 ? "Above expected" : "Below expected";
    _("priceCheck").innerHTML =
      `<strong>Fair price check</strong><br>
       Expected median in ${data.suburb}: <b>$${data.median}/wk</b><br>
       Your rent: <b>$${data.inputRent}/wk</b> (${diff>=0?'+':''}${diff}/wk vs expected).<br>
       ${verdict}: looks ${diff>=0?'a bit high':'like a favourable deal'}.`;
    _("savingsTip").innerHTML =
      `<strong>Savings tip</strong><br>
       Start setting aside <b>$${Math.max(10, Math.round((projected-data.inputRent)/2))}/wk</b> now.`;
    _("seasonalTip").innerHTML =
      `<strong>Seasonal utility costs</strong><br>
       Many providers revise tariffs in <b>July</b>. Try to negotiate reviews in the first half of the year.`;

    const alts = data.alternatives || [
      { suburb: "Crawley", inc: "5.5%", median: 820, badge: "CLOSEST PRICE", listings:[
        "10 Crawley Rd · 2 rooms · $697/wk", "25 Crawley Ave · 3 rooms · $820/wk"
      ]},
      { suburb: "Shenton Park", inc: "5.5%", median: 820, badge: "CLOSEST PRICE", listings:[
        "10 Shenton Rd · 2 rooms · $697/wk", "25 Shenton Park Ave · 3 rooms · $820/wk"
      ]},
      { suburb: "Dalkeith", inc: "6.0%", median: 1100, badge: "CLOSEST PRICE", listings:[
        "10 Dalkeith Rd · 2 rooms · $935/wk", "25 Dalkeith Ave · 3 rooms · $1,100/wk"
      ]}
    ];
    const container = document.getElementById("altsContainer");
    if (container){
      container.innerHTML = alts.map(a=>`
        <div class="alt-card">
          <h5>${a.suburb} <span class="badge">${a.badge||'SIMILAR'}</span></h5>
          <div class="alt-meta">Annualised increase ${a.inc || '—'}<br>Median weekly rent <b>$${a.median}</b></div>
          <div class="alt-meta">~$${Math.abs((a.median - data.inputRent))}/wk ${a.median >= data.inputRent ? '↑ vs yours' : '↓ vs yours'}</div>
          <div class="alt-meta"><strong>Suggested listings</strong></div>
          <ul class="listings">${(a.listings||[]).map(li=>`<li>${li}</li>`).join("")}</ul>
        </div>
      `).join("");
    }
  })();
}

// ---- Dashboard page ----
if (location.pathname.endsWith("dashboard.html")){
  requireAuth();
  const $ = id => document.getElementById(id);
  const prof = JSON.parse(localStorage.getItem("profile") || "{}");
  const last = JSON.parse(localStorage.getItem("lastQuery") || "{}");

  const name = prof.displayName || "Alex";
  const suburb = prof.prefSuburb || last.suburb || "Nedlands";
  $("welcomeTitle").textContent = `Welcome, ${name}`;
  $("welcomeSub").textContent = `Personalised view for ${suburb}`;
  $("displayName").value = name;
  $("prefSuburb").value = suburb;
  $("inpRent").value = last.weeklyRent ?? 500;
  $("inpIncome").value = last.income ?? 1500;
  $("inpLandlord").value = last.landlord || "Agency";
  $("thresholdVal").textContent = $("inpThreshold").value;
  $("inpThreshold").addEventListener("input", ()=> $("thresholdVal").textContent = $("inpThreshold").value);

  (async ()=>{
    const rent = Number($("inpRent").value);
    const res = await fetch(`${API_BASE}/api/predict`,{
      method:"POST",
      headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${getToken()}` },
      body: JSON.stringify({ suburb, weeklyRent: rent })
    });
    const data = await res.json();
    const nextDate = new Date(); nextDate.setMonth(nextDate.getMonth()+12);
    $("statNext").textContent = nextDate.toLocaleDateString();
    const projected = Math.round((rent + Math.max(0, data.median*0.05)) / 5) * 5;
    $("statProj").textContent = `$${projected.toFixed(0)}/wk`;
    $("statConf").textContent = `${Math.min(95, 50 + Math.round((data.stabilityScore||60)/2))}%`;
    drawForecastChart("forecastChart", rent, projected, Number($("inpIncome").value));
  })();

  $("seeRecs").addEventListener("click", async ()=>{
    localStorage.setItem("profile", JSON.stringify({
      displayName: $("displayName").value.trim() || "User",
      prefSuburb: $("prefSuburb").value.trim() || "Nedlands"
    }));
    const rent = Number($("inpRent").value);
    const income = Number($("inpIncome").value) || 1;
    drawForecastChart("forecastChart", rent, rent*1.05, income);
    $("latestMsg").textContent = (rent/income) > 0.3 ? "Warning: affordability close to 30% stress threshold." : "No strong red flags based on current inputs.";
  });

  function drawForecastChart(canvasId, rentNow, rentFuture, income){
    const c = document.getElementById(canvasId); if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0,0,c.width,c.height);

    const W=c.width,H=c.height, pad=50;
    const x0=pad,y0=H-pad, x1=W-pad, y1=pad;
    ctx.strokeStyle="#e6e6e6"; ctx.lineWidth=1;
    for(let i=0;i<=6;i++){ const x = x0 + (i*(x1-x0)/6); ctx.beginPath(); ctx.moveTo(x,y0); ctx.lineTo(x,y1); ctx.stroke(); }
    for(let i=0;i<=4;i++){ const y = y0 - (i*(y0-y1)/4); ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke(); }

    const maxRent = Math.max(rentNow, rentFuture) * 1.2;
    const rentToY = v => y0 - (v/maxRent)*(y0-y1);
    const months = 18;

    // Weekly rent (blue)
    ctx.strokeStyle="#2563eb"; ctx.lineWidth=2; ctx.beginPath();
    for(let m=0;m<=months;m++){
      const x = x0 + (m/months)*(x1-x0);
      const v = m<6 ? rentNow : rentNow + (rentFuture-rentNow)*((m-6)/(months-6));
      const y = rentToY(v);
      m===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.stroke();

    // Affordability ratio (green)
    ctx.strokeStyle="#16a34a"; ctx.lineWidth=2; ctx.beginPath();
    for(let m=0;m<=months;m++){
      const x = x0 + (m/months)*(x1-x0);
      const v = m<6 ? rentNow : rentNow + (rentFuture-rentNow)*((m-6)/(months-6));
      const ratio = v / (income||1);
      const y = y0 - Math.min(1, ratio*3) * (y0-y1);
      m===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.stroke();

    // 30% stress
    ctx.setLineDash([6,6]); ctx.strokeStyle="#ef4444"; ctx.lineWidth=1.5;
    const stressY = y0 - 0.3*(y0-y1); ctx.beginPath(); ctx.moveTo(x0,stressY); ctx.lineTo(x1,stressY); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle="#6b7280"; ctx.fillText("Stress 30%", x0+6, stressY-6);
  }
}