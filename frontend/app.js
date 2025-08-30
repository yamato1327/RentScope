// app.js  — FULL REPLACEMENT
// ----------------------------------------------------
// Frontend for RentScope (auth + routing + API calls)
// Compatible with prior backend routes & response shapes
// ----------------------------------------------------

// ===== Config =====
const API_BASE = "https://rentscope-backend.onrender.com";

// Common route shapes we see in Express apps; we’ll probe in order.
const ROUTES = {
  signup: ["/api/signup", "/signup", "/api/auth/signup", "/auth/signup"],
  login:  ["/api/login",  "/login",  "/api/auth/login",  "/auth/login"],
  me:     ["/api/me",     "/me",     "/api/auth/me",     "/auth/me"],
  health: ["/api/health", "/health"]
};

// ===== Local storage helpers =====
const saveToken = (t) => localStorage.setItem("token", t);
const getToken  = () => localStorage.getItem("token");
const clearToken = () => localStorage.removeItem("token");

const saveProfile = (p) => localStorage.setItem("profile", JSON.stringify(p));
const getProfile  = () => {
  try { return JSON.parse(localStorage.getItem("profile") || "null"); }
  catch { return null; }
};
const clearProfile = () => localStorage.removeItem("profile");

// ===== Toast =====
function toast(msg, ms = 2600){
  const el = document.getElementById("toast");
  if(!el){ console.warn("Toast:", msg); return; }
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), ms);
}

// ===== Auth UI helpers =====
function isAuthed(){ return !!getToken(); }
function getPage(){ return document.body?.dataset?.page || ""; }

function renderNav(){
  const has = isAuthed();
  const elDash   = document.getElementById("nav-dashboard");
  const elLogin  = document.getElementById("nav-login");
  const elSignup = document.getElementById("nav-signup");
  const elLogout = document.getElementById("nav-logout");

  if(elDash)   elDash.classList.toggle("hidden", !has);
  if(elLogout) elLogout.classList.toggle("hidden", !has);
  if(elLogin)  elLogin.classList.toggle("hidden", has);
  if(elSignup) elSignup.classList.toggle("hidden", has);
}

function logout({ silent=false } = {}){
  clearToken();
  clearProfile();
  if(!silent) toast("You’ve been logged out.");
  const page = getPage();
  if(page === "dashboard") location.href = "login.html";
  else renderNav();
}

function requireAuth(){
  if(!isAuthed()){
    location.href = "login.html";
    return false;
  }
  return true;
}

// ===== Smart fetch with route probing & 401 handling =====
async function tryFetchJSON(paths, opts = {}, { auth = true } = {}){
  // Clone headers safely
  const headers = new Headers(opts.headers || {});
  headers.set("Content-Type", "application/json");

  // Attach JWT if needed
  if(auth && getToken()) headers.set("Authorization", `Bearer ${getToken()}`);

  // Try each candidate path until one is not 404/405 (or succeeds)
  let lastErr;
  for(const path of paths){
    try{
      const res = await fetch(`${API_BASE}${path}`, { ...opts, headers, credentials: "omit" });

      // Global 401 handler
      if(res.status === 401){
        toast("Session expired. Please log in again.");
        logout({ silent:true });
        setTimeout(() => location.href = "login.html", 600);
        throw new Error("Unauthorized");
      }

      // If the backend doesn't recognize the route, try the next candidate
      if(res.status === 404 || res.status === 405){
        lastErr = new Error(`${res.status} on ${path}`);
        continue;
      }

      // Allow empty response (204 or empty body)
      const txt = await res.text();
      const data = txt ? JSON.parse(txt) : null;

      if(!res.ok){
        // Prefer backend-provided message keys
        const msg = (data && (data.error || data.message || data.msg)) || `Request failed (${res.status})`;
        const e = new Error(msg);
        e.status = res.status;
        e.data = data;
        throw e;
      }

      return { data, usedPath: path };
    }catch(err){
      // If this path produced a network/parse error, try next path
      lastErr = err;
    }
  }
  // If all candidates failed, surface the most recent error
  throw lastErr || new Error("All route candidates failed");
}

// Convenience wrappers for our known operations
async function apiSignup({ name, email, password }){
  return tryFetchJSON(ROUTES.signup, {
    method: "POST",
    body: JSON.stringify({ name, email, password })
  }, { auth:false });
}

