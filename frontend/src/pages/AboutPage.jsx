import { useEffect, useRef, useState } from 'react';

const scenes = [
  ['Essential Supermarket', 'Enterprise Store Ecosystem', 'A connected platform for supermarket receiving, inventory, food safety, and checkout.', ['Track stock from receiving to sale.', 'Connect desktop and mobile operations.', 'Keep an auditable inventory ledger.']],
  ['Automated Catalog & Stock Sync', 'Real-Time Store Synchrony', 'Explore catalog management and synchronized stock movements across store operations.', ['Search products and SKUs.', 'Monitor stock movements and thresholds.', 'Manage role-based access.']],
  ['Cold Storage & Fresh Goods', 'Food Safety & Waste Reduction', 'Follow perishable batches, expiration alerts, and quarantine workflows.', ['Review expiration deadlines.', 'Separate quarantined stock.', 'Plan markdowns before expiry.']],
  ['Floor Audits & Sales Depletion', 'Checkout & Reporting', 'Connect barcode stock counts, checkout sales, and inventory reporting.', ['Perform barcode-assisted counts.', 'Record sales against inventory.', 'Review operational reports.']]
];

export default function AboutPage() {
  const track = useRef(null);
  const stage = useRef(null);
  const video = useRef(null);
  const scrollRoot = useRef(null);
  const sync = useRef(() => {});
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const scene = scenes[index];

  useEffect(() => {
    const el = track.current;
    const panel = stage.current;
    const media = video.current;
    let root = el.parentElement;
    while (root && !/(auto|scroll|overlay)/.test(getComputedStyle(root).overflowY)) root = root.parentElement;
    if (root === document.body || root === document.documentElement) root = null;
    scrollRoot.current = root;
    let raf = 0;
    let progress = 0;
    let disposed = false;
    const seek = () => {
      if (disposed || !Number.isFinite(media.duration) || media.duration <= 0 || media.readyState < 1 || media.seeking) return;
      const target = progress * Math.max(0, media.duration - 0.08);
      if (Math.abs(media.currentTime - target) > 0.025) {
        try { media.currentTime = target; } catch { /* Metadata can change during loading. */ }
      }
    };
    const update = () => {
      const top = root ? root.getBoundingClientRect().top + root.clientTop : 0;
      const travel = Math.max(1, el.offsetHeight - panel.offsetHeight);
      progress = Math.max(0, Math.min(1, (top - el.getBoundingClientRect().top) / travel));
      setIndex(Math.min(scenes.length - 1, Math.floor(progress * scenes.length)));
      seek();
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    const measure = () => {
      const viewport = Math.min(window.innerHeight, root ? root.clientHeight : window.innerHeight);
      el.style.height = `${panel.offsetHeight + Math.max(300, viewport) * 3}px`;
      schedule();
    };
    sync.current = schedule;
    const hold = () => media.pause();
    document.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', measure);
    media.addEventListener('loadedmetadata', schedule);
    media.addEventListener('loadeddata', schedule);
    media.addEventListener('seeked', seek);
    media.addEventListener('play', hold);
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    if (root) observer.observe(root);
    media.pause();
    measure();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener('scroll', schedule, true);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', measure);
      media.removeEventListener('loadedmetadata', schedule);
      media.removeEventListener('loadeddata', schedule);
      media.removeEventListener('seeked', seek);
      media.removeEventListener('play', hold);
      sync.current = () => {};
    };
  }, []);

  const goTo = (i) => {
    const root = scrollRoot.current;
    const top = root ? root.getBoundingClientRect().top + root.clientTop : 0;
    const travel = track.current.offsetHeight - stage.current.offsetHeight;
    const fraction = i === 0 ? 0 : (i + 0.1) / scenes.length;
    const delta = track.current.getBoundingClientRect().top - top + fraction * travel;
    if (root) root.scrollBy({ top: delta, behavior: 'auto' });
    else window.scrollBy({ top: delta, behavior: 'auto' });
    sync.current();
  };

  return (
    <div ref={track} className="es-scroll-story">
      <style>{`
        .es-scroll-story { position:relative; width:100%; min-width:0; height:2400px; }
        .es-scroll-story *, .es-scroll-story *::before { box-sizing:border-box; }
        .es-scroll-story .es-scroll-stage { position:sticky; top:0; isolation:isolate; overflow:hidden; border-radius:16px; padding:clamp(16px,3vw,32px); color:#fff; background:linear-gradient(135deg,#143b3b,#0c172b); }
        .es-scroll-story .es-scroll-video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:-3; pointer-events:none; }
        .es-scroll-story .es-scroll-stage::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg,#020611cc,#02061166); z-index:-2; pointer-events:none; }
        .es-scroll-story .es-scroll-body { position:relative; display:grid; gap:12px; max-width:760px; margin:0; }
        .es-scroll-story h1 { margin:0; font-size:clamp(25px,3.4vw,44px); line-height:1.12; color:#fff; overflow-wrap:anywhere; }
        .es-scroll-story h2 { margin:0; font-size:clamp(15px,1.7vw,20px); color:#d1fae5; line-height:1.4; }
        .es-scroll-story p { margin:0; font-size:14px; line-height:1.6; }
        .es-scroll-story ul { margin:0; padding:12px 12px 12px 30px; border:1px solid #ffffff30; border-radius:12px; background:#071325a6; font-size:14px; line-height:1.7; }
        .es-scroll-story nav { display:flex; flex-wrap:wrap; gap:8px; }
        .es-scroll-story button, .es-scroll-story a { display:inline-flex; align-items:center; justify-content:center; min-height:44px; padding:10px 14px; border:1px solid #ffffff50; border-radius:9px; background:#102b39; color:#fff; font:inherit; font-size:14px; text-decoration:none; cursor:pointer; }
        .es-scroll-story button[aria-current='step'] { background:#166534; border-color:#86efac; }
        .es-scroll-story button:focus-visible, .es-scroll-story a:focus-visible { outline:3px solid #86efac; outline-offset:3px; }
        .es-scroll-story .es-scroll-status { font-size:12px; color:#d1d5db; }
      `}</style>
      <section ref={stage} className="es-scroll-stage" aria-label="Scroll-controlled supermarket walkthrough">
        <video ref={video} className="es-scroll-video" src="/supermarket-walk.mp4" muted playsInline preload="auto" aria-hidden="true" style={{ opacity: ready ? 1 : 0 }} onLoadedData={() => { setReady(true); setError(false); sync.current(); }} onError={() => { setReady(false); setError(true); }} />
        <div className="es-scroll-body">
          <p>ZONE {index + 1} OF {scenes.length}</p>
          <div aria-live="polite" aria-atomic="true" style={{ display:'grid', gap:12 }}>
            <h1>{scene[0]}</h1>
            <h2>{scene[1]}</h2>
            <p>{scene[2]}</p>
            <ul>{scene[3].map(point => <li key={point}>{point}</li>)}</ul>
          </div>
          <nav aria-label="Jump to scene">
            {scenes.map((item, i) => <button type="button" key={item[0]} aria-label={`Scroll to scene ${i + 1}: ${item[0]}`} aria-current={i === index ? 'step' : undefined} onClick={() => goTo(i)}>{i + 1}</button>)}
          </nav>
          <p className="es-scroll-status" role="status">{error ? 'Video could not load. Text still follows your scroll.' : ready ? 'Scroll down to move forward. Scroll up to rewind. Stop scrolling to hold the frame.' : 'Loading scroll-controlled video…'}</p>
          {error && <nav><button type="button" onClick={() => { setError(false); video.current.load(); }}>Retry video</button><a href="/supermarket-walk.mp4" target="_blank" rel="noreferrer">Open video</a></nav>}
        </div>
      </section>
    </div>
  );
}
