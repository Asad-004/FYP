import React, { useState } from "react";
import "./LandingHome.css";

const TEAM_SLIDES = [
  {
    caption: "The team behind ThreatLens Auditor",
    members: "Security Engineers • Researchers • Product Builders",
  },
  {
    caption: "Offensive & defensive security collaboration",
    members: "Continuous rule & detection engineering",
  },
  {
    caption: "Built for clear triage and reporting",
    members: "Focused workflows across web & cloud targets",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Having clear evidence and structured reporting right away saves hours of manual triage across every assessment.",
    author: "Shay Chen",
    role: "CEO at Effective Security Ltd.",
  },
  {
    quote:
      "Consistent scanning workflows and clear vulnerability context help our team standardize security checks faster.",
    author: "Ricardo Milhomem",
    role: "Information Security Specialist",
  },
];

const FAQS = [
  {
    q: "Does ThreatLens Auditor develop proprietary detection checks?",
    a: "Yes—our detection library covers thousands of security checks, signatures, and vulnerability patterns updated continuously.",
  },
  {
    q: "How accurate is vulnerability detection?",
    a: "Checks are designed around evidence verification and structured validation to reduce noise and highlight actionable findings.",
  },
  {
    q: "Who uses ThreatLens Auditor?",
    a: "Security teams, MSSPs, engineering/IT teams, and researchers auditing authorized web applications and assets.",
  },
  {
    q: "How do I move into the main application?",
    a: "Click Login or Open App in the top bar—or any section CTA—to enter your application workspace.",
  },
];

