import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
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
      'A complete operating platform engineered for supermarket chains. Unifying supply chain receiving, cold chain safety, mobile floor operations, and checkout sales into a single synchronized system.',
    focus: 'Enterprise Store Ecosystem',
    accent: '#38bdf8',
    image:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=2400&q=85',
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
      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=2400&q=85',
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
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2400&q=85',
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
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=2400&q=85',
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
      'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=2400&q=85',
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
      'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=2400&q=85',
    icon: ShoppingCart,
    points: [
      'Instant cashier sale processing linked to the live stock ledger.',
      'Automated customer return handling and restocking logs.',
      'Role-protected audit reports in Excel, CSV, and PDF formats.'
    ]
  }
];

export default function AboutPage() {
  const containerRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    let animId;
    const handleScroll = () => {
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const totalDist = el.offsetHeight - window.innerHeight;
        if (totalDist <= 0) return;

        const progress = Math.min(Math.max(-rect.top / totalDist, 0), 1);
        setScrollProgress(progress);

        const idx = Math.min(
          SCENES.length - 1,
          Math.floor(progress * SCENES.length)
        );
        setActiveIdx(idx);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animId);
    };
  }, []);

  const currentScene = SCENES[activeIdx];
  const SceneIcon = currentScene.icon;

  return (
    <div ref={containerRef} className="lecrin-walkthrough">
      <style>{`
        .lecrin-walkthrough {
          position: relative;
          color: #ffffff;
          background: #020611;
          height: ${SCENES.length * 115}vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        .stage-fixed {
          position: sticky;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 24px clamp(18px, 4vw, 56px);
          box-sizing: border-box;
          pointer-events: none;
        }

        .cinematic-bg {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center center;
          transition: opacity 1.1s cubic-bezier(0.4, 0, 0.2, 1), transform 1.8s cubic-bezier(0.16, 1, 0.3, 1);
          transform: scale(1.08);
          will-change: opacity, transform;
          z-index: 1;
        }
        .cinematic-bg.visible {
          opacity: 1;
          transform: scale(1.0);
        }
        .cinematic-bg.hidden {
          opacity: 0;
          transform: scale(1.12);
        }

        .vignette-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at center,
            rgba(2, 6, 17, 0.35) 0%,
            rgba(2, 6, 17, 0.75) 65%,
            rgba(2, 6, 17, 0.95) 100%
          ),
          linear-gradient(
            180deg,
            rgba(2, 6, 17, 0.8) 0%,
            rgba(2, 6, 17, 0.4) 45%,
            rgba(2, 6, 17, 0.92) 100%
          );
          z-index: 2;
        }

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
          transition: width 0.1s linear, background-color 0.4s ease;
        }

        .brand-header {
          position: relative;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          pointer-events: auto;
        }
        .aisle-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 18px;
          border-radius: 999px;
          background: rgba(10, 18, 34, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(16px);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }

        .hero-story-center {
          position: relative;
          z-index: 5;
          max-width: 880px;
          width: 100%;
          margin: 0 auto;
          text-align: center;
          pointer-events: auto;
        }
        .eyebrow-focus {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          margin-bottom: 12px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
        }
        .cinematic-title {
          font-size: clamp(34px, 6.5vw, 68px);
          font-weight: 850;
          line-height: 1.04;
          letter-spacing: -0.03em;
          margin: 0 0 14px;
          text-shadow: 0 4px 24px rgba(0, 0, 0, 0.9);
          background: linear-gradient(180deg, #ffffff 30%, rgba(255, 255, 255, 0.82) 100%);
          WebkitBackgroundClip: text;
          WebkitTextFillColor: transparent;
        }
        .cinematic-headline {
          font-size: clamp(16px, 2.4vw, 22px);
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          margin: 0 0 16px;
          line-height: 1.4;
          text-shadow: 0 2px 14px rgba(0, 0, 0, 0.9);
        }
        .cinematic-desc {
          font-size: clamp(13px, 1.8vw, 16px);
          line-height: 1.65;
          color: rgba(226, 232, 240, 0.9);
          max-width: 720px;
          margin: 0 auto 20px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.9);
        }

        .bullet-strip {
          display: inline-flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(10, 18, 34, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(14px);
          border-radius: 14px;
          padding: 12px 20px;
          text-align: left;
          max-width: 680px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        .bullet-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #f1f5f9;
        }

        .bottom-hud {
          position: relative;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          pointer-events: auto;
        }
        .scene-indicator {
          display: flex;
          gap: 8px;
        }
        .scene-dot {
          width: 24px;
          height: 3px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.25);
          transition: all 0.3s ease;
        }
        .scene-dot.active {
          width: 44px;
          background: #ffffff;
        }
        .scroll-prompt {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.7);
          animation: floatPrompt 2s infinite ease-in-out;
        }
        @keyframes floatPrompt {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }
      `}</style>

      <div className="top-rail">
        <div
          className="top-rail-fill"
          style={{
            width: `${scrollProgress * 100}%`,
            backgroundColor: currentScene.accent
          }}
        />
      </div>

      <div className="stage-fixed">
        {SCENES.map((scene, i) => (
          <div
            key={scene.id}
            className={`cinematic-bg ${i === activeIdx ? 'visible' : 'hidden'}`}
            style={{ backgroundImage: `url(${scene.image})` }}
          />
        ))}

        <div className="vignette-overlay" />

        <header className="brand-header">
          <div className="aisle-pill" style={{ color: currentScene.accent }}>
            <SceneIcon size={14} />
            <span>{currentScene.tag}</span>
          </div>

          <div className="aisle-pill" style={{ color: '#ffffff' }}>
            <span>ZONE {activeIdx + 1} OF {SCENES.length}</span>
          </div>
        </header>

        <main className="hero-story-center" key={currentScene.id}>
          <span
            className="eyebrow-focus"
            style={{ color: currentScene.accent }}
          >
            {currentScene.focus}
          </span>
          <h1 className="cinematic-title">{currentScene.title}</h1>
          <h2 className="cinematic-headline">{currentScene.headline}</h2>
          <p className="cinematic-desc">{currentScene.description}</p>

          <div className="bullet-strip">
            {currentScene.points.map((pt, idx) => (
              <div key={idx} className="bullet-item">
                <CheckCircle2 size={14} style={{ color: currentScene.accent, flexShrink: 0 }} />
                <span>{pt}</span>
              </div>
            ))}
          </div>
        </main>

        <footer className="bottom-hud">
          <div className="scene-indicator">
            {SCENES.map((_, i) => (
              <div
                key={i}
                className={`scene-dot ${i === activeIdx ? 'active' : ''}`}
                style={
                  i === activeIdx
                    ? { backgroundColor: currentScene.accent }
                    : undefined
                }
              />
            ))}
          </div>

          <div className="scroll-prompt">
            <span>Scroll down to walk through</span>
            <ArrowDown size={14} />
          </div>
        </footer>
      </div>
    </div>
  );
}
