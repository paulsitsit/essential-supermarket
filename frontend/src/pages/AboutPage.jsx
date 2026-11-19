import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
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

// Curated high-resolution supermarket photography for each operational zone
const ZONES = [
  {
    id: 'entrance',
    aisle: 'AISLE 00',
    label: 'Store Entrance & Main Floor',
    title: 'Essential Supermarket System',
    subtitle:
      'A full-stack, batch-level supermarket inventory platform built to eliminate stock loss, automate expiration tracking, and keep retail operations in sync.',
    focus: 'Operational Visibility & Real-Time Tracking',
    accent: '#38bdf8',
    image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1920&q=80',
    icon: MapPin,
    points: [
      'Built specifically for retail and grocery supermarkets handling high-turnover perishable and non-perishable goods.',
      'Centralizes inventory, batch life cycles, POS sales, and return ledgers into a single source of truth.',
      'Operates seamlessly across desktop web, tablet workstations, and mobile Android devices via Capacitor.'
    ],
    cards: [
      {
        icon: Package,
        title: 'Centralized Stock Control',
        text: 'Monitor product quantities, SKUs, barcode mappings, and categories with automatic status classification.'
      },
      {
        icon: Layers,
        title: 'Multi-Device Synchronization',
        text: 'Live WebSocket sync pushes stock updates and urgent alerts across all connected cashier and manager screens.'
      }
    ],
    stat: { value: '100%', label: 'Real-time inventory visibility' }
  },
  {
    id: 'receiving',
    aisle: 'AISLE 01',
    label: 'Receiving Dock & Warehousing',
    title: 'Inbound Deliveries & Batch Intake',
    subtitle:
      'What it is for: Tracking every incoming shipment from suppliers down to individual batch numbers, manufacturing dates, and purchase unit costs.',
    focus: 'Batch Traceability & Supplier Accountability',
    accent: '#818cf8',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1920&q=80',
    icon: Package,
    points: [
      'Assigns granular batch numbers and manufacturing/expiry timestamps to every delivery received at the dock.',
      'Connects directly to supplier records for lead-time accountability and reorder cost tracking.',
      'Eliminates generic total counts in favor of identifiable batches for audit-proof traceability.'
    ],
    cards: [
      {
        icon: RefreshCw,
        title: 'Batch-Level Ingestion',
        text: 'Ingest supplier deliveries with discrete batch identifiers, quantities received, and cost calculations.'
      },
      {
        icon: CheckCircle2,
        title: 'Pending Stock Receipts',
        text: 'Review and verify shipment contents before batches become active and sellable in store inventory.'
      }
    ],
    stat: { value: 'Batch-ID', label: 'Traceable intake per delivery' }
  },
  {
    id: 'cold-chain',
    aisle: 'AISLE 02',
    label: 'Fresh Produce & Cold Storage',
    title: 'Automated Expiration & Quarantine',
    subtitle:
      'What it focuses on: Stopping expired products before they reach shoppers through automated 06:00 AM scans and immediate quarantine segregation.',
    focus: 'Waste Reduction & Food Safety Compliance',
    accent: '#34d399',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1920&q=80',
    icon: Clock,
    points: [
      'Automated cron job scans all active product batches daily at 06:00 Asia/Manila, categorizing items by expiry urgency.',
      'Quarantine workflow isolates damaged or near-expiry batches from general sellable inventory.',
      'Generates push notifications and system audit logs to guide timely markdowns or returns to vendors.'
    ],
    cards: [
      {
        icon: Clock,
        title: 'Daily Expiration Sync',
        text: 'Automated scheduler categorizes expiring items as Good, Approaching, or Expired to prevent expired shelf presence.'
      },
      {
        icon: ShieldAlert,
        title: 'Isolated Quarantine Area',
        text: 'Divert spoiled or recalled batches out of active POS lookup into a controlled quarantine holding ledger.'
      }
    ],
    stat: { value: '06:00 AM', label: 'Daily scheduled sync (PHT)' }
  },
  {
    id: 'shelves',
    aisle: 'AISLE 03',
    label: 'Center Grocery Aisles & Scanning',
    title: 'Floor Audits & Low-Stock Alerts',
    subtitle:
      'What it is for: Keeping supermarket shelves stocked with barcode-driven audits, real-time threshold warnings, and mobile camera scanning.',
    focus: 'Shelf Replenishment & Barcode Operations',
    accent: '#f59e0b',
    image: 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=1920&q=80',
    icon: QrCode,
    points: [
      'Staff can scan barcodes directly using the mobile camera to perform rapid cycle counts and product lookups.',
      'Dynamic threshold calculations flag low-stock items before shelves run empty and disrupt sales.',
      'Stock ledger movements log whether items were added, adjusted, damaged, or transferred.'
    ],
    cards: [
      {
        icon: QrCode,
        title: 'Mobile Barcode Scanner',
        text: 'High-speed camera scanning powered by html5-qrcode for instant SKU lookups and on-floor stock verification.'
      },
      {
        icon: TrendingDown,
        title: 'Low-Stock Early Warnings',
        text: 'Configurable minimum stock thresholds immediately generate restocking alerts on management dashboards.'
      }
    ],
    stat: { value: 'Instant', label: 'On-floor mobile scanning' }
  },
  {
    id: 'checkout',
    aisle: 'AISLE 04',
    label: 'POS Checkout & Cashier Lines',
    title: 'Sales Ledger, Returns & Reporting',
    subtitle:
      'What it focuses on: Closing the retail loop with synchronized checkout sales, customer returns, audit history, and multi-format exports.',
    focus: 'Financial Integrity & Business Analytics',
    accent: '#c084fc',
    image: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=1920&q=80',
    icon: ShoppingCart,
    points: [
      'Cashier sales instantly deduct stock using FIFO batch depletion to ensure proper turnover.',
      'Protected export routes generate Excel, CSV, and PDF operational audits for managers and accounting teams.',
      'Role-based access security safeguards administrative functions behind JWT authentication and role gates.'
    ],
    cards: [
      {
        icon: ShoppingCart,
        title: 'POS Sales & Returns Flow',
        text: 'Process transactions with automated stock ledger updates, return tracking, and receipt logging.'
      },
      {
        icon: BarChart3,
        title: 'Protected Audits & Exports',
        text: 'Export comprehensive inventory and sales reports in Excel, PDF, or CSV with role-restricted permissions.'
      }
    ],
    stat: { value: 'End-to-End', label: 'Intake to checkout loop' }
  }
];