export default function LandingHome({ onEnterApp }) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [testIdx, setTestIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="lh-page">
      {/* Top Bar */}
      <header className="lh-header">
        <div className="lh-container lh-header-inner">
          <button
            type="button"
            className="lh-logo"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <svg viewBox="0 0 32 32" className="lh-logo-svg" aria-hidden="true">
              <circle cx="16" cy="16" r="14" fill="#f5b400" />
              <path
                d="M10 16c1.8-3.5 9.8-3.5 11.6 0-1.8 3.5-9.8 3.5-11.6 0z"
                fill="#141417"
              />
              <circle cx="16" cy="16" r="2.3" fill="#f5b400" />
            </svg>
            <span>
              <strong>ThreatLens</strong> Auditor
            </span>
          </button>

          <nav className="lh-nav">
            <a href="#scanning">Scanning</a>
            <a href="#ai-testing">Autonomous</a>
            <a href="#services">Services</a>
            <a href="#metrics">Accuracy</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="lh-header-cta">
            <button type="button" className="lh-btn-ghost" onClick={onEnterApp}>
              Login
            </button>
            <button
              type="button"
              className="lh-btn-amber"
              onClick={onEnterApp}
            >
              Start free trial
            </button>
          </div>
        </div>
      </header>

      {/* Block 1: Scanning & Evidence (Animated Stack Diagram) */}
      <section id="scanning" className="lh-section lh-hero">
        <div className="lh-container lh-grid-2">
          <div className="lh-stack-anim">
            <div className="lh-node lh-node-top lh-float-slow">
              <span>MainApp.app</span>
            </div>
            <div className="lh-connector" />
            <div className="lh-node lh-node-mid lh-pulse-border">
              <span>:443/tcp</span>
              <small>HTTPS / TLS</small>
            </div>
            <div className="lh-node-row">
              <div className="lh-node lh-node-sub lh-float-delayed">
                <span>WordPress</span>
              </div>
              <div className="lh-node lh-node-sub lh-float-slow">
                <span>Apache</span>
              </div>
            </div>
          </div>

          <div>
            <h2>
              Vulnerability scanning and deterministic validation: accurate
              results you can act on
            </h2>
            <p className="lh-quote">
              &ldquo;I need an up-to-date view of what deserves my team&apos;s
              attention, day in and day out.&rdquo;
            </p>
            <p className="lh-text">
              Inspect web surfaces, verify real exposure with clear evidence,
              and track changes across scans without getting buried in noise.
            </p>
            <ul className="lh-list">
              <li>Web, network, and cloud checks with regular updates</li>
              <li>Request/response context, evidence snippets, and screenshots</li>
              <li>Diff notifications highlighting what is new and what changed</li>
              <li>Full control over targets, timing, and scope</li>
            </ul>
            <button
              type="button"
              className="lh-btn-amber"
              onClick={onEnterApp}
            >
              Try it yourself (Free 7-day trial)
            </button>
          </div>
        </div>
      </section>

      {/* Block 2: Autonomous Investigation (Animated Radar + Visor Graphic) */}
      <section id="ai-testing" className="lh-section lh-alt">
        <div className="lh-container lh-grid-2">
          <div>
            <h2>Autonomous web application investigation on demand</h2>
            <p className="lh-quote">
              &ldquo;I need to pentest this web app today.&rdquo;
            </p>
            <p className="lh-text">
              Define the scope and run deep, context-aware checks with
              structured proof and step-by-step reproducibility.
            </p>
            <ul className="lh-list">
              <li>Context-driven decisions based on observed web behavior</li>
              <li>Controlled validation to confirm impact cleanly</li>
              <li>Reproducible steps included with every finding</li>
            </ul>
            <button
              type="button"
              className="lh-btn-amber"
              onClick={onEnterApp}
            >
              See what it can do
            </button>
          </div>

          <div className="lh-radar-stage">
            <div className="lh-radar-ring lh-ring-1" />
            <div className="lh-radar-ring lh-ring-2" />
            <div className="lh-radar-sweep" />
            <div className="lh-visor-card lh-float-slow">
              <div className="lh-visor-lens">
                <span className="lh-crosshair" />
              </div>
              <div className="lh-visor-lens">
                <span className="lh-crosshair" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Block 3: Expert Services (Animated Document Card) */}
      <section id="services" className="lh-section">
        <div className="lh-container lh-grid-2">
          <div className="lh-doc-stage">
            <div className="lh-doc-sheet lh-float-delayed">
              <div className="lh-doc-line lh-w-70" />
              <div className="lh-doc-line lh-w-90" />
              <div className="lh-doc-line lh-w-60" />
              <div className="lh-doc-badge">VERIFIED REPORT</div>
            </div>
          </div>

          <div>
            <h2>
              Offensive security services: expert judgment where automation
              falls short
            </h2>
            <p className="lh-quote">
              &ldquo;I need a specialist to investigate this asset and tailor
              recommendations to my business.&rdquo;
            </p>
            <ul className="lh-list">
              <li>Manual exploration of complex attack paths and business logic</li>
              <li>Detailed reports tailored to your specific application context</li>
            </ul>
            <button
              type="button"
              className="lh-btn-amber"
              onClick={onEnterApp}
            >
              See how our services team works
            </button>
          </div>
        </div>
      </section>

      {/* Block 4: Accuracy Metrics Strip */}
      <section id="metrics" className="lh-section lh-alt">
        <div className="lh-container">
          <h2>Accuracy is the new product</h2>
          <div className="lh-metrics">
            <div className="lh-metric-box">
              <div className="lh-metric-num">92%</div>
              <p>Detection precision in web application checks</p>
            </div>
            <div className="lh-metric-box">
              <div className="lh-metric-num">0</div>
              <p>Unverified noise when evidence-backed checks are used</p>
            </div>
            <div className="lh-metric-box">
              <div className="lh-metric-num">17,400+</div>
              <p>Detection checks &amp; modules across web and cloud</p>
            </div>
            <div className="lh-metric-box">
              <div className="lh-metric-num">1 scan / 5s</div>
              <p>High-throughput automated execution</p>
            </div>
          </div>
        </div>
      </section>

      {/* Block 5: Team Carousel */}
      <section className="lh-section">
        <div className="lh-container lh-grid-2">
          <div>
            <h2>A decade of developing offensive security technology &amp; tactics</h2>
            <p className="lh-text">
              Built continuously to help security and engineering teams focus on
              real risk first.
            </p>
          </div>
          <div className="lh-carousel-card">
            <div className="lh-team-banner">
              <span>{TEAM_SLIDES[slideIdx].caption}</span>
              <small>{TEAM_SLIDES[slideIdx].members}</small>
            </div>
            <div className="lh-carousel-controls">
              <button
                type="button"
                onClick={() =>
                  setSlideIdx((p) => (p - 1 + TEAM_SLIDES.length) % TEAM_SLIDES.length)
                }
              >
                ←
              </button>
              <div className="lh-dots">
                {TEAM_SLIDES.map((s, i) => (
                  <button
                    key={s.caption}
                    type="button"
                    className={i === slideIdx ? "active" : ""}
                    onClick={() => setSlideIdx(i)}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSlideIdx((p) => (p + 1) % TEAM_SLIDES.length)}
              >
                →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Block 6: Customer Testimonials */}
      <section className="lh-section lh-alt">
        <div className="lh-container lh-grid-2">
          <div>
            <h2>Customer Testimonials</h2>
            <button type="button" className="lh-btn-amber" onClick={onEnterApp}>
              Open workspace
            </button>
          </div>
          <div className="lh-testimonial-card">
            <p className="lh-quote">&ldquo;{TESTIMONIALS[testIdx].quote}&rdquo;</p>
            <strong>{TESTIMONIALS[testIdx].author}</strong>
            <div className="lh-muted">{TESTIMONIALS[testIdx].role}</div>
            <div className="lh-carousel-controls">
              <button
                type="button"
                onClick={() =>
                  setTestIdx((p) => (p - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
                }
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setTestIdx((p) => (p + 1) % TESTIMONIALS.length)}
              >
                →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Block 7: Audience Cards + Trust Badges */}
      <section className="lh-section">
        <div className="lh-container">
          <h2>ThreatLens Auditor is for</h2>
          <div className="lh-cards-3">
            <div className="lh-persona-card">
              <h3>Internal security teams</h3>
              <p>Monitor everything, prioritize what matters.</p>
              <button type="button" className="lh-link" onClick={onEnterApp}>
                See more ▾
              </button>
            </div>
            <div className="lh-persona-card">
              <h3>Managed Security Providers (MSSPs)</h3>
              <p>Deliver more value with less overhead.</p>
              <button type="button" className="lh-link" onClick={onEnterApp}>
                See more ▾
              </button>
            </div>
            <div className="lh-persona-card">
              <h3>IT Teams</h3>
              <p>Get security checks done without slowing delivery.</p>
              <button type="button" className="lh-link" onClick={onEnterApp}>
                See more ▾
              </button>
            </div>
          </div>

          <h3 className="lh-sub-heading">Technology vetted by industry pros</h3>
          <div className="lh-badges">
            <div className="lh-badge-tile">
              <strong>Deloitte 500</strong>
              <span>Fast-growing tech</span>
            </div>
            <div className="lh-badge-tile">
              <strong>ISO 27001</strong>
              <span>Audited security controls</span>
            </div>
            <div className="lh-badge-tile">
              <strong>Gartner</strong>
              <span>Peer Insights</span>
            </div>
            <div className="lh-badge-tile">
              <strong>G2</strong>
              <span>High Performer</span>
            </div>
          </div>
        </div>
      </section>

      {/* Block 8: FAQ + Footer */}
      <section id="faq" className="lh-section lh-alt">
        <div className="lh-container lh-faq-grid">
          <div>
            <h2>Frequently Asked Questions</h2>
          </div>
          <div className="lh-faq-list">
            {FAQS.map((item, i) => {
              const expanded = openFaq === i;
              return (
                <div key={item.q} className="lh-faq-row">
                  <button
                    type="button"
                    className="lh-faq-btn"
                    onClick={() => setOpenFaq(expanded ? -1 : i)}
                  >
                    <span>{item.q}</span>
                    <span>{expanded ? "−" : "+"}</span>
                  </button>
                  {expanded && <p className="lh-faq-body">{item.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="lh-footer">
        <div className="lh-container lh-footer-inner">
          <div className="lh-logo">
            <svg viewBox="0 0 32 32" className="lh-logo-svg" aria-hidden="true">
              <circle cx="16" cy="16" r="14" fill="#f5b400" />
              <path
                d="M10 16c1.8-3.5 9.8-3.5 11.6 0-1.8 3.5-9.8 3.5-11.6 0z"
                fill="#141417"
              />
              <circle cx="16" cy="16" r="2.3" fill="#f5b400" />
            </svg>
            <span>
              <strong>ThreatLens</strong> Auditor
            </span>
          </div>
          <button type="button" className="lh-btn-amber" onClick={onEnterApp}>
            Launch App
          </button>
        </div>
      </footer>
    </div>
  );
}