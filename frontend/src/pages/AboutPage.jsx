import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  QrCode,
  ShoppingCart,
  Store
} from 'lucide-react';

const SCENES = [
  {
    id: 'exterior',
    tag: 'OUTSIDE STORE',
    title: 'Essential Supermarket',
    headline: 'Next-Generation Retail & Inventory Intelligence',
    description:
      'A complete operating platform engineered for modern supermarket chains. Unifying supply chain receiving, cold chain safety, mobile floor operations, and checkout sales into a single synchronized system.',
    focus: 'Enterprise Store Ecosystem',
    accent: '#38bdf8',
    image:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=2000&q=80',
    icon: Store,
    points: [
      'Tailored for supermarkets handling high-turnover grocery and perishables.',
      'Synchronized across desktop web workstations and Android mobile devices.',
      'Audit-proof ledger tracking every item from supplier dock to shopper receipt.'
    ]
  },
  {
    id: 'entrance',
    tag: 'STORE ENTRANCE',
    title: 'The Operational Portal',
    headline: 'Real-Time Inventory & System Centralization',
    description:
      'Step inside the store. Live WebSocket feeds distribute active stock movements, price changes, and system alerts instantly across all manager and cashier terminals.',
    focus: 'Real-Time Store Synchrony',
    accent: '#818cf8',
    image:
      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=2000&q=80',
    icon: MapPin,
    points: [
      'Instant catalog lookup for over thousands of products and active SKUs.',
      'Role-governed security shielding administrative controls behind JWT validation.',
      'Multi-branch ready architecture supporting multi-location inventory.'
    ]
  },
  {
    id: 'receiving',
    tag: 'RECEIVING DOCK',
    title: 'Back-of-House Intake',
    headline: 'Granular Batch-Level Traceability',
    description:
      'Every pallet delivered at the dock is tagged with discrete batch identifiers, manufacturing timestamps, and purchase costs before stock is ever placed on shelves.',
    focus: 'Intake & Supplier Audits',
    accent: '#34d399',
    image:
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2000&q=80',
    icon: Package,
    points: [
      'Discrete batch IDs linked to supplier delivery logs for total accountability.',
      'Pending stock receipts verified before entering active sellable counts.',
      'Unit cost margin monitoring and supplier performance analytics.'
    ]
  },
  {
    id: 'fresh',
    tag: 'FRESH & PERISHABLES',
    title: 'Cold Storage & Fresh Produce',
    headline: 'Automated 06:00 AM Expiration Control',
    description:
      'Protect shoppers and eliminate spoilage. Automated scheduled background engines analyze expiration deadlines every morning, alerting managers and quarantining items.',
    focus: 'Food Safety & Waste Elimination',
    accent: '#10b981',
    image:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=2000&q=80',
    icon: Clock,
    points: [
      'Automated cron job runs daily at 06:00 Asia/Manila across all batches.',
      'Isolated quarantine holding ledger removes recalled stock from active POS.',
      'Markdown workflows guide early discounting before products expire.'
    ]
  },
  {
    id: 'aisles',
    tag: 'CENTER AISLES',
    title: 'On-Floor Operations',
    headline: 'High-Speed Barcode & Restock Audits',
    description:
      'Staff walk the aisles equipped with mobile barcode scanners. Built-in threshold formulas alert teams the instant fast-moving goods drop below reorder levels.',
    focus: 'Shelf Replenishment & Mobile Scanning',
    accent: '#f59e0b',
    image:
      'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=2000&q=80',
    icon: QrCode,
    points: [
      'Fast camera barcode scanning powered by html5-qrcode on phone and tablet.',
      'Live stock movement logs classify transfers, damages, and cycle counts.',
      'Dynamic threshold calculations prevent empty shelves.'
    ]
  },
  {
    id: 'checkout',
    tag: 'CHECKOUT & REPORTING',
    title: 'Front-End Registers & Analytics',
    headline: 'FIFO Sales Depletion & Protected Reports',
    description:
      'Customer checkout sales automatically deduct stock through First-In-First-Out (FIFO) batch selection, while executive dashboards generate exportable compliance audits.',
    focus: 'Financial Integrity & Business Analytics',
    accent: '#c084fc',
    image:
      'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=2000&q=80',
    icon: ShoppingCart,
    points: [
      'Instant cashier sale processing linked to the live stock ledger.',
      'Automated customer return handling and restocking logs.',
      'Role-protected audit reports in Excel, CSV, and PDF formats.'
    ]
  }
];

