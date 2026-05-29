import Link from "next/link";

// Mini nav rendered inside each phone mockup — mirrors the real top nav.
function PhoneNav({ active }: { active: "ADD" | "WARDROBE" | "OUTFITS" }) {
  return (
    <div className="phone-nav">
      <span className="phone-nav-brand">OOTD</span>
      {(["ADD", "WARDROBE", "OUTFITS"] as const).map((label) => (
        <span key={label} className={`phone-nav-link${active === label ? " active" : ""}`}>
          {label}
        </span>
      ))}
    </div>
  );
}

function PhoneFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="phone" role="img" aria-label={`${label} screen preview`}>
      <span className="phone-notch" aria-hidden="true" />
      <div className="phone-screen">
        <div className="phone-status" aria-hidden="true">
          <span>9:41</span>
          <span className="phone-status-icons" />
        </div>
        {children}
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
          <PhoneFrame label="Add">
            <PhoneNav active="ADD" />
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
          <PhoneFrame label="Wardrobe">
            <PhoneNav active="WARDROBE" />
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
          <PhoneFrame label="Outfits">
            <PhoneNav active="OUTFITS" />
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
