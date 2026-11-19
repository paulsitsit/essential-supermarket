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
  const scrollContainerRef = useRef(null);
  const sectionRefs = useRef([]);

  // Native scroll handler: inspects which section is centered in the scroll viewport
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const viewportCenter = scrollTop + containerHeight / 2;

    let closestIdx = 0;
    let minDistance = Infinity;

    sectionRefs.current.forEach((el, idx) => {
      if (!el) return;
      const elTop = el.offsetTop;
      const elCenter = elTop + el.offsetHeight / 2;
      const dist = Math.abs(viewportCenter - elCenter);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    if (closestIdx !== activeIndex) {
      setActiveIndex(closestIdx);
    }
  };

  const scrollToZone = (index) => {
    const el = sectionRefs.current[index];
    if (!el || !scrollContainerRef.current) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        scrollToZone(Math.min(ZONES.length - 1, activeIndex + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        scrollToZone(Math.max(0, activeIndex - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex]);

  const zone = ZONES[activeIndex];
  const ZoneIcon = zone.icon;
  const progressPct = ((activeIndex + 1) / ZONES.length) * 100;

  return (
    <div className="about-walkthrough-root">
      <style>{`
        .about-walkthrough-root {
          position: relative;
          color: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          height: calc(100dvh - 90px);
          font-family: inherit;
          background: #020611;
        }

        /* Fixed background photography cross-fades behind scroll */
        .photo-bg-layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          transition: opacity 0.7s ease, transform 0.9s ease;
          transform: scale(1.05);
          will-change: opacity, transform;
          pointer-events: none;
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

        /* Readability overlay */
        .cinematic-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(2, 6, 17, 0.75) 0%,
            rgba(2, 6, 17, 0.55) 40%,
            rgba(2, 6, 17, 0.9) 100%
          );
          z-index: 2;
          pointer-events: none;
        }

        /* Top Progress Line */
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
          transition: width 0.35s ease, background 0.35s ease;
        }

        /* Top HUD */
        .stage-top {
          position: absolute;
          top: 14px;
          left: 16px;
          right: 16px;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          pointer-events: none;
        }
        .overhead-sign {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px;
          border-radius: 999px;
          background: rgba(10, 18, 34, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(14px);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
          pointer-events: auto;
        }

        /* Native Scrollable Viewport with Touch Momentum & Snap */
        .scroll-viewport {
          position: relative;
          z-index: 3;
          height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          scroll-snap-type: y mandatory;
          -webkit-overflow-scrolling: touch;
          padding: 70px 16px 120px;
          box-sizing: border-box;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.2) transparent;
        }

        .aisle-section {
          min-height: calc(100dvh - 200px);
          scroll-snap-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 0;
          box-sizing: border-box;
        }

        .section-card-wrapper {
          max-width: 920px;
          width: 100%;
          display: grid;
          gap: 14px;
        }

        .zone-header {
          text-align: center;
          max-width: 760px;
          margin: 0 auto;
        }
        .focus-pill {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 8px;
          backdrop-filter: blur(10px);
          border: 1px solid;
          background: rgba(10, 18, 34, 0.85);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }
        .zone-title {
          margin: 0 0 6px;
          font-size: clamp(24px, 4.2vw, 42px);
          line-height: 1.1;
          font-weight: 850;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 14px rgba(0, 0, 0, 0.8);
        }
        .zone-subtitle {
          margin: 0;
          color: rgba(241, 245, 249, 0.95);
          font-size: clamp(12px, 1.8vw, 15px);
          line-height: 1.55;
          text-shadow: 0 1px 8px rgba(0, 0, 0, 0.7);
        }

        .points-box {
          background: rgba(10, 18, 34, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 16px;
          padding: 12px 18px;
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
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(10, 18, 34, 0.8);
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        }
        .zone-card-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          margin-bottom: 8px;
        }
        .zone-card h3 {
          margin: 0 0 4px;
          font-size: 14px;
          font-weight: 700;
        }
        .zone-card p {
          margin: 0;
          font-size: 12px;
          line-height: 1.5;
          color: rgba(226, 232, 240, 0.88);
        }

        /* Fixed Bottom HUD */
        .stage-bottom {
          position: absolute;
          bottom: 12px;
          left: 16px;
          right: 16px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
        }
        .nav-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }
        .aisle-nav {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          pointer-events: auto;
        }
        .aisle-pill {
          padding: 6px 11px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(10, 18, 34, 0.9);
          color: rgba(241, 245, 249, 0.9);
          font-size: 10px;
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
          gap: 6px;
          flex-wrap: wrap;
          pointer-events: auto;
        }
        .btn-primary,
        .btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 7px 14px;
          border-radius: 999px;
          font-size: 12px;
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
          background: rgba(10, 18, 34, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #f1f5f9;
        }
        .btn-ghost:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .swipe-hint {
          text-align: center;
          font-size: 10px;
          color: rgba(226, 232, 240, 0.85);
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
        }
      `}</style>

      {/* Progress indicator */}
      <div className="progress-rail">
        <div
          className="progress-fill"
          style={{ width: `${progressPct}%`, background: zone.accent }}
        />
      </div>

      {/* Fixed Photographic Background Layers that cross-fade as you scroll */}
      {ZONES.map((z, idx) => (
        <div
          key={z.id}
          className={`photo-bg-layer ${idx === activeIndex ? 'active' : 'inactive'}`}
          style={{ backgroundImage: `url(${z.image})` }}
        />
      ))}

      {/* Cinematic dark overlay */}
      <div className="cinematic-overlay" />

      {/* Fixed Top HUD */}
      <header className="stage-top">
        <div className="overhead-sign" style={{ color: zone.accent }}>
          <ZoneIcon size={14} />
          <span>{zone.aisle}</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span style={{ color: '#ffffff' }}>{zone.label}</span>
        </div>

        <div className="overhead-sign" style={{ color: '#e2e8f0' }}>
          <span style={{ color: zone.accent }}>{zone.stat.value}</span>
          <span>{zone.stat.label}</span>
        </div>
      </header>

      {/* Native Scrollable Viewport with CSS Scroll Snap */}
      <div
        ref={scrollContainerRef}
        className="scroll-viewport"
        onScroll={handleScroll}
      >
        {ZONES.map((zItem, idx) => (
          <section
            key={zItem.id}
            ref={(el) => (sectionRefs.current[idx] = el)}
            className="aisle-section"
          >
            <div className="section-card-wrapper">
              <div className="zone-header">
                <span
                  className="focus-pill"
                  style={{
                    color: zItem.accent,
                    borderColor: `${zItem.accent}88`
                  }}
                >
                  Core Focus: {zItem.focus}
                </span>
                <h1 className="zone-title">{zItem.title}</h1>
                <p className="zone-subtitle">{zItem.subtitle}</p>
              </div>

              <div className="points-box">
                <ul>
                  {zItem.points.map((pt, pIdx) => (
                    <li key={pIdx}>{pt}</li>
                  ))}
                </ul>
              </div>

              <div className="zone-cards">
                {zItem.cards.map((card) => {
                  const CardIcon = card.icon;
                  return (
                    <article key={card.title} className="zone-card">
                      <div
                        className="zone-card-icon"
                        style={{
                          background: `${zItem.accent}33`,
                          color: zItem.accent,
                          border: `1px solid ${zItem.accent}66`
                        }}
                      >
                        <CardIcon size={17} />
                      </div>
                      <h3>{card.title}</h3>
                      <p>{card.text}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Fixed Bottom HUD */}
      <footer className="stage-bottom">
        <div className="nav-row">
          <nav className="aisle-nav" aria-label="Supermarket aisles">
            {ZONES.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToZone(idx)}
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
              onClick={() => scrollToZone(activeIndex - 1)}
            >
              <ArrowLeft size={13} /> Prev
            </button>
            {activeIndex < ZONES.length - 1 ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => scrollToZone(activeIndex + 1)}
              >
                Next <ArrowRight size={13} />
              </button>
            ) : (
              <a className="btn-primary" href="/dashboard">
                Dashboard <ArrowRight size={13} />
              </a>
            )}
          </div>
        </div>
        <div className="swipe-hint">
          Scroll up/down or swipe naturally on mobile ({activeIndex + 1}/{ZONES.length})
        </div>
      </footer>
    </div>
  );
}
