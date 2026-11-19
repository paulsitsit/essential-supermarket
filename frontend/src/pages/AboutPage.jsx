import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

const SCENES = [
  {
    tag: 'STORE ENTRANCE & INTAKE',
    title: 'Essential Supermarket',
    headline: 'Next-Generation Retail & Inventory Intelligence',
    description:
      'A complete operating platform engineered for supermarket chains. Unifying supply chain receiving, cold chain safety, mobile floor operations, and checkout sales into a single synchronized system.',
    focus: 'Enterprise Store Ecosystem',
    accent: '#38bdf8',
    poster: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80',
    points: [
      'Tailored for supermarkets handling high-turnover grocery and perishables.',
      'Synchronized across desktop web workstations and Android mobile devices.',
      'Audit-proof ledger tracking every item from supplier dock to shopper receipt.'
    ]
  },
  {
    tag: 'CENTER GROCERY AISLES',
    title: 'Automated Catalog & Stock Sync',
    headline: 'Real-Time Inventory & System Centralization',
    description:
      'Rolling through the product rows. Live WebSocket feeds distribute active stock movements, price changes, and threshold warnings across all connected store terminals.',
    focus: 'Real-Time Store Synchrony',
    accent: '#818cf8',
    poster: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1600&q=80',
    points: [
      'Instant catalog lookup for over thousands of products and active SKUs.',
      'Role-governed security shielding administrative controls behind JWT validation.',
      'Multi-branch ready architecture supporting multi-location inventory.'
    ]
  },
  {
    tag: 'PERISHABLES & REFRIGERATION',
    title: 'Cold Storage & Fresh Goods',
    headline: 'Automated 06:00 AM Expiration Control',
    description:
      'Approaching refrigerated displays. Automated scheduled background engines analyze expiration deadlines every morning, alerting floor staff and segregating items into quarantine.',
    focus: 'Food Safety & Waste Elimination',
    accent: '#34d399',
    poster: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80',
    points: [
      'Automated cron job runs daily at 06:00 Asia/Manila across all batches.',
      'Isolated quarantine holding ledger removes recalled stock from active POS.',
      'Markdown workflows guide early discounting before products expire.'
    ]
  },
  {
    tag: 'CHECKOUT & REPORTING',
    title: 'Floor Audits & Sales Depletion',
    headline: 'High-Speed Barcode & FIFO Checkout',
    description:
      'Reaching checkout registers. Staff perform rapid camera barcode cycle counts while customer purchases deduct stock through First-In-First-Out batch selection.',
    focus: 'Shelf Replenishment & Financial Ledger',
    accent: '#f59e0b',
    poster: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=1600&q=80',
    points: [
      'Fast camera barcode scanning powered by html5-qrcode on phone and tablet.',
      'Instant cashier sale processing linked directly to the live stock ledger.',
      'Role-protected audit reports in Excel, CSV, and PDF formats.'
    ]
  }
];