export default function AboutPage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const touchStartY = useRef(null);
  const touchStartX = useRef(null);
  const wheelLock = useRef(0);

  const goTo = (index) => {
    const clamped = Math.max(0, Math.min(SCENES.length - 1, index));
    if (clamped === activeIdx) return;
    setActiveIdx(clamped);
  };

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        goTo(activeIdx + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        goTo(activeIdx - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIdx]);

  // Desktop Mouse Wheel & Trackpad Listener (Works inside any nested overflow container)
  const handleWheel = (e) => {
    const now = Date.now();
    if (now - wheelLock.current < 450) return;
    if (Math.abs(e.deltaY) > 22) {
      wheelLock.current = now;
      if (e.deltaY > 0) goTo(activeIdx + 1);
      else goTo(activeIdx - 1);
    }
  };

  // Mobile Touch Gestures (Swiping Up / Down or Left / Right advances the scene)
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    touchStartY.current = null;
    touchStartX.current = null;

    // Trigger on whichever axis had the bigger swipe gesture
    const maxDelta = Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : deltaX;
    if (Math.abs(maxDelta) > 35) {
      if (maxDelta > 0) goTo(activeIdx + 1);
      else goTo(activeIdx - 1);
    }
  };

  const currentScene = SCENES[activeIdx];
  const SceneIcon = currentScene.icon;
  const progressPct = ((activeIdx + 1) / SCENES.length) * 100;

  return (
    <div
      className="lecrin-walkthrough"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`
        .lecrin-walkthrough {
          position: relative;
          color: #ffffff;
          background: #020611;
          height: calc(100vh - 120px);
          min-height: 520px;
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 22px clamp(16px, 3.5vw, 48px);
          box-sizing: border-box;
          touch-action: pan-y;
          user-select: none;
          font-family: inherit;
        }

        /* Full photographic supermarket images */
        .cinematic-bg {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center center;
          transition: opacity 0.85s cubic-bezier(0.4, 0, 0.2, 1), transform 1.4s cubic-bezier(0.16, 1, 0.3, 1);
          transform: scale(1.08);
          will-change: opacity, transform;
          z-index: 1;
          pointer-events: none;
        }
        .cinematic-bg.visible {
          opacity: 1;
          transform: scale(1.0);
        }
        .cinematic-bg.hidden {
          opacity: 0;
          transform: scale(1.12);
        }

        /* Vignette gradient overlay for text readability */
        .vignette-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at center,
            rgba(2, 6, 17, 0.3) 0%,
            rgba(2, 6, 17, 0.72) 65%,
            rgba(2, 6, 17, 0.95) 100%
          ),
          linear-gradient(
            180deg,
            rgba(2, 6, 17, 0.75) 0%,
            rgba(2, 6, 17, 0.4) 45%,
            rgba(2, 6, 17, 0.92) 100%
          );
          z-index: 2;
          pointer-events: none;
        }

        /* Top Progress Rail */
        .top-rail {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(255, 255, 255, 0.12);
          z-index: 10;
        }
        .top-rail-fill {
          height: 100%;
          transition: width 0.35s ease, background-color 0.35s ease;
        }

        /* Overhead Aisle Brand HUD */
        .brand-header {
          position: relative;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }
        .aisle-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 16px;
          border-radius: 999px;
          background: rgba(10, 18, 34, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(14px);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }

        /* Center Stage: Minimal Luxe Typography (With Fallback for SVG Text Fill) */
        .hero-story-center {
          position: relative;
          z-index: 5;
          max-width: 860px;
          width: 100%;
          margin: 0 auto;
          text-align: center;
          animation: fadeStory 0.45s ease;
        }
        @keyframes fadeStory {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .eyebrow-focus {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          margin-bottom: 10px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
        }
        .cinematic-title {
          font-size: clamp(32px, 5.8vw, 62px);
          font-weight: 850;
          line-height: 1.05;
          letter-spacing: -0.03em;
          margin: 0 0 10px;
          color: #ffffff;
          text-shadow: 0 4px 24px rgba(0, 0, 0, 0.9);
        }
        .cinematic-headline {
          font-size: clamp(15px, 2.2vw, 20px);
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          margin: 0 0 14px;
          line-height: 1.35;
          text-shadow: 0 2px 14px rgba(0, 0, 0, 0.9);
        }
        .cinematic-desc {
          font-size: clamp(12px, 1.7vw, 15px);
          line-height: 1.6;
          color: rgba(226, 232, 240, 0.92);
          max-width: 700px;
          margin: 0 auto 16px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.9);
        }

        /* Glass Feature Points Card */
        .bullet-strip {
          display: inline-flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(10, 18, 34, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.16);
          backdrop-filter: blur(14px);
          border-radius: 14px;
          padding: 12px 18px;
          text-align: left;
          max-width: 660px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
        }
        .bullet-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #f1f5f9;
        }

        /* Bottom Floor HUD: Scene Dots & Gesture Prompts */
        .bottom-hud {
          position: relative;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }
        .scene-indicator {
          display: flex;
          gap: 6px;
        }
        .scene-dot {
          width: 22px;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.25);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .scene-dot.active {
          width: 38px;
        }
        .scroll-prompt {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.75);
          animation: floatPrompt 2s infinite ease-in-out;
        }
        @keyframes floatPrompt {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(3px); }
        }
      `}</style>

      {/* Top Progress Rail */}
      <div className="top-rail">
        <div
          className="top-rail-fill"
          style={{
            width: `${progressPct}%`,
            backgroundColor: currentScene.accent
          }}
        />
      </div>

      {/* Photographic Backgrounds with Smooth Cross-Fade and Ken-Burns Glides */}
      {SCENES.map((scene, i) => (
        <div
          key={scene.id}
          className={`cinematic-bg ${i === activeIdx ? 'visible' : 'hidden'}`}
          style={{ backgroundImage: `url(${scene.image})` }}
        />
      ))}

      {/* Deep Vignette Overlay for Readability */}
      <div className="vignette-overlay" />

      {/* Header HUD */}
      <header className="brand-header">
        <div className="aisle-pill" style={{ color: currentScene.accent }}>
          <SceneIcon size={14} />
          <span>{currentScene.tag}</span>
        </div>

        <div className="aisle-pill" style={{ color: '#ffffff' }}>
          <span>ZONE {activeIdx + 1} OF {SCENES.length}</span>
        </div>
      </header>

      {/* Center Typography & Purpose Narrative */}
      <main className="hero-story-center" key={currentScene.id}>
        <span className="eyebrow-focus" style={{ color: currentScene.accent }}>
          {currentScene.focus}
        </span>
        <h1 className="cinematic-title">{currentScene.title}</h1>
        <h2 className="cinematic-headline">{currentScene.headline}</h2>
        <p className="cinematic-desc">{currentScene.description}</p>

        <div className="bullet-strip">
          {currentScene.points.map((pt, idx) => (
            <div key={idx} className="bullet-item">
              <CheckCircle2 size={13} style={{ color: currentScene.accent, flexShrink: 0 }} />
              <span>{pt}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom HUD: Scene Tracking Dots & Gesture Indicator */}
      <footer className="bottom-hud">
        <div className="scene-indicator">
          {SCENES.map((_, i) => (
            <div
              key={i}
              className={`scene-dot ${i === activeIdx ? 'active' : ''}`}
              onClick={() => goTo(i)}
              style={
                i === activeIdx
                  ? { backgroundColor: currentScene.accent }
                  : undefined
              }
            />
          ))}
        </div>

        <div className="scroll-prompt">
          <span>Swipe or scroll to walk through</span>
          <ArrowDown size={13} />
        </div>
      </footer>
    </div>
  );
}
