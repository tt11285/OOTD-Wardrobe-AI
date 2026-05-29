import Link from "next/link";

type TabKey = "OOTD" | "ADD" | "WARDROBE" | "OUTFITS";

// Tiny line icons sized for the phone mock tab bar.
function TabIcon({ name }: { name: TabKey }) {
  const common = {
    width: 11,
    height: 11,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "OOTD": // home
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V20h14V9.5" />
        </svg>
      );
    case "ADD": // camera
      return (
        <svg {...common}>
          <path d="M4 7h3l2-2h6l2 2h3v12H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      );
    case "WARDROBE": // grid
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "OUTFITS": // sparkles
      return (
        <svg {...common}>
          <path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
        </svg>
      );
  }
}

// Bottom tab bar inside each phone mock — mirrors a real mobile app.
function PhoneTabBar({ active }: { active: TabKey }) {
  const tabs: TabKey[] = ["OOTD", "ADD", "WARDROBE", "OUTFITS"];
  return (
    <div className="phone-tabbar">
      {tabs.map((tab) => (
        <span key={tab} className={`phone-tab${active === tab ? " active" : ""}`}>
          <TabIcon name={tab} />
          {tab}
        </span>
      ))}
    </div>
  );
}

function PhoneFrame({
  children,
  label,
  active,
}: {
  children: React.ReactNode;
  label: string;
  active: TabKey;
}) {
  return (
    <div className="phone" role="img" aria-label={`${label} screen preview`}>
      <span className="phone-notch" aria-hidden="true" />
      <div className="phone-screen">
        <div className="phone-status" aria-hidden="true">
          <span>9:41</span>
          <span className="phone-status-icons" />
        </div>
        <div className="phone-body">{children}</div>
        <PhoneTabBar active={active} />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="app-page landing">
      <div className="landing-inner">
        {/* ── Left: hero card ───────────────────────────── */}
        <section className="landing-hero">
          <p className="eyebrow">OOTD</p>
          <h1>What to wear today — answered by your own wardrobe.</h1>
          <p className="hero-copy">
            Upload your clothes, let AI recognize each piece, then generate ready-to-wear
            outfits for commutes, interviews, dates and more.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="/upload">
              Start building
            </Link>
            <Link className="secondary-button" href="/outfits">
              What to wear
            </Link>
          </div>
        </section>

        {/* ── Right: three phones telling the flow ──────── */}
        <section className="landing-phones" aria-label="Product flow preview">
          {/* 1 · ADD */}
          <PhoneFrame label="Add" active="ADD">
            <p className="phone-eyebrow">ADD</p>
            <h2 className="phone-title">Snap your clothes</h2>
            <div className="phone-upload">
              <span className="phone-upload-icon" aria-hidden="true">↑</span>
              Select 1–10 photos
            </div>
            <div className="phone-badges">
              <span className="phone-badge">JPG</span>
              <span className="phone-badge">PNG</span>
              <span className="phone-badge">WebP</span>
            </div>
          </PhoneFrame>

          {/* 2 · WARDROBE */}
          <PhoneFrame label="Wardrobe" active="WARDROBE">
            <p className="phone-eyebrow">WARDROBE</p>
            <h2 className="phone-title">Your digital wardrobe</h2>
            <div className="phone-chips">
              <span className="phone-chip active">All</span>
              <span className="phone-chip">Top</span>
              <span className="phone-chip">Bottom</span>
              <span className="phone-chip">Shoes</span>
            </div>
            <div className="phone-grid">
              <span style={{ background: "#f3efe9" }} />
              <span style={{ background: "#35446b" }} />
              <span style={{ background: "#7b5b3f" }} />
              <span style={{ background: "#e8dfce" }} />
              <span style={{ background: "#1c1c1f" }} />
              <span style={{ background: "#b8a17e" }} />
            </div>
          </PhoneFrame>

          {/* 3 · OUTFITS */}
          <PhoneFrame label="Outfits" active="OUTFITS">
            <p className="phone-eyebrow">OUTFITS</p>
            <h2 className="phone-title">What to wear today?</h2>
            <div className="phone-outfit">
              <div className="phone-outfit-collage">
                <span style={{ background: "#f3efe9" }}><i>Top</i></span>
                <span style={{ background: "#1c1c1f" }}><i>Bottom</i></span>
                <span style={{ background: "#7b5b3f" }}><i>Shoes</i></span>
                <span style={{ background: "#b8a17e" }}><i>Outerwear</i></span>
              </div>
              <p className="phone-outfit-style">FRENCH MINIMAL</p>
              <p className="phone-outfit-reason">A crisp white shirt with tailored trousers — sharp yet easy.</p>
              <div className="phone-outfit-cta">Wear this today</div>
            </div>
          </PhoneFrame>
        </section>
      </div>
    </main>
  );
}