export default function AboutPage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const videoRef = useRef(null);
  const touchStartY = useRef(null);
  const touchStartX = useRef(null);
  const wheelLock = useRef(0);

  const goTo = (index) => {
    const clamped = Math.max(0, Math.min(SCENES.length - 1, index));
    if (clamped === activeIdx) return;
    setActiveIdx(clamped);

    // Scrub video position smoothly to match the active zone
    const video = videoRef.current;
    if (video && video.duration) {
      video.currentTime = (clamped / (SCENES.length - 1)) * video.duration;
    }
  };

  // 1. Mobile Touch Gestures (Swiping Up/Down or Left/Right smoothly cycles scenes)
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

    const maxDelta = Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : deltaX;
    if (Math.abs(maxDelta) > 30) {
      if (maxDelta > 0) goTo(activeIdx + 1);
      else goTo(activeIdx - 1);
    }
  };

  // 2. Desktop Mouse Wheel & Trackpad
  const handleWheel = (e) => {
    const now = Date.now();
    if (now - wheelLock.current < 450) return;
    if (Math.abs(e.deltaY) > 20) {
      wheelLock.current = now;
      if (e.deltaY > 0) goTo(activeIdx + 1);
      else goTo(activeIdx - 1);
    }
  };

  // 3. Keyboard Arrow Keys
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        goTo(activeIdx + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        goTo(activeIdx - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIdx]);

  const scene = SCENES[activeIdx];
  const progressPct = ((activeIdx + 1) / SCENES.length) * 100;

  return (
    <div
      className="about-interactive-stage"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`
        .about-interactive-stage {
          position: relative;
          color: #ffffff;
          background: #020611;
          height: calc(100vh - 120px);
          min-height: 520px;
          border-radius: 22px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 24px clamp(16px, 3.5vw, 48px);
          box-sizing: border-box;
          touch-action: none;
          user-select: none;
          font-family: inherit;
        }

        /* Video Background: plays video, with photographic fallback if decoding stalls */
        .video-canvas-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 1;
        }

        /* Fallback photo background if video is pending */
        .fallback-photo-bg {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          transition: opacity 0.7s ease;
          z-index: 0;
        }

        /* Dark Vignette Overlay */
        .vignette-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at center,
            rgba(2, 6, 17, 0.2) 0%,
            rgba(2, 6, 17, 0.65) 60%,
            rgba(2, 6, 17, 0.94) 100%
          ),
          linear-gradient(
            180deg,
            rgba(2, 6, 17, 0.72) 0%,
            rgba(2, 6, 17, 0.32) 45%,
            rgba(2, 6, 17, 0.92) 100%
          );
          z-index: 2;
          pointer-events: none;
        }

        /* Top Progress Line */
        .top-rail {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: rgba(255, 255, 255, 0.15);
          z-index: 10;
        }
        .top-rail-fill {
          height: 100%;
          transition: width 0.35s ease, background-color 0.35s ease;
        }

        /* Header Tag HUD */
        .stage-header {
          position: relative;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }
        .tag-pill {
          display: inline-block;
          padding: 7px 16px;
          border-radius: 999px;
          background: rgba(10, 18, 34, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(14px);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        /* Center Content: Minimal Luxe Typography */
        .content-center {
          position: relative;
          z-index: 5;
          max-width: 860px;
          width: 100%;
          margin: 0 auto;
          text-align: center;
          animation: fadeStory 0.35s ease;
        }
        @keyframes fadeStory {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
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
          margin-bottom: 8px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
        }
        .cinematic-title {
          font-size: clamp(30px, 5.5vw, 58px);
          font-weight: 850;
          line-height: 1.05;
          letter-spacing: -0.03em;
          margin: 0 0 8px;
          color: #ffffff;
          text-shadow: 0 4px 24px rgba(0, 0, 0, 0.9);
        }
        .cinematic-headline {
          font-size: clamp(14px, 2vw, 19px);
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          margin: 0 0 12px;
          line-height: 1.35;
          text-shadow: 0 2px 14px rgba(0, 0, 0, 0.9);
        }
        .cinematic-desc {
          font-size: clamp(12px, 1.6vw, 14px);
          line-height: 1.6;
          color: rgba(226, 232, 240, 0.92);
          max-width: 680px;
          margin: 0 auto 14px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.9);
        }

        /* Glass Feature Card */
        .bullet-strip {
          display: inline-flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(10, 18, 34, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.16);
          backdrop-filter: blur(14px);
          border-radius: 14px;
          padding: 10px 18px;
          text-align: left;
          max-width: 640px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
        }
        .bullet-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #f1f5f9;
        }

        /* Bottom Floor HUD: Progress Dots & Swipe Hint */
        .stage-footer {
          position: relative;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }
        .dots-row {
          display: flex;
          gap: 6px;
        }
        .dot-indicator {
          width: 22px;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.25);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .dot-indicator.active {
          width: 38px;
        }
        .swipe-hint {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.75);
        }
      `}</style>

      {/* Top Progress Rail */}
      <div className="top-rail">
        <div
          className="top-rail-fill"
          style={{
            width: `${progressPct}%`,
            backgroundColor: scene.accent
          }}
        />
      </div>

      {/* Fallback photographic background */}
      <div
        className="fallback-photo-bg"
        style={{ backgroundImage: `url(${scene.poster})` }}
      />

      {/* Supermarket Video Scrubber */}
      <video
        ref={videoRef}
        src="/supermarket-walk.mp4"
        muted
        playsInline
        preload="auto"
        className="video-canvas-bg"
      />

      <div className="vignette-overlay" />

      {/* Top HUD */}
      <header className="stage-header">
        <div className="tag-pill" style={{ color: scene.accent }}>
          <span>{scene.tag}</span>
        </div>
        <div className="tag-pill" style={{ color: '#ffffff' }}>
          <span>ZONE {activeIdx + 1} OF {SCENES.length}</span>
        </div>
      </header>

      {/* Center Story Content */}
      <main className="content-center" key={scene.tag}>
        <span className="eyebrow-focus" style={{ color: scene.accent }}>
          {scene.focus}
        </span>
        <h1 className="cinematic-title">{scene.title}</h1>
        <h2 className="cinematic-headline">{scene.headline}</h2>
        <p className="cinematic-desc">{scene.description}</p>

        <div className="bullet-strip">
          {scene.points.map((pt, idx) => (
            <div key={idx} className="bullet-item">
              <CheckCircle2 size={13} style={{ color: scene.accent, flexShrink: 0 }} />
              <span>{pt}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Scene Dots & Gesture Hint */}
      <footer className="stage-footer">
        <div className="dots-row">
          {SCENES.map((_, i) => (
            <div
              key={i}
              className={`dot-indicator ${i === activeIdx ? 'active' : ''}`}
              onClick={() => goTo(i)}
              style={
                i === activeIdx
                  ? { backgroundColor: scene.accent }
                  : undefined
              }
            />
          ))}
        </div>

        <div className="swipe-hint">
          Swipe or scroll to walk through
        </div>
      </footer>
    </div>
  );
}
