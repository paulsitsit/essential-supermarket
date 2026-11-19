import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Clock,
  Layers,
  MapPin,
  Package,
  QrCode,
  RefreshCw,
  ShieldAlert,
  ShoppingCart,
  TrendingDown
} from 'lucide-react';

const ZONES = [
  {
    id: 'entrance',
    aisle: 'ENTRANCE',
    label: 'Store Entrance',
    title: 'Welcome to Essential Supermarket',
    subtitle: 'Walk through how our inventory system keeps every aisle stocked, fresh, and accounted for.',
    accent: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.28)',
    icon: MapPin,
    cards: [
      {
        icon: Package,
        title: 'Smart Inventory Tracking',
        text: 'Monitor product quantities, stock levels, categories, and supplier details in one unified system.'
      },
      {
        icon: Layers,
        title: 'End-to-End Visibility',
        text: 'From receiving stock at the dock to checkout analytics, every movement is logged automatically.'
      }
    ],
    stat: { value: '100%', label: 'Real-time shelf visibility' }
  },
  {
    id: 'receiving',
    aisle: 'AISLE 01',
    label: 'Receiving Dock',
    title: 'Add Products & Receive Batches',
    subtitle: 'Step 01 & 02 — Register products, link suppliers, and log incoming stock batches the moment deliveries arrive.',
    accent: '#818cf8',
    glow: 'rgba(129, 140, 248, 0.28)',
    icon: Package,
    cards: [
      {
        icon: Package,
        title: 'Structured Product Records',
        text: 'Store SKUs, categories, pricing, and supplier details so staff can locate or update items in seconds.'
      },
      {
        icon: RefreshCw,
        title: 'Batch-Level Receiving',
        text: 'Group incoming deliveries by batch number and expiration date to keep stock history accurate.'
      }
    ],
    stat: { value: 'Step 01–02', label: 'Intake & batch logging' }
  },
  {
    id: 'cold-chain',
    aisle: 'AISLE 02',
    label: 'Fresh & Cold Chain',
    title: 'Expiration & Quarantine Control',
    subtitle: 'Step 03 — Automated daily checks flag expiring batches early so fresh goods never go to waste.',
    accent: '#34d399',
    glow: 'rgba(52, 211, 153, 0.26)',
    icon: Clock,
    cards: [
      {
        icon: Clock,
        title: 'Expiration Monitoring',
        text: 'Track batch lifespans and receive automated alerts before items reach their expiration date.'
      },
      {
        icon: ShieldAlert,
        title: 'Quarantine Workflow',
        text: 'Isolate damaged or near-expiry batches from sellable stock to protect customers and audit trails.'
      }
    ],
    stat: { value: '06:00 Daily', label: 'Automated expiration sync' }
  },
  {
    id: 'shelves',
    aisle: 'AISLE 03',
    label: 'Main Shelves & Scanner Bay',
    title: 'Barcode Scanning & Low-Stock Alerts',
    subtitle: 'Walk the aisles with mobile scanning, instant stock adjustments, and real-time restock warnings.',
    accent: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.26)',
    icon: QrCode,
    cards: [
      {
        icon: QrCode,
        title: 'Barcode & QR Scanning',
        text: 'Scan items directly from web or Android to speed up stock counts, lookups, and shelf audits.'
      },
      {
        icon: TrendingDown,
        title: 'Low Stock Alerts',
        text: 'Spot fast-moving items running low before empty shelves impact daily store operations.'
      }
    ],
    stat: { value: 'Instant', label: 'Mobile & web sync' }
  },
  {
    id: 'checkout',
    aisle: 'AISLE 04',
    label: 'Checkout & Command Center',
    title: 'Sales, Returns & Actionable Reports',
    subtitle: 'Step 04 — Close the loop with POS sales tracking, returns handling, and exportable operational reports.',
    accent: '#c084fc',
    glow: 'rgba(192, 132, 252, 0.28)',
    icon: ShoppingCart,
    cards: [
      {
        icon: ShoppingCart,
        title: 'Sales & Returns',
        text: 'Process customer transactions and returns while automatically updating your stock ledger.'
      },
      {
        icon: BarChart3,
        title: 'Reports & Insights',
        text: 'Review inventory performance, sales velocity, and audit logs to make smarter restocking decisions.'
      }
    ],
    stat: { value: 'Step 04', label: 'Sell, review & optimize' }
  }
];

