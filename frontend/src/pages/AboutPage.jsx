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
    label: 'Store Entrance & Overview',
    title: 'Essential Supermarket System',
    subtitle:
      'A full-stack, batch-level supermarket inventory platform built to eliminate stock loss, automate expiration tracking, and keep retail operations in sync.',
    focus: 'Operational Visibility & Real-Time Tracking',
    accent: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.35)',
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
    glow: 'rgba(129, 140, 248, 0.35)',
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
    label: 'Fresh & Perishables Zone',
    title: 'Automated Expiration & Quarantine',
    subtitle:
      'What it focuses on: Stopping expired products before they reach shoppers through automated 06:00 AM scans and immediate quarantine segregation.',
    focus: 'Waste Reduction & Food Safety Compliance',
    accent: '#34d399',
    glow: 'rgba(52, 211, 153, 0.35)',
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
    label: 'Center Aisles & Scanning Bay',
    title: 'Floor Audits & Low-Stock Alerts',
    subtitle:
      'What it is for: Keeping supermarket shelves stocked with barcode-driven audits, real-time threshold warnings, and mobile camera scanning.',
    focus: 'Shelf Replenishment & Barcode Operations',
    accent: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.35)',
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
    label: 'POS Checkout & Executive Control',
    title: 'Sales Ledger, Returns & Reporting',
    subtitle:
      'What it focuses on: Closing the retail loop with synchronized checkout sales, customer returns, audit history, and multi-format exports.',
    focus: 'Financial Integrity & Business Analytics',
    accent: '#c084fc',
    glow: 'rgba(192, 132, 252, 0.35)',
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
  const [direction, setDirection] = useState('next');
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const touchStartX = useRef(null);
  const wheelLock = useRef(0);

  const goTo = (index) => {
    const clamped = Math.max(0, Math.min(ZONES.length - 1, index));
    if (clamped === activeIndex) return;
    setDirection(clamped > activeIndex ? 'next' : 'prev');
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
    if (now - wheelLock.current < 400) return;
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

  // 3D Supermarket Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement.clientHeight || 600);

    const onResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', onResize);

    let currentZ = activeIndex * 300;
    let time = 0;

    const render = () => {
      time += 0.016;
      // Smooth camera interpolation toward active zone
      const target = activeIndex * 300;
      currentZ += (target - currentZ) * 0.08;

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height * 0.46;
      const fov = 340;

      // Deep supermarket background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#040914');
      bgGrad.addColorStop(0.45, '#071328');
      bgGrad.addColorStop(1, '#02050c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Perspective project 3D point (x, y, z) -> 2D (px, py)
      const project = (x, y, z) => {
        const relZ = z - currentZ;
        if (relZ <= 5) return null;
        const scale = fov / relZ;
        return {
          x: cx + x * scale,
          y: cy + y * scale,
          scale,
          relZ
        };
      };

      // 1. Ceiling Warm Supermarket Light Strips
      ctx.lineWidth = 2;
      for (let z = -200; z < 2000; z += 180) {
        const p1 = project(-90, -130, z);
        const p2 = project(90, -130, z);
        const p1b = project(-90, -130, z + 90);
        const p2b = project(90, -130, z + 90);

        if (p1 && p1b && p1.relZ > 20) {
          const alpha = Math.max(0, Math.min(0.7, 1 - p1.relZ / 1400));
          ctx.strokeStyle = `rgba(254, 243, 199, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p1b.x, p1b.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(p2.x, p2.y);
          ctx.lineTo(p2b.x, p2b.y);
          ctx.stroke();
        }
      }

      // 2. Reflective Supermarket Floor Grid & Tiles
      const floorY = 120;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
      ctx.lineWidth = 1;

      // Longitudinal floor lines
      for (let x = -260; x <= 260; x += 65) {
        const pStart = project(x, floorY, currentZ + 15);
        const pEnd = project(x, floorY, currentZ + 1200);
        if (pStart && pEnd) {
          ctx.beginPath();
          ctx.moveTo(pStart.x, pStart.y);
          ctx.lineTo(pEnd.x, pEnd.y);
          ctx.stroke();
        }
      }

      // Transverse floor lines (moving smoothly)
      const startTileZ = Math.floor(currentZ / 60) * 60;
      for (let z = startTileZ; z < currentZ + 1200; z += 60) {
        const pL = project(-260, floorY, z);
        const pR = project(260, floorY, z);
        if (pL && pR) {
          const alpha = Math.max(0, 0.22 * (1 - pL.relZ / 1200));
          ctx.strokeStyle = `rgba(186, 230, 253, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(pL.x, pL.y);
          ctx.lineTo(pR.x, pR.y);
          ctx.stroke();
        }
      }

      // 3. Supermarket Shelves on Left and Right with Product Boxes
      const shelfColors = [
        '#38bdf8',
        '#818cf8',
        '#34d399',
        '#f59e0b',
        '#c084fc',
        '#f43f5e'
      ];

      for (let z = startTileZ; z < currentZ + 1100; z += 80) {
        const sides = [-170, 170];
        sides.forEach((sideX, sideIdx) => {
          const pBase = project(sideX, floorY, z);
          const pTop = project(sideX, -80, z);

          if (pBase && pTop && pBase.relZ > 20) {
            const alpha = Math.max(0, 0.85 * (1 - pBase.relZ / 1200));

            // Shelf upright rack
            ctx.fillStyle = `rgba(30, 41, 59, ${alpha})`;
            ctx.fillRect(pTop.x - 3 * pTop.scale, pTop.y, 6 * pTop.scale, pBase.y - pTop.y);

            // Horizontal shelf tiers with colored product boxes
            for (let shelfY = -40; shelfY <= 90; shelfY += 35) {
              const pTier = project(sideX, shelfY, z);
              if (pTier) {
                ctx.fillStyle = `rgba(71, 85, 105, ${alpha * 0.8})`;
                ctx.fillRect(
                  pTier.x - 22 * pTier.scale,
                  pTier.y,
                  44 * pTier.scale,
                  3 * pTier.scale
                );

                // Product items on shelf
                const colorIdx = Math.abs(Math.floor((z + shelfY + sideIdx * 37) / 25)) % shelfColors.length;
                ctx.fillStyle = shelfColors[colorIdx];
                ctx.globalAlpha = alpha * 0.9;
                ctx.fillRect(
                  pTier.x - 16 * pTier.scale,
                  pTier.y - 12 * pTier.scale,
                  10 * pTier.scale,
                  11 * pTier.scale
                );
                ctx.fillRect(
                  pTier.x - 2 * pTier.scale,
                  pTier.y - 14 * pTier.scale,
                  12 * pTier.scale,
                  13 * pTier.scale
                );
                ctx.globalAlpha = 1;
              }
            }
          }
        });
      }

      // 4. Overhead Glowing Aisle Signs
      ZONES.forEach((zItem, i) => {
        const signZ = i * 300 + 40;
        const pSign = project(0, -95, signZ);
        if (pSign && pSign.relZ > 10 && pSign.relZ < 1000) {
          const isCurrent = i === activeIndex;

          ctx.save();
          ctx.translate(pSign.x, pSign.y);

          const signW = 140 * pSign.scale;
          const signH = 36 * pSign.scale;

          // Sign backdrop
          ctx.fillStyle = isCurrent
            ? 'rgba(15, 23, 42, 0.95)'
            : 'rgba(15, 23, 42, 0.7)';
          ctx.strokeStyle = zItem.accent;
          ctx.lineWidth = isCurrent ? 2.5 : 1;
          ctx.beginPath();
          ctx.roundRect(-signW / 2, -signH / 2, signW, signH, 6 * pSign.scale);
          ctx.fill();
          ctx.stroke();

          // Sign text
          if (pSign.scale > 0.4) {
            ctx.fillStyle = zItem.accent;
            ctx.font = `bold ${Math.round(11 * pSign.scale)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(zItem.aisle, 0, 0);
          }
          ctx.restore();
        }
      });

      // 5. Subtle end-of-aisle light glow
      const horizonGlow = ctx.createRadialGradient(cx, cy - 20, 10, cx, cy - 20, width * 0.45);
      horizonGlow.addColorStop(0, `${ZONES[activeIndex].accent}33`);
      horizonGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = horizonGlow;
      ctx.fillRect(0, 0, width, height);

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', onResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeIndex]);

  const zone = ZONES[activeIndex];
  const ZoneIcon = zone.icon;
  const progressPct = ((activeIndex + 1) / ZONES.length) * 100;

  return (
    <div
      className="walkthrough-container"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`
        .walkthrough-container {
          position: relative;
          color: #eaf2ff;
          background: #020713;
          border-radius: 20px;
          overflow: hidden;
          min-height: calc(100dvh - 100px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 18px clamp(14px, 3vw, 36px);
          box-sizing: border-box;
          font-family: inherit;
        }
        .canvas-canvas-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: none;
        }
        .progress-rail {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(255, 255, 255, 0.08);
          z-index: 5;
        }
        .progress-fill {
          height: 100%;
          transition: width 0.35s ease, background 0.35s ease;
        }
        .stage-top {
          position: relative;
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .overhead-sign {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px;
          border-radius: 999px;
          background: rgba(10, 17, 32, 0.85);
          border: 1px solid rgba(148, 163, 184, 0.25);
          backdrop-filter: blur(12px);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .stage-content {
          position: relative;
          z-index: 3;
          max-width: 980px;
          width: 100%;
          margin: 16px auto;
          display: grid;
          gap: 16px;
          animation: zoneSlide 0.35s ease;
        }
        @keyframes zoneSlide {
          from {
            opacity: 0;
            transform: translateY(${direction === 'next' ? '14px' : '-14px'}) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
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
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 8px;
          border: 1px solid;
        }
        .zone-title {
          margin: 0 0 8px;
          font-size: clamp(24px, 4.2vw, 44px);
          line-height: 1.1;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .zone-subtitle {
          margin: 0;
          color: rgba(226, 232, 240, 0.88);
          font-size: clamp(13px, 1.8vw, 15px);
          line-height: 1.55;
        }
        .points-box {
          background: rgba(10, 18, 34, 0.85);
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 16px;
          padding: 14px 18px;
          backdrop-filter: blur(12px);
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
          color: rgba(226, 232, 240, 0.9);
        }
        .zone-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 12px;
        }
        .zone-card {
          padding: 16px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(10, 18, 34, 0.82);
          backdrop-filter: blur(12px);
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
          color: rgba(203, 213, 225, 0.85);
        }
        .stage-bottom {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(148, 163, 184, 0.16);
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
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(15, 23, 42, 0.85);
          color: rgba(226, 232, 240, 0.8);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .aisle-pill.active {
          color: #040914;
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
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 13px;
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
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(148, 163, 184, 0.3);
          color: #e2e8f0;
        }
        .btn-ghost:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .swipe-hint {
          text-align: center;
          font-size: 11px;
          color: rgba(148, 163, 184, 0.75);
        }
      `}</style>

      {/* Progress line */}
      <div className="progress-rail">
        <div
          className="progress-fill"
          style={{ width: `${progressPct}%`, background: zone.accent }}
        />
      </div>

      {/* Real-time 3D Supermarket Canvas */}
      <canvas ref={canvasRef} className="canvas-canvas-bg" />

      {/* Top HUD */}
      <header className="stage-top">
        <div className="overhead-sign" style={{ color: zone.accent }}>
          <ZoneIcon size={15} />
          <span>{zone.aisle}</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span style={{ color: '#e2e8f0' }}>{zone.label}</span>
        </div>

        <div className="overhead-sign" style={{ color: '#cbd5e1' }}>
          <span style={{ color: zone.accent }}>{zone.stat.value}</span>
          <span>{zone.stat.label}</span>
        </div>
      </header>

      {/* Content for What the System is For & Focus */}
      <main className="stage-content" key={zone.id}>
        <div className="zone-header">
          <span
            className="focus-pill"
            style={{
              color: zone.accent,
              borderColor: `${zone.accent}66`,
              background: `${zone.accent}15`
            }}
          >
            Core Focus: {zone.focus}
          </span>
          <h1 className="zone-title">{zone.title}</h1>
          <p className="zone-subtitle">{zone.subtitle}</p>
        </div>

        {/* System Focus Key Points */}
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
                    background: `${zone.accent}22`,
                    color: zone.accent,
                    border: `1px solid ${zone.accent}44`
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

      {/* Navigation & Controls */}
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
          Walk the 3D aisles: use arrows, scroll, swipe, or click an aisle ({activeIndex + 1}/{ZONES.length})
        </div>
      </footer>
    </div>
  );
}
