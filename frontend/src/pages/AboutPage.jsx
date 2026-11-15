import { useEffect, useState } from 'react';

const FEATURES = [
  {
    icon: '📦',
    title: 'Smart Inventory Tracking',
    text: 'Monitor product quantities, stock levels, categories, and product details in one organized system.'
  },
  {
    icon: '⏳',
    title: 'Expiration Monitoring',
    text: 'Track product batches and receive alerts for items approaching their expiration date.'
  },
  {
    icon: '📉',
    title: 'Low Stock Alerts',
    text: 'Identify products that need restocking before they run out and affect daily operations.'
  },
  {
    icon: '🔄',
    title: 'Stock Movements',
    text: 'Record incoming and outgoing inventory movements to maintain accurate stock history.'
  },
  {
    icon: '📷',
    title: 'Barcode Scanning',
    text: 'Use the scanner workflow to quickly identify products and support faster inventory tasks.'
  },
  {
    icon: '📊',
    title: 'Reports and Insights',
    text: 'Review inventory performance, sales activity, and important operational data through reports.'
  }
];

const STEPS = [
  {
    number: '01',
    title: 'Add Products',
    text: 'Create product records with essential details such as name, category, supplier, price, and stock information.'
  },
  {
    number: '02',
    title: 'Receive Stock',
    text: 'Record incoming stock and manage product batches to keep inventory records accurate.'
  },
  {
    number: '03',
    title: 'Monitor Inventory',
    text: 'Track available quantities, expiration dates, low-stock items, and stock movement history.'
  },
  {
    number: '04',
    title: 'Sell and Review',
    text: 'Process sales, handle returns, and use reports to understand inventory and business performance.'
  }
];

const styles = {
  page: {
    minHeight: '100%',
    color: '#eaf2ff',
    background: 'radial-gradient(1200px 600px at 10% -10%, rgba(56,189,248,0.22), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(168,85,247,0.20), transparent 55%), linear-gradient(160deg, #071021 0%, #0b1a33 45%, #071021 100%)',
    padding: '0 0 64px',
    overflowX: 'hidden'
  },
  hero: {
    position: 'relative',
    padding: '88px 24px 76px',
    textAlign: 'center',
    overflow: 'hidden'
  },
  glow: {
    position: 'absolute',
    width: '520px',
    height: '520px',
    borderRadius: '50%',
    filter: 'blur(110px)',
    opacity: 0.35,
    pointerEvents: 'none'
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '999px',
    border: '1px solid rgba(125,211,252,0.35)',
    background: 'rgba(14,165,233,0.12)',
    color: '#7dd3fc',
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase'
  },
  title: {
    margin: '22px 0 18px',
    fontSize: 'clamp(38px, 7vw, 74px)',
    lineHeight: 1.03,
    fontWeight: 800,
    letterSpacing: '-0.03em',
    background: 'linear-gradient(100deg, #ffffff 10%, #7dd3fc 48%, #c4b5fd 88%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    maxWidth: '760px',
    margin: '0 auto',
    fontSize: 'clamp(16px, 2.4vw, 20px)',
    lineHeight: 1.65,
    color: 'rgba(226,232,240,0.82)'
  },
  heroActions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '14px',
    flexWrap: 'wrap',
    marginTop: '34px'
  },
  primaryButton: {
    display: 'inline-block',
    padding: '14px 28px',
    borderRadius: '999px',
    border: 'none',
    background: 'linear-gradient(120deg, #38bdf8, #818cf8)',
    color: '#04101f',
    fontSize: '15px',
    fontWeight: 750,
    textDecoration: 'none',
    boxShadow: '0 18px 40px rgba(56,189,248,0.25)'
  },
  ghostButton: {
    display: 'inline-block',
    padding: '14px 28px',
    borderRadius: '999px',
    border: '1px solid rgba(148,163,184,0.35)',
    background: 'rgba(255,255,255,0.05)',
    color: '#e2e8f0',
    fontSize: '15px',
    fontWeight: 650,
    textDecoration: 'none'
  },
  section: {
    maxWidth: '1120px',
    margin: '0 auto',
    padding: '0 24px'
  },
  sectionHeading: {
    fontSize: 'clamp(27px, 4vw, 40px)',
    lineHeight: 1.15,
    margin: '0 0 14px',
    fontWeight: 800,
    letterSpacing: '-0.02em'
  },
  sectionText: {
    maxWidth: '720px',
    margin: '0 auto 42px',
    color: 'rgba(203,213,225,0.78)',
    lineHeight: 1.65
  },
  center: {
    textAlign: 'center'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
    gap: '18px'
  },
  card: {
    position: 'relative',
    padding: '26px',
    borderRadius: '22px',
    border: '1px solid rgba(148,163,184,0.16)',
    background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
    backdropFilter: 'blur(14px)',
    transition: 'transform 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease'
  },
  cardIcon: {
    display: 'grid',
    placeItems: 'center',
    width: '54px',
    height: '54px',
    marginBottom: '18px',
    borderRadius: '16px',
    fontSize: '25px',
    background: 'linear-gradient(135deg, rgba(56,189,248,0.22), rgba(129,140,248,0.22))',
    border: '1px solid rgba(125,211,252,0.22)'
  },
  cardTitle: {
    margin: '0 0 10px',
    fontSize: '19px',
    fontWeight: 750
  },
  cardText: {
    margin: 0,
    color: 'rgba(203,213,225,0.78)',
    lineHeight: 1.6,
    fontSize: '15px'
  },
  steps: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px'
  },
  step: {
    position: 'relative',
    padding: '28px 24px',
    borderRadius: '22px',
    border: '1px solid rgba(148,163,184,0.16)',
    background: 'rgba(9,17,32,0.65)'
  },
  stepNumber: {
    fontSize: '42px',
    fontWeight: 850,
    lineHeight: 1,
    background: 'linear-gradient(120deg, #38bdf8, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  mission: {
    padding: '34px',
    borderRadius: '26px',
    border: '1px solid rgba(125,211,252,0.22)',
    background: 'linear-gradient(120deg, rgba(56,189,248,0.14), rgba(129,140,248,0.14))',
    textAlign: 'center'
  },
  missionTitle: {
    margin: '0 0 14px',
    fontSize: 'clamp(24px, 4vw, 34px)',
    fontWeight: 800
  },
  missionText: {
    maxWidth: '780px',
    margin: '0 auto',
    color: 'rgba(226,232,240,0.82)',
    lineHeight: 1.7
  },
  footer: {
    marginTop: '64px',
    paddingTop: '28px',
    borderTop: '1px solid rgba(148,163,184,0.15)',
    textAlign: 'center',
    color: 'rgba(148,163,184,0.75)',
    fontSize: '14px'
  }
};

