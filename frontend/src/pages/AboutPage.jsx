import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  BarChart3,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  Package,
  Pause,
  Play,
  QrCode,
  RotateCcw,
  ShoppingCart,
  Store,
  Volume2,
  VolumeX
} from 'lucide-react';

const SCENES = [
  {
    time: 0.0,
    tag: 'STORE AISLE INTAKE',
    title: 'Essential Supermarket',
    headline: 'Next-Generation Retail & Inventory Intelligence',
    description:
      'A complete operating platform engineered for modern supermarket chains. Unifying supply chain receiving, cold chain safety, mobile floor operations, and checkout sales into a single synchronized system.',
    focus: 'Enterprise Store Ecosystem',
    accent: '#38bdf8',
    icon: Store,
    points: [
      'Tailored for supermarkets handling high-turnover grocery and perishables.',
      'Synchronized across desktop web workstations and Android mobile devices.',
      'Audit-proof ledger tracking every item from supplier dock to shopper receipt.'
    ]
  },
  {
    time: 2.1,
    tag: 'BEVERAGE & DRY GOODS',
    title: 'Automated Catalog & Stock Sync',
    headline: 'Real-Time Inventory & System Centralization',
    description:
      'Rolling past center product stacks. Live WebSocket feeds distribute active stock movements, price changes, and threshold warnings across all connected store terminals.',
    focus: 'Real-Time Store Synchrony',
    accent: '#818cf8',
    icon: MapPin,
    points: [
      'Instant catalog lookup for over thousands of products and active SKUs.',
      'Role-governed security shielding administrative controls behind JWT validation.',
      'Multi-branch ready architecture supporting multi-location inventory.'
    ]
  },
  {
    time: 4.2,
    tag: 'BOTTLED GOODS & REFRIGERATION',
    title: 'Cold Storage & Fresh Goods',
    headline: 'Automated 06:00 AM Expiration Control',
    description:
      'Approaching refrigerated displays. Automated scheduled background engines analyze expiration deadlines every morning, alerting floor staff and segregating items into quarantine.',
    focus: 'Food Safety & Waste Elimination',
    accent: '#34d399',
    icon: Clock,
    points: [
      'Automated cron job runs daily at 06:00 Asia/Manila across all batches.',
      'Isolated quarantine holding ledger removes recalled stock from active POS.',
      'Markdown workflows guide early discounting before products expire.'
    ]
  },
  {
    time: 6.2,
    tag: 'SHELF RESTOCK & CHECKOUT',
    title: 'Floor Audits & Sales Depletion',
    headline: 'High-Speed Barcode & FIFO Checkout',
    description:
      'Gliding toward the checkout line. Staff perform rapid camera barcode cycle counts while customer purchases deduct stock through First-In-First-Out batch selection.',
    focus: 'Shelf Replenishment & Financial Ledger',
    accent: '#f59e0b',
    icon: ShoppingCart,
    points: [
      'Fast camera barcode scanning powered by html5-qrcode on phone and tablet.',
      'Instant cashier sale processing linked directly to the live stock ledger.',
      'Role-protected audit reports in Excel, CSV, and PDF formats.'
    ]
  }
];

export default function AboutPage() {
  const videoRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(8.2);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const cur = video.currentTime;
    setCurrentTime(cur);

    let matchedIdx = 0;
    for (let i = SCENES.length - 1; i >= 0; i--) {
      if (cur >= SCENES[i].time) {
        matchedIdx = i;
        break;
      }
    }
    setActiveIdx(matchedIdx);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const seekToScene = (time) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    }
  };

  const restartVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play();
    setIsPlaying(true);
  };

  const currentScene = SCENES[activeIdx];
  const SceneIcon = currentScene.icon;
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="lecrin-video-walkthrough">
      <style>{`
        .lecrin-video-walkthrough {
          position: relative;
          color: #ffffff;
          background: #020611;
          height: calc(100vh - 120px);
          min-height: 540px;
          border-radius: 22px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 22px clamp(16px, 3.5vw, 44px);
          box-sizing: border-box;
          user-select: none;
          font-family: inherit;
        }

        .video-canvas-bg {
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
            rgba(2, 6, 17, 0.2) 0%,
            rgba(2, 6, 17, 0.65) 60%,
            rgba(2, 6, 17, 0.94) 100%
          ),
          linear-gradient(
            180deg,
            rgba(2, 6, 17, 0.72) 0%,
            rgba(2, 6, 17, 0.35) 45%,
            rgba(2, 6, 17, 0.92) 100%
          );
          z-index: 2;
          pointer-events: none;
        }

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
          transition: width 0.15s linear, background-color 0.3s ease;
        }

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
          background: rgba(10, 18, 34, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.22);
          backdrop-filter: blur(14px);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }

        .video-ctrl-btns {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ctrl-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: rgba(10, 18, 34, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.22);
          color: #ffffff;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .ctrl-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .hero-story-center {
          position: relative;
          z-index: 5;
          max-width: 860px;
          width: 100%;
          margin: 0 auto;
          text-align: center;
          animation: fadeStory 0.4s ease;
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

        .bottom-hud {
          position: relative;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 12px;
          flex-wrap: wrap;
        }
        .scene-pills {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .timeline-pill {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(10, 18, 34, 0.85);
          color: rgba(241, 245, 249, 0.88);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .timeline-pill.active {
          color: #020611;
          border-color: transparent;
        }
        .live-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.8);
        }
        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulseGlow 1.8s infinite;
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
        }
      `}</style>

      {/* Top Progress Line */}
      <div className="top-rail">
        <div
          className="top-rail-fill"
          style={{
            width: `${progressPct}%`,
            backgroundColor: currentScene.accent
          }}
        />
      </div>

      {/* 8.2-second Supermarket Cart Walkthrough Video */}
      <video
        ref={videoRef}
        src="/supermarket-walk.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="video-canvas-bg"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={(e) => {
          setDuration(e.target.duration || 8.2);
        }}
      />

      {/* Vignette Overlay */}
      <div className="vignette-overlay" />

      {/* Header HUD */}
      <header className="brand-header">
        <div className="aisle-pill" style={{ color: currentScene.accent }}>
          <SceneIcon size={14} />
          <span>{currentScene.tag}</span>
        </div>

        <div className="video-ctrl-btns">
          <button
            type="button"
            className="ctrl-btn"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            type="button"
            className="ctrl-btn"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button
            type="button"
            className="ctrl-btn"
            onClick={restartVideo}
            aria-label="Restart Walkthrough"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </header>

      {/* Center Story Narrative */}
      <main className="hero-story-center" key={currentScene.tag}>
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

      {/* Bottom Timeline HUD */}
      <footer className="bottom-hud">
        <div className="scene-pills">
          {SCENES.map((scene, idx) => (
            <button
              key={scene.tag}
              type="button"
              className={`timeline-pill ${idx === activeIdx ? 'active' : ''}`}
              onClick={() => seekToScene(scene.time)}
              style={
                idx === activeIdx
                  ? { backgroundColor: scene.accent }
                  : undefined
              }
            >
              {scene.tag}
            </button>
          ))}
        </div>

        <div className="live-tag">
          <div
            className="pulse-dot"
            style={{ backgroundColor: currentScene.accent }}
          />
          <span>Supermarket Aisle Walkthrough</span>
        </div>
      </footer>
    </div>
  );
}
