// app.js — RentScope (auth + header + simple routing)

/* ================= Config ================= */
const API_BASE = "https://rentscope-backend.onrender.com";

/* ================= localStorage helpers ================= */
function saveToken(t){ localStorage.setItem("token", t); }
function getToken(){ return localStorage.getItem("token"); }
function clearToken(){ localStorage.removeItem("token"); }

function saveProfile(p){ localStorage.setItem("profile", JSON.stringify(p || null)); }
function getProfile(){
  try { return JSON.parse(localStorage.getItem("profile") || "null"); }
  catch { return null; }
}
function clearProfile(){ localStorage.removeItem("profile"); }

/* ================= small toast ================= */
function toast(msg, ms=2200){
  const t = document.getElementById("toast");
  if(!t){ console.log(msg); return; }
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), ms);
}

/* ================= API helpers ================= */
async function postJSON(path, body, { auth=false } = {}){
  const headers = { "Content-Type": "application/json" };
  if(auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {})
  });
  const data = await res.json().catch(()=>null);
  if(!res.ok) throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  return data;
}
async function getJSON(path, { auth=false } = {}){
  const headers = {};
  if(auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  const data = await res.json().catch(()=>null);
  if(!res.ok) throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  return data;
}

/* ================= Auth API (shape-agnostic) ================= */
function normalizeAuthPayload(data){
  const token = data?.token || data?.jwt || null;
  const user  = data?.user || data?.profile || data?.me || null;
  return { token, user };
}
async function apiSignup({ name, email, password }){
  // Try common endpoints used in your project
  for (const p of ["/api/signup","/signup","/api/auth/signup","/auth/signup"]) {
    try { return await postJSON(p, { name, email, password }); } catch(_) {}
  }
  throw new Error("Signup route not found");
}
async function apiLogin({ email, password }){
  for (const p of ["/api/login","/login","/api/auth/login","/auth/login"]) {
    try { return await postJSON(p, { email, password }); } catch(_) {}
  }
  throw new Error("Login route not found");
}
async function apiMe(){
  for (const p of ["/api/me","/me","/api/auth/me","/auth/me"]) {
    try { return await getJSON(p, { auth:true }); } catch(_) {}
  }
  // not fatal — some backends don't expose /me
  return null;
}

/* ================= Header rendering =================
Expected HTML in your header (already added below in index.html & browse.html):
  <div id="header-auth">
    <a id="header-signin" class="btn" href="login.html">Sign in</a>
  </div>
  <div id="header-user" class="hidden">
    <span id="header-username"></span>
    <button id="header-signout" class="btn btn--ghost">Sign out</button>
  </div>
*/
function renderHeader(){
  const authed = !!getToken();
  const user = getProfile();

  const elAuth = document.getElementById("header-auth");
  const elUser = document.getElementById("header-user");
  const elName = document.getElementById("header-username");

  if(elAuth) elAuth.classList.toggle("hidden", authed);
  if(elUser) elUser.classList.toggle("hidden", !authed);
  if(elName) elName.textContent = user?.name || user?.fullName || user?.email || "User";

  // Optional: show greeting text inside elements that declare data-hello
  document.querySelectorAll("[data-hello]").forEach(el=>{
    el.textContent = (user?.name || "there");
  });
}

/* ================= Events ================= */
function bindHeaderEvents(){
  const out = document.getElementById("header-signout");
  if(out){
    out.addEventListener("click", ()=>{
      clearToken(); clearProfile();
      renderHeader();
      toast("Signed out");
      // stay on page; header will swap to Sign in
    });
  }
}

function bindLoginPage(){
  const form = document.getElementById("login-form");
  if(!form) return;
  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    try{
      const data = await apiLogin({ email, password });
      const { token, user } = normalizeAuthPayload(data);
      if(!token) throw new Error("No token returned");
      saveToken(token);
      if(user) saveProfile(user);
      renderHeader();
      toast("Logged in");
      // After login: go to dashboard if it exists, else back home
      location.href = "index.html";
    }catch(err){
      toast(err.message || "Login failed");
      console.error(err);
    }
  });
}

function bindSignupPage(){
  const form = document.getElementById("signup-form");
  if(!form) return;
  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    try{
      const data = await apiSignup({ name, email, password });
      const { token, user } = normalizeAuthPayload(data);
      // Some backends return token at signup, others require login — handle both.
      if(token) {
        saveToken(token);
        saveProfile(user || { name, email });
      } else {
        // fall back: login immediately after signup
        const d2 = await apiLogin({ email, password });
        const norm = normalizeAuthPayload(d2);
        if(!norm.token) throw new Error("No token after signup");
        saveToken(norm.token);
        saveProfile(norm.user || { name, email });
      }
      renderHeader();
      toast("Welcome aboard!");
      // Requirement: if user clicked Sign up from Home, return to Home logged in.
      location.href = "index.html";
    }catch(err){
      toast(err.message || "Signup failed");
      console.error(err);
    }
  });
}

/* ================= Init on every page ================= */
document.addEventListener("DOMContentLoaded", async ()=>{
  // Try to refresh profile if only token is present
  if(getToken() && !getProfile()){
    try{
      const me = await apiMe();
      if(me && (me.user || me.profile || me.name || me.email)){
        const user = me.user || me.profile || me;
        saveProfile(user);
      }
    }catch(_){}
  }

  renderHeader();
  bindHeaderEvents();
  bindLoginPage();
  bindSignupPage();

  // Ensure any “Home → Sign up / Log in” buttons are simple anchors.
  document.querySelectorAll("[data-link]").forEach(a=>{
    a.addEventListener("click", (e)=>{
      const href = a.getAttribute("href");
      if(href) location.href = href;
    });
  });
});