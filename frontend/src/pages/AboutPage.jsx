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
    points: [
      'Fast camera barcode scanning powered by html5-qrcode on phone and tablet.',
      'Instant cashier sale processing linked directly to the live stock ledger.',
      'Role-protected audit reports in Excel, CSV, and PDF formats.'
    ]
  }
];

export default function AboutPage() {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    let animId;

    const onScroll = () => {
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(() => {
        const el = containerRef.current;
        const video = videoRef.current;
        if (!el || !video || !video.duration) return;

        const totalScrollable = el.scrollHeight - el.clientHeight;
        if (totalScrollable <= 0) return;

        const progress = Math.min(Math.max(el.scrollTop / totalScrollable, 0), 1);

        video.currentTime = progress * video.duration;

        const sceneIndex = Math.min(
          SCENES.length - 1,
          Math.floor(progress * SCENES.length)
        );
        setActiveIdx(sceneIndex);
      });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', onScroll, { passive: true });
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      if (container) container.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(animId);
    };
  }, []);

  const scene = SCENES[activeIdx];

  return (
    <div ref={containerRef} className="scroll-video-walkthrough">
      <style>{`
        .scroll-video-walkthrough {
          position: relative;
          color: #ffffff;
          background: #020611;
          height: calc(100vh - 110px);
          min-height: 520px;
          border-radius: 20px;
          overflow-y: scroll;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
          font-family: inherit;
        }

        .scroll-track {
          height: 400%;
          position: relative;
        }

        .sticky-viewport {
          position: sticky;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 22px clamp(16px, 3.5vw, 48px);
          box-sizing: border-box;
          pointer-events: none;
        }

        .video-scrubber {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 1;
        }

        .vignette-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at center,
            rgba(2, 6, 17, 0.22) 0%,
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
        }

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

        .content-center {
          position: relative;
          z-index: 5;
          max-width: 860px;
          width: 100%;
          margin: 0 auto;
          text-align: center;
          animation: fadeStory 0.3s ease;
        }
        @keyframes fadeStory {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
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

        .stage-footer {
          position: relative;
          z-index: 5;
          height: 16px;
        }
      `}</style>

      <div className="scroll-track">
        <div className="sticky-viewport">
          <video
            ref={videoRef}
            src="/supermarket-walk.mp4"
            muted
            playsInline
            preload="auto"
            className="video-scrubber"
          />

          <div className="vignette-overlay" />

          <header className="stage-header">
            <div className="tag-pill" style={{ color: scene.accent }}>
              <span>{scene.tag}</span>
            </div>
            <div className="tag-pill" style={{ color: '#ffffff' }}>
              <span>ZONE {activeIdx + 1} OF {SCENES.length}</span>
            </div>
          </header>

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

          <footer className="stage-footer" />
        </div>
      </div>
    </div>
  );
}
