/* eslint-disable no-undef */
/* RentScope Home (no motion/icon packages)
   - Plain CSS animations (see home.css)
   - Inline SVG icons
   - Works without a router; upgradeable later
*/

const { useEffect, useState } = React;

/* ---------- Icons (inline SVG) ---------- */
const IconRadar = (props) => (
  <svg viewBox="0 0 24 24" fill="none" className={`rs-icon ${props.className||""}`} stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3a9 9 0 1 0 9 9" />
    <path d="M12 7a5 5 0 1 0 5 5" />
    <path d="M12 11a1 1 0 1 0 1 1" />
    <path d="M21 3l-7 7" />
  </svg>
);
const IconTrendingUp = (props) => (
  <svg viewBox="0 0 24 24" fill="none" className={`rs-icon ${props.className||""}`} stroke="currentColor" strokeWidth="1.5">
    <path d="M3 17l6-6 4 4 7-7" />
    <path d="M14 8h7v7" />
  </svg>
);
const IconShield = (props) => (
  <svg viewBox="0 0 24 24" fill="none" className={`rs-icon ${props.className||""}`} stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3l7 4v5a9 9 0 0 1-7 9 9 9 0 0 1-7-9V7l7-4z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
const IconWallet = (props) => (
  <svg viewBox="0 0 24 24" fill="none" className={`rs-icon ${props.className||""}`} stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="6" width="20" height="14" rx="2" />
    <path d="M16 10h4v6h-4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z" />
  </svg>
);
const IconHome = (props) => (
  <svg viewBox="0 0 24 24" fill="none" className={`rs-icon ${props.className||""}`} stroke="currentColor" strokeWidth="1.5">
    <path d="M3 11l9-8 9 8" />
    <path d="M9 21V9h6v12" />
  </svg>
);
const IconLayout = (props) => (
  <svg viewBox="0 0 24 24" fill="none" className={`rs-icon ${props.className||""}`} stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
  </svg>
);
const IconBuilding = (props) => (
  <svg viewBox="0 0 24 24" fill="none" className={`rs-icon ${props.className||""}`} stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="6" width="18" height="15" rx="2" />
    <path d="M7 6V3h10v3" />
    <path d="M8 12h1M12 12h1M16 12h1M8 16h1M12 16h1M16 16h1" />
  </svg>
);
const IconMapPin = (props) => (
  <svg viewBox="0 0 24 24" fill="none" className={`rs-icon ${props.className||""}`} stroke="currentColor" strokeWidth="1.5">
    <path d="M12 21s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10z" />
    <circle cx="12" cy="11" r="2.5" />
  </svg>
);

/* ---------- Minimal UI primitives ---------- */
const Button = ({ children, className = "", ...props }) => (
  <button className={`px-4 py-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 transition ${className}`} {...props}>
    {children}
  </button>
);
const Card = ({ children, className = "" }) => (
  <div className={`rs-card ${className}`}>{children}</div>
);
const CardHeader = ({ children, className = "" }) => <div className={`px-5 pt-5 ${className}`}>{children}</div>;
const CardContent = ({ children, className = "" }) => <div className={`px-5 pb-5 ${className}`}>{children}</div>;
const CardTitle = ({ children, className = "" }) => <div className={`text-lg font-semibold tracking-tight ${className}`}>{children}</div>;

/* ---------- Link that works without a router ---------- */
function SafeLink({ to = "#", className = "", children }) {
  return <a href={typeof to === "string" ? to : "#"} className={className}>{children}</a>;
}

function NavLink({ to, Icon, label }) {
  let isActive = false;
  try {
    const loc = typeof window !== "undefined" ? window.location : { pathname: "/", hash: "" };
    if (to === "/") isActive = (loc.pathname === "/" || loc.hash === "#" || loc.hash === "");
    else if ((to||"").startsWith("#")) isActive = loc.hash === to;
    else isActive = loc.pathname === to;
  } catch {}
  const base = "px-3 py-2 rounded-xl inline-flex items-center gap-2 text-sm";
  const active = isActive ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-200/60";
  return (
    <SafeLink to={to} className={`${base} ${active}`}>
      {Icon && <Icon />} {label}
    </SafeLink>
  );
}

/* ---------- Feature + Metric blocks ---------- */
function FeatureCard({ title, children }) {
  const icon =
    title === "Predict" ? <IconTrendingUp className="text-sky-600" /> :
    title === "Plan"    ? <IconWallet className="text-emerald-600" /> :
    title === "Protect" ? <IconShield className="text-indigo-600" /> : null;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-neutral-600 text-sm">{children}</CardContent>
    </Card>
  );
}
function Metric({ IconCmp, label, value }) {
  return (
    <div className="rounded-2xl border p-4 bg-white/60">
      <div className="text-xs text-neutral-500 flex items-center gap-2">
        {IconCmp ? <IconCmp /> : null} {label}
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

/* ---------- Home Component ---------- */
function RentScopeHome() {
  const slides = [
    {
      id: 0,
      kicker: "Plan",
      title: "Affordability made clear",
      text: "Track rent as a share of income and set weekly savings toward expected changes.",
      metrics: [
        { IconCmp: IconTrendingUp, label: "Next increase",  value: "12 Feb 2026" },
        { IconCmp: IconWallet,     label: "Projected rent", value: "$525 / wk" },
        { IconCmp: IconShield,     label: "Confidence",     value: "92%" },
      ],
    },
    {
      id: 1,
      kicker: "Forecasts",
      title: "See rent hikes early",
      text: "Enter suburb and current rent to get a projected increase window and amount.",
      metrics: [
        { IconCmp: IconTrendingUp, label: "Window",  value: "Mar–Jun 2026" },
        { IconCmp: IconWallet,     label: "Change",  value: "+$35 / wk" },
        { IconCmp: IconShield,     label: "Confidence", value: "88%" },
      ],
    },
    {
      id: 2,
      kicker: "Benchmarks",
      title: "Know if you're overpaying",
      text: "Compare weekly rent to suburb medians and negotiation ranges.",
      metrics: [
        { IconCmp: IconWallet,     label: "Suburb median", value: "$650 / wk" },
        { IconCmp: IconTrendingUp, label: "Overpay",       value: "+8%" },
        { IconCmp: IconShield,     label: "Target range",  value: "$618–$683" },
      ],
    },
  ];

  const [index, setIndex] = useState(0);
  const [intro, setIntro] = useState(true);

  useEffect(() => {
    // Hide after 2.5 seconds OR when user scrolls
    const timer = setTimeout(() => setIntro(false), 2500);

    const onScroll = () => {
        setIntro(false);
        clearTimeout(timer);
    };

    window.addEventListener("scroll", onScroll);
    return () => {
        clearTimeout(timer);
        window.removeEventListener("scroll", onScroll);
    };
  }, []);


  /* auto-rotate slides */
  useEffect(() => {
    const t = setInterval(() => setIndex(i => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <>
      {/* Intro overlay (fades out) */}
      {intro && (
        <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center rs-fade-out">
          <div className="text-3xl md:text-5xl font-semibold text-sky-600">Welcome to RentScope</div>
        </div>
      )}

      {/* Background */}
      <div className="rs-bg"></div>

      {/* Header / Taskbar */}
      <header className="rs-header">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/80 backdrop-blur border border-white/60 shadow-sm flex items-center justify-center">
              <IconRadar className="text-sky-600" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">RentScope</div>
              <div className="text-xs text-neutral-500">Predict. Prepare. Stay secure.</div>
            </div>
          </a>
          <nav className="hidden md:flex items-center gap-2 text-sm">
            <NavLink to="/" Icon={IconHome} label="Home" />
            <NavLink to="/dashboard" Icon={IconLayout} label="Dashboard" />
            <NavLink to="#accommodation" Icon={IconBuilding} label="Accommodation" />
          </nav>
          <a href="login.html"><Button className="rounded-xl">Sign in</Button></a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{
          background:
            "radial-gradient(1200px 600px at -10% 20%, rgba(59,130,246,0.16), transparent 60%)," +
            "radial-gradient(1200px 600px at 110% 80%, rgba(16,185,129,0.16), transparent 60%)",
        }} />
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-20 relative z-10">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <h1 className="text-5xl md:text-6xl font-semibold tracking-tight rs-float-in">RentScope</h1>
              <p className="mt-4 text-neutral-600 text-lg max-w-xl">
                Predict rent hikes, prepare finances, and stay secure with guidance that is easy to act on.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <a href="dashboard.html"><Button className="rounded-xl">Open dashboard</Button></a>
                <a href="#accommodation"><Button className="rounded-xl bg-sky-600 text-white hover:bg-sky-700">Browse accommodation</Button></a>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rs-card shadow-sm p-5 min-h-[260px] flex flex-col justify-between">
                <div className="rs-badge">{slides[index].kicker}</div>

                {/* slide content */}
                <div className="mt-1 rs-slide rs-active">
                  <div className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <IconTrendingUp className="text-sky-600" /> {slides[index].title}
                  </div>
                  <div className="text-sm text-neutral-600 mt-2">{slides[index].text}</div>
                  <div className="mt-4 grid sm:grid-cols-3 gap-3">
                    {slides[index].metrics.map((m) => (
                      <Metric key={m.label} IconCmp={m.IconCmp} label={m.label} value={m.value} />
                    ))}
                  </div>
                </div>

                {/* dots */}
                <div className="mt-5 flex items-center gap-2">
                  {slides.map((s, i) => (
                    <button
                      key={s.id}
                      aria-label={`Slide ${i + 1}`}
                      onClick={() => setIndex(i)}
                      className={`rs-dot ${i === index ? "rs-active" : ""}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-xl font-medium">What you get</h2>
          <div className="mt-4 grid md:grid-cols-3 gap-4">
            <FeatureCard title="Predict">Suburb patterns show when increases happen and by how much.</FeatureCard>
            <FeatureCard title="Plan">Affordability meter and saving guidance tied to the forecast.</FeatureCard>
            <FeatureCard title="Protect">Cheaper areas and temporary options when stability matters.</FeatureCard>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">What renters say</h2>
          <div className="mt-6 grid md:grid-cols-3 gap-6">
            <Card className="rounded-2xl p-5">
              <p className="text-sm text-neutral-600">“RentScope helped me prepare for my lease renewal. I could budget properly knowing what was coming.”</p>
              <div className="mt-3 text-sm font-medium">— Sarah, Perth</div>
            </Card>
            <Card className="rounded-2xl p-5">
              <p className="text-sm text-neutral-600">“The benchmarks showed I was overpaying. Having that evidence made negotiation much easier.”</p>
              <div className="mt-3 text-sm font-medium">— Jason, Nedlands</div>
            </Card>
            <Card className="rounded-2xl p-5">
              <p className="text-sm text-neutral-600">“Knowing there were alternatives nearby gave me peace of mind during a stressful time.”</p>
              <div className="mt-3 text-sm font-medium">— Priya, Joondalup</div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-7xl mx-auto px-6 py-8 text-sm text-neutral-600 flex items-center gap-2">
          <IconRadar /> Designed for WA renters. Demo data only.
        </div>
      </footer>
    </>
  );
}