export default function AboutPage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const reveal = (delay) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(26px)',
    transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`
  });

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div
          style={{
            ...styles.glow,
            top: '-190px',
            left: '-130px',
            background: '#38bdf8'
          }}
        />
        <div
          style={{
            ...styles.glow,
            bottom: '-230px',
            right: '-120px',
            background: '#a855f7'
          }}
        />

        <div style={reveal(0)}>
          <span style={styles.badge}>Essential Supermarket Inventory System</span>
        </div>

        <h1 style={{ ...styles.title, ...reveal(120) }}>
          Inventory clarity for
          <br />
          smarter supermarket operations
        </h1>

        <p style={{ ...styles.subtitle, ...reveal(240) }}>
          Essential Supermarket is a modern inventory management system designed to help teams track products, monitor stock levels, manage expiration dates, record movements, and make better operational decisions.
        </p>

        <div style={{ ...styles.heroActions, ...reveal(360) }}>
          <a className="about-hero-primary" style={styles.primaryButton} href="/dashboard">
            Explore Dashboard
          </a>
          <a className="about-hero-ghost" style={styles.ghostButton} href="/inventory">
            View Inventory
          </a>
        </div>
      </section>

      <section style={styles.section}>
        <div style={{ ...styles.center, ...reveal(120) }}>
          <h2 style={styles.sectionHeading}>Built for accurate inventory control</h2>
          <p style={styles.sectionText}>
            The system brings essential supermarket operations into one platform, helping reduce manual tracking and improve visibility across products, batches, suppliers, sales, and stock activity.
          </p>
        </div>

        <div style={styles.grid}>
          {FEATURES.map((feature, index) => (
            <article
              key={feature.title}
              className="about-feature-card"
              style={{ ...styles.card, ...reveal(160 + index * 90) }}
            >
              <div style={styles.cardIcon}>{feature.icon}</div>
              <h3 style={styles.cardTitle}>{feature.title}</h3>
              <p style={styles.cardText}>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ ...styles.section, marginTop: '82px' }}>
        <div style={{ ...styles.center, ...reveal(100) }}>
          <h2 style={styles.sectionHeading}>How the system works</h2>
          <p style={styles.sectionText}>
            From receiving products to monitoring stock and generating reports, the workflow is designed to keep inventory information organized and actionable.
          </p>
        </div>

        <div style={styles.steps}>
          {STEPS.map((step, index) => (
            <article
              key={step.number}
              className="about-step-card"
              style={{ ...styles.step, ...reveal(180 + index * 100) }}
            >
              <div style={styles.stepNumber}>{step.number}</div>
              <h3 style={{ ...styles.cardTitle, marginTop: '16px' }}>{step.title}</h3>
              <p style={styles.cardText}>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ ...styles.section, marginTop: '82px' }}>
        <div className="about-mission-card" style={{ ...styles.mission, ...reveal(120) }}>
          <h2 style={styles.missionTitle}>Our mission</h2>
          <p style={styles.missionText}>
            To provide a reliable and user-friendly inventory system that helps supermarket teams maintain accurate stock records, prevent product loss, monitor expiration dates, and support efficient daily operations.
          </p>
        </div>
      </section>

      <footer style={{ ...styles.section, ...styles.footer, ...reveal(160) }}>
        Essential Supermarket Inventory System — organized stock, informed decisions.
      </footer>
    </div>
  );
}
