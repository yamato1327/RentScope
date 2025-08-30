// app.js
// ---- Config ----
const API_BASE = "https://rentscope-backend.onrender.com";

// ---- Storage helpers ----
const saveToken = (t) => localStorage.setItem("token", t);
const getToken = () => localStorage.getItem("token");
const clearToken = () => localStorage.removeItem("token");

const saveProfile = (p) => localStorage.setItem("profile", JSON.stringify(p));
const getProfile = () => {
  try { return JSON.parse(localStorage.getItem("profile") || "null"); }
  catch { return null; }
};
const clearProfile = () => localStorage.removeItem("profile");

// ---- Toast ----
function toast(msg, ms = 2600){
  const el = document.getElementById("toast");
  if(!el) return alert(msg);
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), ms);
}

// ---- Auth + Guards ----
function isAuthed(){ return !!getToken(); }

function logout(opts = { silent:false }){
  clearToken();
  clearProfile();
  if(!opts.silent) toast("You’ve been logged out.");
  // Try to keep UX consistent: send to login when leaving protected pages.
  const page = getPage();
  if (page === "dashboard") {
    location.href = "login.html";
  } else {
    // update navbar state if staying
    renderNav();
  }
}

function requireAuth(){
  if(!isAuthed()){
    location.href = "login.html";
    return false;
  }
  return true;
}

// ---- Fetch helper with global 401 handling ----
async function fetchJSON(path, opts = {}, { auth = true } = {}){
  const headers = new Headers(opts.headers || {});
  headers.set("Content-Type", "application/json");
  if(auth && getToken()) headers.set("Authorization", `Bearer ${getToken()}`);
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers, credentials: "omit" });
  if(res.status === 401){
    toast("Session expired. Please log in again.");
    logout({ silent:true });
    setTimeout(() => location.href = "login.html", 600);
    throw new Error("Unauthorized");
  }
  // Allow empty JSON bodies
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if(!res.ok){
    const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// ---- API ----
async function apiSignup({ name, email, password }){
  return fetchJSON("/api/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  }, { auth:false });
}
async function apiLogin({ email, password }){
  return fetchJSON("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }, { auth:false });
}
async function apiMe(){
  return fetchJSON("/api/me", { method:"GET" }, { auth:true });
}

// ---- UI wiring ----
function getPage(){
  const b = document.body;
  return b?.dataset?.page || "";
}

function renderNav(){
  const has = isAuthed();
  const elDash = document.getElementById("nav-dashboard");
  const elLogin = document.getElementById("nav-login");
  const elSignup = document.getElementById("nav-signup");
  const elLogout = document.getElementById("nav-logout");

  if(elDash) elDash.classList.toggle("hidden", !has);
  if(elLogout) elLogout.classList.toggle("hidden", !has);
  if(elLogin) elLogin.classList.toggle("hidden", has);
  if(elSignup) elSignup.classList.toggle("hidden", has);
}

function bindLogoutButtons(){
  const btn1 = document.getElementById("nav-logout");
  const btn2 = document.getElementById("btn-logout");
  [btn1, btn2].forEach(btn => btn && btn.addEventListener("click", () => logout()));
}

// ---- Pages ----
async function initHome(){
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
      const { token, user } = await apiLogin({ email, password });
      if(!token) throw new Error("No token returned");
      saveToken(token);
      if(user) saveProfile(user);
      toast("Logged in!");
      location.href = "dashboard.html";
    }catch(err){
      toast(err.message || "Login failed");
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
      const { token, user } = await apiSignup({ name, email, password });
      if(!token) throw new Error("No token returned");
      saveToken(token);
      if(user) saveProfile(user);
      toast("Account created!");
      location.href = "dashboard.html";
    }catch(err){
      toast(err.message || "Signup failed");
    }
  });
}

async function initDashboard(){
  if(!requireAuth()) return;

  // Try cached profile first
  let profile = getProfile();
  if(!profile){
    try{
      profile = await apiMe();
      saveProfile(profile);
    }catch(err){
      // apiMe will already handle 401 → logout
      return;
    }
  }

  // Greeting + account panel
  const name = profile?.name || "there";
  const email = profile?.email || "—";
  const g = document.getElementById("greeting");
  const iName = document.getElementById("info-name");
  const iEmail = document.getElementById("info-email");
  if(g) g.textContent = name;
  if(iName) iName.textContent = name;
  if(iEmail) iEmail.textContent = email;

  // Demo KPI values (replace with real endpoints if you have them)
  setText("kpi-listings", "128");
  setText("kpi-avg-rent", "620");
  setText("kpi-preds", "42");

  // Simple canvas placeholder (keeps vanilla)
  drawChartPlaceholder();
}

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

// ---- Bootstrap ----
document.addEventListener("DOMContentLoaded", () => {
  renderNav();
  bindLogoutButtons();

  const page = getPage();
  if(page === "home") initHome();
  if(page === "login") bindLogin();
  if(page === "signup") bindSignup();
  if(page === "dashboard") initDashboard();
});