async function apiLogin({ email, password }){
  return tryFetchJSON(ROUTES.login, {
    method: "POST",
    body: JSON.stringify({ email, password })
  }, { auth:false });
}

async function apiMe(){
  return tryFetchJSON(ROUTES.me, { method:"GET" }, { auth:true });
}

// ===== Response shape normalizer =====
function normalizeAuthPayload(data){
  // Accept common shapes:
  // { token, user }, { token, profile }, { jwt, user }
  const token = data?.token || data?.jwt || null;
  const user  = data?.user || data?.profile || data?.me || null;
  return { token, user };
}

// ===== Pages =====
function bindLogoutButtons(){
  ["nav-logout", "btn-logout"].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener("click", () => logout());
  });
}

function initHome(){
  const y = document.getElementById("year");
  if(y) y.textContent = new Date().getFullYear();
}

function bindLogin(){
  const form = document.getElementById("login-form");
  if(!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try{
      const { data, usedPath } = await apiLogin({ email, password });
      const { token, user } = normalizeAuthPayload(data);
      if(!token) throw new Error("No token returned from " + usedPath);

      saveToken(token);
      if(user) saveProfile(user);

      toast("Logged in!");
      location.href = "dashboard.html";
    }catch(err){
      // Surface backend’s actual message for clarity
      toast(err?.message || "Login failed");
      console.error("Login error:", err);
    }
  });
}

function bindSignup(){
  const form = document.getElementById("signup-form");
  if(!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;

    try{
      const { data, usedPath } = await apiSignup({ name, email, password });
      const { token, user } = normalizeAuthPayload(data);
      if(!token) throw new Error("No token returned from " + usedPath);

      saveToken(token);
      if(user) saveProfile(user);

      toast("Account created!");
      location.href = "dashboard.html";
    }catch(err){
      toast(err?.message || "Signup failed");
      console.error("Signup error:", err);
    }
  });
}

async function initDashboard(){
  if(!requireAuth()) return;

  // Cached profile first for snappy UI
  let profile = getProfile();

  if(!profile){
    try{
      const { data } = await apiMe();
      // Some backends return { _id, name, email } directly
      const me = data?.user || data?.profile || data;
      profile = me || null;
      if(profile) saveProfile(profile);
    }catch(err){
      // 401 already handled globally
      console.error("Load /me failed:", err);
      return;
    }
  }

  const name  = profile?.name  || "there";
  const email = profile?.email || "—";
  setText("greeting", name);
  setText("info-name", name);
  setText("info-email", email);

  // Demo KPI values (replace with real endpoints when ready)
  setText("kpi-listings", "128");
  setText("kpi-avg-rent", "620");
  setText("kpi-preds", "42");

  drawChartPlaceholder();
}

// ===== Utilities =====
function setText(id, v){
  const el = document.getElementById(id);
  if(el) el.textContent = v;
}

function drawChartPlaceholder(){
  const c = document.getElementById("chart");
  if(!c) return;
  const ctx = c.getContext("2d");
  const w = c.width, h = c.height;
  ctx.clearRect(0,0,w,h);
  // axes
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 20); ctx.lineTo(40, h-30); ctx.lineTo(w-20, h-30);
  ctx.stroke();
  // line
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const pts = [0, 12, 5, 18, 10, 14, 15, 22, 20, 16, 25, 27, 30, 24, 35, 29, 40, 33, 45, 31, 50, 37];
  for(let i=0;i<pts.length;i+=2){
    const x = 40 + (pts[i] / 50) * (w-60);
    const y = (h-30) - (pts[i+1] / 40) * (h-60);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.stroke();
}

// ===== Bootstrap =====
document.addEventListener("DOMContentLoaded", async () => {
  renderNav();
  bindLogoutButtons();

  const page = getPage();
  if(page === "home")     initHome();
  if(page === "login")    bindLogin();
  if(page === "signup")   bindSignup();
  if(page === "dashboard")initDashboard();

  // Optional: log which health route exists (helpful while diagnosing)
  // Doesn’t affect UI or auth
  try{
    const { usedPath } = await tryFetchJSON(ROUTES.health, { method:"GET" }, { auth:false });
    console.info("Backend health route detected at:", usedPath);
  }catch(e){
    console.warn("Could not detect a health route; continuing anyway.");
  }
});