export default function AboutPage() {
  const containerRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const maxScroll = el.offsetHeight - window.innerHeight;
      if (maxScroll <= 0) return;

      const raw = Math.min(Math.max(-rect.top / maxScroll, 0), 1);
      setProgress(raw);

      const idx = Math.min(
        ZONES.length - 1,
        Math.floor(raw * ZONES.length + 0.15)
      );
      setActiveIndex(idx);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const jumpToZone = (index) => {
    const el = containerRef.current;
    if (!el) return;
    const maxScroll = el.offsetHeight - window.innerHeight;
    const targetY =
      el.offsetTop + (index / (ZONES.length - 1)) * maxScroll;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  };

  const zone = ZONES[activeIndex];
  const ZoneIcon = zone.icon;

  const segmentSize = 1 / ZONES.length;
  const localProgress = Math.min(
    Math.max((progress - activeIndex * segmentSize) / segmentSize, 0),
    1
  );
  const corridorScale = 1 + localProgress * 0.08;
  const floorOffset = (progress * 420) % 60;

  return (
    <div className="walkthrough-root">
      <style>{`
        .walkthrough-root {
          color: #eaf2ff;
          background: #050b17;
          min-height: 100vh;
          font-family: inherit;
        }
        .walkthrough-track {
          position: relative;
          height: ${ZONES.length * 100}vh;
        }
        .walkthrough-stage {
          position: sticky;
          top: 0;
          height: 100vh;
          width: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 24px clamp(16px, 4vw, 48px);
          box-sizing: border-box;
        }
        .corridor-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          perspective: 900px;
          overflow: hidden;
        }
        .corridor-glow {
          position: absolute;
          top: 15%;
          left: 50%;
          width: 720px;
          height: 460px;
          transform: translateX(-50%);
          border-radius: 50%;
          filter: blur(120px);
          transition: background 0.6s ease;
        }
        .corridor-floor {
          position: absolute;
          left: -20%;
          right: -20%;
          bottom: -15%;
          height: 55%;
          transform-origin: center top;
          transform: rotateX(68deg);
          background-image:
            linear-gradient(to right, rgba(148, 163, 184, 0.14) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.14) 1px, transparent 1px);
          background-size: 64px 60px;
          mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.9) 45%, rgba(0,0,0,0.4) 100%);
        }
        .aisle-shelf-left,
        .aisle-shelf-right {
          position: absolute;
          top: 18%;
          bottom: 18%;
          width: 120px;
          border: 1px solid rgba(148, 163, 184, 0.12);
          background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
          border-radius: 16px;
          transition: transform 0.25s ease-out, border-color 0.5s ease;
        }
        .aisle-shelf-left {
          left: -40px;
          transform: perspective(600px) rotateY(38deg) scale(${corridorScale});
        }
        .aisle-shelf-right {
          right: -40px;
          transform: perspective(600px) rotateY(-38deg) scale(${corridorScale});
        }
        .stage-top {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .overhead-sign {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 18px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.28);
          backdrop-filter: blur(12px);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .stage-content {
          position: relative;
          z-index: 2;
          max-width: 1040px;
          width: 100%;
          margin: 0 auto;
          display: grid;
          gap: 24px;
          transition: opacity 0.35s ease, transform 0.35s ease;
        }
        .zone-header {
          text-align: center;
          max-width: 760px;
          margin: 0 auto;
        }
        .zone-title {
          margin: 10px 0 12px;
          font-size: clamp(28px, 5vw, 54px);
          line-height: 1.06;
          font-weight: 800;
          letter-spacing: -0.03em;
        }
        .zone-subtitle {
          margin: 0;
          color: rgba(226, 232, 240, 0.8);
          font-size: clamp(14px, 2vw, 18px);
          line-height: 1.6;
        }
        .zone-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .zone-card {
          padding: 22px;
          border-radius: 20px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: rgba(10, 18, 34, 0.72);
          backdrop-filter: blur(14px);
        }
        .zone-card-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          margin-bottom: 14px;
        }
        .zone-card h3 {
          margin: 0 0 8px;
          font-size: 18px;
          font-weight: 700;
        }
        .zone-card p {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
          color: rgba(203, 213, 225, 0.8);
        }
        .stage-bottom {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .aisle-nav {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .aisle-pill {
          padding: 7px 14px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(15, 23, 42, 0.7);
          color: rgba(226, 232, 240, 0.75);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .aisle-pill.active {
          color: #050b17;
          border-color: transparent;
        }
        .cta-group {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .btn-primary,
        .btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          border: none;
        }
        .btn-primary {
          background: linear-gradient(120deg, #38bdf8, #818cf8);
          color: #04101f;
        }
        .btn-ghost {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(148, 163, 184, 0.3);
          color: #e2e8f0;
        }
        .progress-rail {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(255, 255, 255, 0.08);
          z-index: 20;
        }
        .progress-fill {
          height: 100%;
          transition: width 0.1s linear, background 0.4s ease;
        }
        @media (max-width: 768px) {
          .aisle-shelf-left,
          .aisle-shelf-right {
            display: none;
          }
        }
      `}</style>

      <div className="progress-rail">
        <div
          className="progress-fill"
          style={{
            width: `${Math.max(4, progress * 100)}%`,
            background: zone.accent
          }}
        />
      </div>

      <div ref={containerRef} className="walkthrough-track">
        <div className="walkthrough-stage">
          <div className="corridor-bg">
            <div
              className="corridor-glow"
              style={{ background: zone.glow }}
            />
            <div
              className="corridor-floor"
              style={{ backgroundPosition: `0px ${floorOffset}px` }}
            />
            <div
              className="aisle-shelf-left"
              style={{ borderColor: `${zone.accent}44` }}
            />
            <div
              className="aisle-shelf-right"
              style={{ borderColor: `${zone.accent}44` }}
            />
          </div>

          <header className="stage-top">
            <div className="overhead-sign" style={{ color: zone.accent }}>
              <ZoneIcon size={16} />
              <span>{zone.aisle}</span>
              <span style={{ opacity: 0.5 }}>•</span>
              <span style={{ color: '#e2e8f0' }}>{zone.label}</span>
            </div>

            <div className="overhead-sign" style={{ color: '#cbd5e1' }}>
              <span style={{ color: zone.accent }}>{zone.stat.value}</span>
              <span>{zone.stat.label}</span>
            </div>
          </header>

          <main className="stage-content" key={zone.id}>
            <div className="zone-header">
              <h1 className="zone-title">{zone.title}</h1>
              <p className="zone-subtitle">{zone.subtitle}</p>
            </div>

            <div className="zone-cards">
              {zone.cards.map((card) => {
                const CardIcon = card.icon;
                return (
                  <article key={card.title} className="zone-card">
                    <div
                      className="zone-card-icon"
                      style={{
                        background: `${zone.accent}22`,
                        color: zone.accent,
                        border: `1px solid ${zone.accent}44`
                      }}
                    >
                      <CardIcon size={20} />
                    </div>
                    <h3>{card.title}</h3>
                    <p>{card.text}</p>
                  </article>
                );
              })}
            </div>
          </main>

          <footer className="stage-bottom">
            <nav className="aisle-nav" aria-label="Supermarket aisles">
              {ZONES.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => jumpToZone(idx)}
                  className={`aisle-pill ${idx === activeIndex ? 'active' : ''}`}
                  style={
                    idx === activeIndex
                      ? { background: item.accent }
                      : undefined
                  }
                >
                  {item.aisle}
                </button>
              ))}
            </nav>

            <div className="cta-group">
              {activeIndex < ZONES.length - 1 ? (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => jumpToZone(activeIndex + 1)}
                >
                  Next Aisle <ArrowDown size={15} />
                </button>
              ) : null}
              <a className="btn-primary" href="/dashboard">
                Explore Dashboard <ArrowRight size={15} />
              </a>
              <a className="btn-ghost" href="/inventory">
                View Inventory
              </a>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
