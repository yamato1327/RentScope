// --- Core & libs ---
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import "dotenv/config"; // loads .env into process.env

const app = express();

// ---------- CORS ----------
// In dev/hackathon: allow all. In prod, set ALLOWED_ORIGINS to a comma-separated list.
const allowed = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

if (allowed.length) {
  app.use(cors({
    origin: (origin, cb) => cb(null, !origin || allowed.includes(origin))
  }));
} else {
  app.use(cors());
}

// ---------- JSON parsing ----------
app.use(express.json());

// ---------- MongoDB ----------
try {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Mongo connected");
} catch (err) {
  console.error("Mongo connection error:", err.message);
}

// ---------- Models ----------
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model("User", userSchema);

// ---------- Auth helpers ----------
function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// ---------- Routes ----------
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash });
    const token = signToken(user);
    res.json({ token });
  } catch (e) {
    console.error("Signup error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = signToken(user);
    res.json({ token });
  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/me", authMiddleware, async (req, res) => {
  res.json({ userId: req.user.sub, email: req.user.email });
});

// ---------- Demo fixtures for predictor ----------
const FIXTURES = {
  "Nedlands": {
    median: 720,
    stabilityScore: 58,
    forecast: [
      { date: "01/09/2025", predicted: 730, ciLow: 705, ciHigh: 755 },
      { date: "01/03/2026", predicted: 745, ciLow: 715, ciHigh: 775 },
      { date: "01/09/2026", predicted: 765, ciLow: 730, ciHigh: 800 }
    ]
  },
  "Canning Vale": {
    median: 520,
    stabilityScore: 74,
    forecast: [
      { date: "01/09/2025", predicted: 522, ciLow: 505, ciHigh: 540 },
      { date: "01/03/2026", predicted: 528, ciLow: 508, ciHigh: 548 },
      { date: "01/09/2026", predicted: 534, ciLow: 512, ciHigh: 556 }
    ]
  },
  "Bentley": {
    median: 485,
    stabilityScore: 68,
    forecast: [
      { date: "01/09/2025", predicted: 492, ciLow: 470, ciHigh: 514 },
      { date: "01/03/2026", predicted: 498, ciLow: 474, ciHigh: 522 },
      { date: "01/09/2026", predicted: 505, ciLow: 478, ciHigh: 532 }
    ]
  }
};

app.post("/api/predict", authMiddleware, (req, res) => {
  const { suburb, weeklyRent } = req.body || {};
  const f = FIXTURES[suburb];
  if (!f) return res.status(404).json({ error: "No data for that suburb (try Nedlands, Canning Vale, Bentley)" });

  const diff = Number(weeklyRent) - f.median;
  const pct = Math.round((diff / f.median) * 100);
  let verdict = "normal";
  if (pct > 5 && pct <= 15) verdict = "slightly-high";
  if (pct > 15) verdict = "high";

  res.json({
    suburb,
    inputRent: Number(weeklyRent),
    median: f.median,
    overpay: { diff, pct, verdict },
    stabilityScore: f.stabilityScore,
    forecast: f.forecast
  });
});

// ---------- Fallback 404 ----------
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ---------- Start server ----------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));