export default function AboutPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef(null);
  const wheelLock = useRef(0);

  const goTo = (index) => {
    const clamped = Math.max(0, Math.min(ZONES.length - 1, index));
    if (clamped === activeIndex) return;
    setActiveIndex(clamped);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        goTo(activeIndex + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        goTo(activeIndex - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex]);

  const handleWheel = (e) => {
    const now = Date.now();
    if (now - wheelLock.current < 450) return;
    if (Math.abs(e.deltaY) > 28) {
      wheelLock.current = now;
      if (e.deltaY > 0) goTo(activeIndex + 1);
      else goTo(activeIndex - 1);
    }
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    if (Math.abs(deltaX) > 42) {
      if (deltaX > 0) goTo(activeIndex + 1);
      else goTo(activeIndex - 1);
    }
  };

  const zone = ZONES[activeIndex];
  const ZoneIcon = zone.icon;
  const progressPct = ((activeIndex + 1) / ZONES.length) * 100;

  return (
    <div
      className="about-walkthrough-root"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`
        .about-walkthrough-root {
          position: relative;
          color: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          min-height: calc(100dvh - 90px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 20px clamp(16px, 3.5vw, 40px);
          box-sizing: border-box;
          font-family: inherit;
          background: #020611;
        }

        /* Full photographic supermarket backgrounds cross-fading */
        .photo-bg-layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 1.2s cubic-bezier(0.2, 0.8, 0.2, 1);
          transform: scale(1.05);
          will-change: opacity, transform;
        }
        .photo-bg-layer.active {
          opacity: 1;
          transform: scale(1);
          z-index: 1;
        }
        .photo-bg-layer.inactive {
          opacity: 0;
          z-index: 0;
        }

        /* Cinematic dark gradient overlay so text remains readable */
        .cinematic-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(2, 6, 17, 0.72) 0%,
            rgba(2, 6, 17, 0.55) 40%,
            rgba(2, 6, 17, 0.88) 100%
          );
          z-index: 2;
          pointer-events: none;
        }

        /* Progress indicator */
        .progress-rail {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: rgba(255, 255, 255, 0.15);
          z-index: 10;
        }
        .progress-fill {
          height: 100%;
          transition: width 0.4s ease, background 0.4s ease;
        }

        /* Header HUD */
        .stage-top {
          position: relative;
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .overhead-sign {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(10, 18, 34, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(14px);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }

        /* Center Content */
        .stage-content {
          position: relative;
          z-index: 3;
          max-width: 960px;
          width: 100%;
          margin: 18px auto;
          display: grid;
          gap: 16px;
          animation: fadeContent 0.5s ease;
        }
        @keyframes fadeContent {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .zone-header {
          text-align: center;
          max-width: 780px;
          margin: 0 auto;
        }
        .focus-pill {
          display: inline-block;
          padding: 5px 14px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 10px;
          backdrop-filter: blur(10px);
          border: 1px solid;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
        }
        .zone-title {
          margin: 0 0 8px;
          font-size: clamp(26px, 4.4vw, 46px);
          line-height: 1.1;
          font-weight: 850;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 14px rgba(0, 0, 0, 0.8);
        }
        .zone-subtitle {
          margin: 0;
          color: rgba(241, 245, 249, 0.95);
          font-size: clamp(13px, 1.9vw, 15px);
          line-height: 1.6;
          text-shadow: 0 1px 8px rgba(0, 0, 0, 0.7);
        }

        .points-box {
          background: rgba(10, 18, 34, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 16px;
          padding: 14px 20px;
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
        }
        .points-box ul {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 6px;
        }
        .points-box li {
          font-size: 13px;
          line-height: 1.5;
          color: #f1f5f9;
        }

        .zone-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 12px;
        }
        .zone-card {
          padding: 16px 18px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(10, 18, 34, 0.76);
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        }
        .zone-card-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          margin-bottom: 10px;
        }
        .zone-card h3 {
          margin: 0 0 6px;
          font-size: 15px;
          font-weight: 700;
        }
        .zone-card p {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
          color: rgba(226, 232, 240, 0.88);
        }

        /* Footer Controls */
        .stage-bottom {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.15);
        }
        .nav-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .aisle-nav {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .aisle-pill {
          padding: 7px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(10, 18, 34, 0.85);
          color: rgba(241, 245, 249, 0.9);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(10px);
        }
        .aisle-pill.active {
          color: #020611;
          border-color: transparent;
        }
        .cta-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .btn-primary,
        .btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          border: none;
          backdrop-filter: blur(10px);
        }
        .btn-primary {
          background: linear-gradient(120deg, #38bdf8, #818cf8);
          color: #04101f;
          box-shadow: 0 4px 16px rgba(56, 189, 248, 0.35);
        }
        .btn-ghost {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #f1f5f9;
        }
        .btn-ghost:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .swipe-hint {
          text-align: center;
          font-size: 11px;
          color: rgba(226, 232, 240, 0.85);
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
        }
      `}</style>

      {/* Progress line */}
      <div className="progress-rail">
        <div
          className="progress-fill"
          style={{ width: `${progressPct}%`, background: zone.accent }}
        />
      </div>

      {/* Real Supermarket Background Photography Layers */}
      {ZONES.map((z, idx) => (
        <div
          key={z.id}
          className={`photo-bg-layer ${idx === activeIndex ? 'active' : 'inactive'}`}
          style={{ backgroundImage: `url(${z.image})` }}
        />
      ))}

      {/* Cinematic dark readability overlay */}
      <div className="cinematic-overlay" />

      {/* Header HUD */}
      <header className="stage-top">
        <div className="overhead-sign" style={{ color: zone.accent }}>
          <ZoneIcon size={15} />
          <span>{zone.aisle}</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span style={{ color: '#ffffff' }}>{zone.label}</span>
        </div>

        <div className="overhead-sign" style={{ color: '#e2e8f0' }}>
          <span style={{ color: zone.accent }}>{zone.stat.value}</span>
          <span>{zone.stat.label}</span>
        </div>
      </header>

      {/* Center System Overview & Focus Content */}
      <main className="stage-content" key={zone.id}>
        <div className="zone-header">
          <span
            className="focus-pill"
            style={{
              color: zone.accent,
              borderColor: `${zone.accent}88`,
              background: 'rgba(10, 18, 34, 0.85)'
            }}
          >
            Core Focus: {zone.focus}
          </span>
          <h1 className="zone-title">{zone.title}</h1>
          <p className="zone-subtitle">{zone.subtitle}</p>
        </div>

        {/* System Focus Highlights */}
        <div className="points-box">
          <ul>
            {zone.points.map((pt, i) => (
              <li key={i}>{pt}</li>
            ))}
          </ul>
        </div>

        {/* Action cards */}
        <div className="zone-cards">
          {zone.cards.map((card) => {
            const CardIcon = card.icon;
            return (
              <article key={card.title} className="zone-card">
                <div
                  className="zone-card-icon"
                  style={{
                    background: `${zone.accent}33`,
                    color: zone.accent,
                    border: `1px solid ${zone.accent}66`
                  }}
                >
                  <CardIcon size={18} />
                </div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            );
          })}
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="stage-bottom">
        <div className="nav-row">
          <nav className="aisle-nav" aria-label="Supermarket aisles">
            {ZONES.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(idx)}
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
            <button
              type="button"
              className="btn-ghost"
              disabled={activeIndex === 0}
              onClick={() => goTo(activeIndex - 1)}
            >
              <ArrowLeft size={14} /> Prev
            </button>
            {activeIndex < ZONES.length - 1 ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => goTo(activeIndex + 1)}
              >
                Next Aisle <ArrowRight size={14} />
              </button>
            ) : (
              <a className="btn-primary" href="/dashboard">
                Explore Dashboard <ArrowRight size={14} />
              </a>
            )}
          </div>
        </div>
        <div className="swipe-hint">
          Walk the aisles: use arrow keys, scroll, swipe left/right, or tap an aisle ({activeIndex + 1}/{ZONES.length})
        </div>
      </footer>
    </div>
  );
}
