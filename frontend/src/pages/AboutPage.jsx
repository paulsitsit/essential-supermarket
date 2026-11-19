import { useRef, useState } from 'react';

const scenes = [
  ['Essential Supermarket', 'Enterprise Store Ecosystem', 'A connected platform for supermarket receiving, inventory, food safety, and checkout.', ['Track stock from receiving to sale.', 'Connect desktop and mobile operations.', 'Keep an auditable inventory ledger.']],
  ['Automated Catalog & Stock Sync', 'Real-Time Store Synchrony', 'Explore catalog management and synchronized stock movements across store operations.', ['Search products and SKUs.', 'Monitor stock movements and thresholds.', 'Manage role-based access.']],
  ['Cold Storage & Fresh Goods', 'Food Safety & Waste Reduction', 'Follow perishable batches, expiration alerts, and quarantine workflows.', ['Review expiration deadlines.', 'Separate quarantined stock.', 'Plan markdowns before expiry.']],
  ['Floor Audits & Sales Depletion', 'Checkout & Reporting', 'Connect barcode stock counts, checkout sales, and inventory reporting.', ['Perform barcode-assisted counts.', 'Record sales against inventory.', 'Review operational reports.']]
];

export default function AboutPage() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState('Loading background video…');
  const video = useRef(null);
  const touch = useRef(null);
  const scene = scenes[index];
  const move = (step) => setIndex(current => Math.max(0, Math.min(scenes.length - 1, current + step)));
  const play = async () => {
    try {
      await video.current.play();
      setStatus('');
    } catch {
      setStatus('Playback was blocked or the video could not load. Try opening the video below.');
    }
  };

  return (
    <section className="es-about" aria-label="About Essential Supermarket" onTouchStart={event => { touch.current = event.touches[0].clientX; }} onTouchEnd={event => { if (touch.current !== null) { const delta = touch.current - event.changedTouches[0].clientX; if (Math.abs(delta) > 45) move(delta > 0 ? 1 : -1); } touch.current = null; }} onTouchCancel={() => { touch.current = null; }}>
      <style>{`
        .es-about { position:relative; isolation:isolate; width:100%; min-width:0; box-sizing:border-box; border-radius:18px; overflow:hidden; color:#fff; background:linear-gradient(135deg,#143b3b,#0c172b); padding:clamp(18px,3vw,36px); touch-action:pan-y pinch-zoom; }
        .es-about *, .es-about *::before, .es-about *::after { box-sizing:border-box; }
        .es-about .es-about-video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:-3; pointer-events:none; transition:opacity .25s; }
        .es-about::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg,rgba(2,6,17,.78),rgba(2,6,17,.35)); z-index:-2; pointer-events:none; }
        .es-about .es-about-body { position:relative; display:grid; gap:16px; max-width:760px; margin:0; padding:0; min-height:0; }
        .es-about .es-about-zone { margin:0; font-size:12px; color:#a7f3d0; letter-spacing:.08em; }
        .es-about h1 { margin:0; color:#fff; font-size:clamp(26px,3.4vw,44px); line-height:1.12; overflow-wrap:anywhere; }
        .es-about h2 { margin:0; color:#d1fae5; font-size:clamp(15px,1.7vw,20px); line-height:1.4; }
        .es-about p { margin:0; line-height:1.65; font-size:15px; }
        .es-about ul { margin:0; padding:16px 16px 16px 34px; border:1px solid #ffffff30; border-radius:12px; background:#071325a6; font-size:14px; line-height:1.8; }
        .es-about .es-about-nav, .es-about .es-about-media { display:flex; align-items:center; flex-wrap:wrap; gap:10px; }
        .es-about button, .es-about a { min-height:44px; padding:10px 14px; border-radius:9px; border:1px solid #ffffff50; background:#102b39; color:#fff; font:inherit; font-size:14px; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; }
        .es-about button[aria-current='step'] { background:#166534; border-color:#86efac; }
        .es-about button:disabled { opacity:.4; cursor:default; }
        .es-about button:focus-visible, .es-about a:focus-visible { outline:3px solid #86efac; outline-offset:3px; }
        .es-about .es-about-status { font-size:13px; color:#d1d5db; }
        @media(max-width:600px) { .es-about { padding:18px; border-radius:12px; } .es-about .es-about-body { gap:12px; } }
        @media(prefers-reduced-motion:reduce) { .es-about .es-about-video { transition:none; } }
      `}</style>
      <video ref={video} className="es-about-video" src="/supermarket-walk.mp4" autoPlay loop muted playsInline preload="metadata" aria-hidden="true" style={{ opacity: playing ? 1 : 0 }} onPlaying={() => { setPlaying(true); setStatus(''); }} onPause={() => setPlaying(false)} onError={() => { setPlaying(false); setStatus('Background video could not load. Open the video to check playback.'); }} onLoadedData={() => { setStatus('Video ready — tap Play background if it does not start.'); }} />
      <div className="es-about-body">
        <p className="es-about-zone">ZONE {index + 1} OF {scenes.length}</p>
        <div aria-live="polite" aria-atomic="true" style={{ display:'grid', gap:12 }}>
          <h1>{scene[0]}</h1>
          <h2>{scene[1]}</h2>
          <p>{scene[2]}</p>
          <ul>{scene[3].map(point => <li key={point}>{point}</li>)}</ul>
        </div>
        <nav className="es-about-nav" aria-label="Walkthrough scenes">
          <button type="button" onClick={() => move(-1)} disabled={index === 0}>Previous</button>
          {scenes.map((item, i) => <button type="button" key={item[0]} aria-label={`Scene ${i + 1}: ${item[0]}`} aria-current={i === index ? 'step' : undefined} onClick={() => setIndex(i)}>{i + 1}</button>)}
          <button type="button" onClick={() => move(1)} disabled={index === scenes.length - 1}>Next</button>
        </nav>
        <div className="es-about-media">
          <button type="button" onClick={() => { if (playing) video.current.pause(); else play(); }}>{playing ? 'Pause background' : 'Play background'}</button>
          <a href="/supermarket-walk.mp4" target="_blank" rel="noreferrer">Open video</a>
        </div>
        <p className="es-about-status" role="status">{status || 'Background video playing.'}</p>
        <p className="es-about-status">Use Next, the scene numbers, or swipe sideways. Scroll normally anywhere on the page.</p>
      </div>
    </section>
  );
}
