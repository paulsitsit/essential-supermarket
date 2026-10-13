import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react';

import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftFromLine,
  ArrowRightFromLine,
  Boxes,
  CalendarClock,
  ChevronDown,
  Package,
  ScanLine,
  ShoppingCart,
  TrendingDown,
  Trophy,
  Wallet
} from 'lucide-react';

import { Link } from 'react-router-dom';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import client from '../api/client';
import GlassCard from '../components/common/GlassCard';
import StatusBadge from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const peso = value =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(Number(value) || 0);

const number = value =>
  Number(value || 0).toLocaleString('en-PH');

function getGreeting(hour) {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function movementLabel(value) {
  return String(value || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

function ActivityDetails({ kind, row, compact = false }) {
  if (!row) return null;

  const isSales = kind === 'sales';
  const products = Array.isArray(row.products) ? row.products : [];
  const visibleProducts = compact ? products.slice(0, 5) : products;
  const top = products[0];

  const metrics = isSales
    ? [
        ['Gross sales', peso(row.grossRevenue)],
        ['Refunds', peso(row.refunds)],
        ['Net revenue', peso(row.netRevenue)],
        ['Transactions', number(row.transactions)]
      ]
    : [
        ['Units moved', number(row.value)],
        ['Movement records', number(row.movementCount)]
      ];

  return (
    <div style={{ fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>
        {row.fullDate || row.label}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 10,
          marginBottom: 14
        }}
      >
        {metrics.map(([label, value]) => (
          <div key={label}>
            <div style={{ opacity: 0.75, fontSize: 11 }}>
              {label}
            </div>
            <div style={{ fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>

      {top && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 10,
            background: isSales
              ? 'rgba(59, 130, 246, 0.10)'
              : 'rgba(34, 197, 94, 0.10)',
            overflowWrap: 'anywhere'
          }}
        >
          <div style={{ fontSize: 11, opacity: 0.8 }}>
            {isSales
              ? 'Highest product sales value'
              : 'Most active product'}
            {' '}
            (ties may occur)
          </div>

          <div style={{ fontWeight: 700 }}>{top.name}</div>

          <div>
            {isSales
              ? `${number(top.quantitySold)} sold · ${peso(top.revenue)} gross`
              : `${number(top.unitsMoved)} units moved`}
          </div>
        </div>
      )}

      <div style={{ fontWeight: 700, marginBottom: 8 }}>
        {isSales
          ? 'Products ranked by gross sales value'
          : 'Products ranked by movement volume'}
      </div>

      {!products.length ? (
        <div style={{ opacity: 0.8, padding: '8px 0' }}>
          {isSales
            ? 'No completed sales recorded for this day.'
            : 'No inventory movements recorded for this day.'}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 9,
            maxHeight: compact ? undefined : 360,
            overflowY: compact ? undefined : 'auto'
          }}
        >
          {visibleProducts.map((product, index) => (
            <div
              key={product.id || `${product.name}-${index}`}
              style={{
                paddingBottom: 9,
                borderBottom: '1px solid rgba(148, 163, 184, 0.22)',
                overflowWrap: 'anywhere'
              }}
            >
              <div style={{ fontWeight: 600 }}>
                {index + 1}. {product.name || 'Unknown product'}
              </div>

              {product.barcode && (
                <div style={{ fontSize: 10, opacity: 0.7 }}>
                  {product.barcode}
                </div>
              )}

              {isSales ? (
                <div>
                  {number(product.quantitySold)} sold ·{' '}
                  {peso(product.revenue)} gross
                </div>
              ) : (
                <>
                  <div>
                    {number(product.unitsMoved)} units moved
                  </div>

                  {(product.movements || []).map((movement, i) => (
                    <div
                      key={`${movement.type}-${i}`}
                      style={{ fontSize: 11, opacity: 0.85 }}
                    >
                      {movementLabel(movement.type)}:{' '}
                      {number(movement.unitsMoved)} units moved
                      {!compact && (
                        <>
                          {' '}· signed change:{' '}
                          {movement.netChange > 0 ? '+' : ''}
                          {number(movement.netChange)}
                        </>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {compact && products.length > 5 && (
        <div style={{ marginTop: 8, opacity: 0.75 }}>
          +{products.length - 5} more products. Click to view all.
        </div>
      )}

      {isSales && (
        <div style={{ marginTop: 10, fontSize: 10, opacity: 0.75 }}>
          Product values are gross item subtotals.
          Refunds are shown at day level, not allocated to products.
        </div>
      )}

      {compact && (
        <div style={{ marginTop: 10, fontSize: 10, opacity: 0.75 }}>
          Click a bar, point, or day button to keep details open.
        </div>
      )}
    </div>
  );
}

function ActivityTooltip({ active, payload, kind }) {
  const row = payload?.[0]?.payload;

  if (!active || !row) return null;

  return (
    <div
      style={{
        width: 'min(310px, calc(100vw - 40px))',
        padding: 14,
        border: '1px solid #cbd5e1',
        borderRadius: 12,
        background: '#ffffff',
        color: '#1e293b',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
        pointerEvents: 'none'
      }}
    >
      <ActivityDetails kind={kind} row={row} compact />
    </div>
  );
}

function DayButtons({ rows, selectedDate, onSelect }) {
  return (
    <div
      aria-label="Choose a day to view activity details"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 8
      }}
    >
      {rows.map(row => (
        <button
          key={row.date || row.label}
          type="button"
          className="secondary-btn"
          aria-pressed={selectedDate === row.date}
          aria-label={`View activity for ${row.fullDate || row.label}`}
          title={row.fullDate || row.label}
          onClick={() => onSelect(row)}
          style={{
            minHeight: 34,
            padding: '0 10px',
            fontSize: 11,
            outline:
              selectedDate === row.date
                ? '2px solid #22c55e'
                : undefined
          }}
        >
          {row.label}
        </button>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { account } = useAuth();
  const { lastEvent } = useSocket();

  const [data, setData] = useState(null);
  const [stock, setStock] = useState(null);
  const [error, setError] = useState('');

  const [statsExpanded, setStatsExpanded] = useState(false);
  const [firstRowCount, setFirstRowCount] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  // Store only the selection so socket refreshes use fresh chart data.
  const [selectedActivity, setSelectedActivity] = useState(null);

  const summaryMeasureRef = useRef(null);
  const detailsRef = useRef(null);
  const requestSequence = useRef(0);

  async function load() {
    const requestId = ++requestSequence.current;

    try {
      const [summary, realtime] = await Promise.all([
        client.get('/dashboard/summary'),
        client.get('/dashboard/real-time-stock')
      ]);

      if (requestId !== requestSequence.current) return;

      setData(summary.data);
      setStock(realtime.data);
      setError('');
    } catch (err) {
      if (requestId !== requestSequence.current) return;

      setError(
        err.response?.data?.message ||
          'Unable to load dashboard data'
      );
    }
  }

  useEffect(() => {
    load();

    return () => {
      requestSequence.current += 1;
    };
  }, []);

  useEffect(() => {
    if (lastEvent) load();
  }, [lastEvent]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);

    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    function measureFirstRow() {
      const grid = summaryMeasureRef.current;
      if (!grid) return;

      const children = Array.from(grid.children);

      if (!children.length) {
        setFirstRowCount(1);
        return;
      }

      const firstTop = Math.round(
        children[0].getBoundingClientRect().top
      );

      const count = children.filter(card =>
        Math.abs(
          Math.round(card.getBoundingClientRect().top) - firstTop
        ) <= 2
      ).length;

      setFirstRowCount(Math.max(1, count));
    }

    measureFirstRow();

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(measureFirstRow)
        : null;

    if (summaryMeasureRef.current) {
      observer?.observe(summaryMeasureRef.current);
    }

    window.addEventListener('resize', measureFirstRow);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measureFirstRow);
    };
  }, [data]);

  useEffect(() => {
    if (selectedActivity) {
      detailsRef.current?.focus({ preventScroll: true });
    }
  }, [selectedActivity]);

  function selectDay(kind, row) {
    if (!row?.date) return;
    setSelectedActivity({ kind, date: row.date });
  }

  function handleChartClick(kind, chartState, rows) {
    const payload = chartState?.activePayload?.[0]?.payload;

    if (payload?.date) {
      selectDay(kind, payload);
      return;
    }

    const index = chartState?.activeTooltipIndex;

    if (
      index !== null &&
      index !== undefined &&
      index !== '' &&
      rows[Number(index)]
    ) {
      selectDay(kind, rows[Number(index)]);
    }
  }

  if (error) {
    return (
      <div className="page-error">
        <p>{error}</p>
        <button
          type="button"
          className="secondary-btn"
          onClick={load}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-loading">
        Loading dashboard...
      </div>
    );
  }

  const totals = data.totals || {};
  const weeklyActivity = data.weeklyActivity || [];
  const salesActivity = data.salesActivity || [];
  const categoryData = data.categoryData || [];
  const bestSeller = data.bestSeller;

  const selectedRows =
    selectedActivity?.kind === 'sales'
      ? salesActivity
      : weeklyActivity;

  const selectedRow = selectedRows.find(
    row => row.date === selectedActivity?.date
  );

  const firstName = account?.fullName
    ? account.fullName.split(' ')[0]
    : 'there';

  const statusData = [
    {
      name: 'Normal',
      value: Math.max(
        0,
        (totals.products || 0) -
          (totals.lowStock || 0) -
          (totals.outOfStock || 0)
      ),
      color: '#16a34a'
    },
    {
      name: 'Low Stock',
      value: totals.lowStock || 0,
      color: '#d97706'
    },
    {
      name: 'Out of Stock',
      value: totals.outOfStock || 0,
      color: '#dc2626'
    }
  ].filter(item => item.value > 0);

  const cards = [
    {
      label: 'Total Products',
      value: totals.products || 0,
      detail: 'Active registered products',
      icon: Package,
      tone: 'green',
      link: '/products'
    },
    {
      label: 'Total Stock Quantity',
      value: number(totals.totalStockQuantity),
      detail: 'Units currently available',
      icon: Boxes,
      tone: 'blue',
      link: '/inventory'
    },
    {
      label: 'Inventory Value',
      value: peso(totals.inventoryValue),
      detail: 'Based on cost price',
      icon: TrendingDown,
      tone: 'purple',
      link: '/reports'
    },
    {
      label: 'Low-Stock Products',
      value: totals.lowStock || 0,
      detail: 'Need replenishment review',
      icon: AlertTriangle,
      tone: 'amber',
      link: '/alerts'
    },
    {
      label: 'Expiration Alerts',
      value: totals.expirationAlerts || 0,
      detail: 'Products expiring soon',
      icon: CalendarClock,
      tone: 'red',
      link: '/alerts'
    },
    {
      label: 'Out-of-Stock',
      value: totals.outOfStock || 0,
      detail: 'Currently unavailable',
      icon: AlertTriangle,
      tone: 'red',
      link: '/alerts'
    },
    {
      label: 'Defective Products',
      value: totals.defectiveProducts || 0,
      detail: 'Reported as damaged or defective',
      icon: AlertTriangle,
      tone: 'red',
      link: '/stock-movements?movementType=damaged'
    },
    {
      label: 'Movements Today',
      value: totals.movementsToday || 0,
      detail: 'Inventory activity recorded',
      icon: ArrowDownToLine,
      tone: 'green',
      link: '/stock-movements'
    },
    {
      label: 'Products Sold (All-time)',
      value: number(totals.allTimeItemsSold),
      detail: 'Total items sold via POS',
      icon: ShoppingCart,
      tone: 'blue',
      link: '/sales'
    },
    {
      label: 'Gross Sales Today',
      value: peso(totals.todayRevenue),
      detail: 'Completed sales before refunds',
      icon: ArrowRightFromLine,
      tone: 'blue',
      link: '/sales'
    },
    {
      label: 'Refunds Today',
      value: peso(totals.todayRefunds),
      detail: 'Value refunded via returns',
      icon: ArrowLeftFromLine,
      tone: 'red',
      link: '/returns'
    },
    {
      label: 'Net Revenue Today',
      value: peso(totals.todayNetRevenue),
      detail: 'Gross sales minus refunds',
      icon: Wallet,
      tone: 'green',
      link: '/reports'
    },
    {
      label: 'Returns Today',
      value: totals.returnsToday || 0,
      detail: 'Return records processed',
      icon: AlertTriangle,
      tone: 'amber',
      link: '/returns'
    }
  ];

  const visibleCards =
    isMobile || statsExpanded
      ? cards
      : cards.slice(0, firstRowCount);

  const hasMoreCards = !isMobile && cards.length > firstRowCount;

  function renderSummaryCard(card) {
    const Icon = card.icon;

    return (
      <Link
        to={card.link}
        className="summary-link"
        key={card.label}
      >
        <GlassCard className="summary-card">
          <div className={`summary-icon tone-${card.tone}`}>
            <Icon size={21} />
          </div>

          <div>
            <p>{card.label}</p>
            <h2>{card.value}</h2>
            <small>{card.detail}</small>
          </div>
        </GlassCard>
      </Link>
    );
  }

  const axisTick = { fill: '#86a18c', fontSize: 10 };
  const chartMargin = { top: 10, right: 15, left: 0, bottom: 0 };

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">OVERVIEW</p>

          <h1>
            {getGreeting(new Date().getHours())}, {firstName}
          </h1>

          <p>A Web-Based Inventory Management System</p>

          <p>
            with Real-Time Stock Monitoring and Automated
            Low-Stock Alerts for Supermarkets.
          </p>
        </div>

        <div className="heading-actions">
          {account?.role === 'admin' && (
            <Link className="primary-btn" to="/products/new">
              <Package size={17} />
              Add Product
            </Link>
          )}

          <Link className="secondary-btn" to="/scanner">
            <ScanLine size={17} />
            Open Scanner
          </Link>
        </div>
      </div>

      <div
        ref={summaryMeasureRef}
        className="summary-grid summary-grid-measure"
        aria-hidden="true"
      >
        {cards.map(renderSummaryCard)}
      </div>

      <section
        className="summary-section"
        aria-label="Dashboard statistics"
      >
        <div
          className={`summary-grid summary-grid-collapsible ${
            statsExpanded
              ? 'summary-grid-expanded'
              : 'summary-grid-collapsed'
          }`}
        >
          {visibleCards.map(renderSummaryCard)}
        </div>

        {hasMoreCards && (
          <div className="summary-toggle-wrap">
            <button
              type="button"
              className={`summary-toggle ${
                statsExpanded ? 'summary-toggle-expanded' : ''
              }`}
              onClick={() => setStatsExpanded(current => !current)}
              aria-expanded={statsExpanded}
              aria-label={
                statsExpanded ? 'Show fewer stats' : 'Show more stats'
              }
              title={
                statsExpanded ? 'Show fewer stats' : 'Show more stats'
              }
            >
              <ChevronDown size={20} />
            </button>
          </div>
        )}
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: 16,
          marginTop: 16,
          marginBottom: 16
        }}
      >
        <GlassCard className="stock-line-card">
          <div className="section-heading">
            <div>
              <h3>Weekly Activity</h3>
              <p>Inventory movement trend (last 7 days)</p>
              <p>Hover for a preview. Click or tap for details.</p>
            </div>
            <span className="analytics-badge">Last 7 days</span>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={weeklyActivity}
              margin={chartMargin}
              onClick={state =>
                handleChartClick('movement', state, weeklyActivity)
              }
            >
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="rgba(22, 101, 52, 0.12)"
                vertical={false}
              />

              <XAxis
                dataKey="label"
                tick={axisTick}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />

              <Tooltip
                content={<ActivityTooltip kind="movement" />}
                wrapperStyle={{ zIndex: 20 }}
                cursor={{ fill: 'rgba(34, 197, 94, 0.08)' }}
              />

              <Bar
                dataKey="value"
                name="Units moved"
                fill="#22c55e"
                radius={[6, 6, 0, 0]}
                style={{ cursor: 'pointer' }}
                onClick={entry =>
                  selectDay('movement', entry?.payload || entry)
                }
              />
            </BarChart>
          </ResponsiveContainer>

          <DayButtons
            rows={weeklyActivity}
            selectedDate={
              selectedActivity?.kind === 'movement'
                ? selectedActivity.date
                : null
            }
            onSelect={row => selectDay('movement', row)}
          />
        </GlassCard>

        <GlassCard className="stock-line-card">
          <div className="section-heading">
            <div>
              <h3>Sales Activity</h3>
              <p>Net revenue trend (last 7 days)</p>
              <p>Hover for a preview. Click or tap for details.</p>
            </div>
            <span className="analytics-badge">Last 7 days</span>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={salesActivity}
              margin={chartMargin}
              onClick={state =>
                handleChartClick('sales', state, salesActivity)
              }
            >
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="rgba(59, 130, 246, 0.12)"
                vertical={false}
              />

              <XAxis
                dataKey="label"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={value =>
                  Math.abs(value) >= 1000
                    ? `${(value / 1000).toFixed(1)}k`
                    : value
                }
              />

              <Tooltip
                content={<ActivityTooltip kind="sales" />}
                wrapperStyle={{ zIndex: 20 }}
              />

              <Line
                type="monotone"
                dataKey="netRevenue"
                name="Net revenue"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{
                  r: 4,
                  fill: '#3b82f6',
                  stroke: '#ffffff',
                  strokeWidth: 1
                }}
                activeDot={{
                  r: 7,
                  fill: '#3b82f6',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                  onClick: (event, point) =>
                    selectDay('sales', point?.payload)
                }}
              />
            </LineChart>
          </ResponsiveContainer>

          <DayButtons
            rows={salesActivity}
            selectedDate={
              selectedActivity?.kind === 'sales'
                ? selectedActivity.date
                : null
            }
            onSelect={row => selectDay('sales', row)}
          />
        </GlassCard>
      </div>

      {selectedActivity && (
        <section
          ref={detailsRef}
          tabIndex={-1}
          aria-label="Selected day activity details"
          style={{ marginBottom: 16, scrollMarginTop: 90 }}
        >
          <GlassCard className="stock-line-card">
            <div className="section-heading">
              <div>
                <h3>
                  {selectedActivity.kind === 'sales'
                    ? 'Sales details'
                    : 'Inventory movement details'}
                </h3>
                <p>
                  Details stay open until you close them or select
                  another day.
                </p>
              </div>

              <button
                type="button"
                className="secondary-btn"
                onClick={() => setSelectedActivity(null)}
              >
                Close
              </button>
            </div>

            {selectedRow ? (
              <ActivityDetails
                kind={selectedActivity.kind}
                row={selectedRow}
              />
            ) : (
              <p>This day is no longer in the current seven-day range.</p>
            )}
          </GlassCard>
        </section>
      )}

      <div className="stock-price-section">
        <GlassCard className="stock-line-card">
          <div className="section-heading">
            <div>
              <h3>Best Seller (This Week)</h3>
              <p>Top product by quantity sold</p>
            </div>
            <span className="analytics-badge">Since Sunday</span>
          </div>

          {bestSeller ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '12px 0'
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  flexShrink: 0,
                  borderRadius: 10,
                  background:
                    'linear-gradient(135deg, #fbbf24, #d97706)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff'
                }}
              >
                <Trophy size={24} />
              </div>

              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 16 }}>
                  {bestSeller.name}
                </strong>
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.75,
                    marginTop: 4
                  }}
                >
                  {bestSeller.barcode} ·{' '}
                  {number(bestSeller.quantitySold)} sold ·{' '}
                  {peso(bestSeller.revenue)}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              No sales data yet for best seller.
            </div>
          )}
        </GlassCard>
      </div>

      <div className="chart-grid">
        <GlassCard className="chart-card">
          <div className="section-heading">
            <div>
              <h3>Inventory by Category</h3>
              <p>Current quantity distribution</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="quantity"
                nameKey="_id"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={3}
              >
                {categoryData.map((entry, index) => (
                  <Cell
                    key={entry._id}
                    fill={
                      [
                        '#16a34a',
                        '#22c55e',
                        '#86efac',
                        '#166534',
                        '#4ade80'
                      ][index % 5]
                    }
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="chart-card">
          <div className="section-heading">
            <div>
              <h3>Current Stock Status</h3>
              <p>Normal, low-stock, and unavailable products</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={3}
              >
                {statusData.map(entry => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <div className="dashboard-grid">
        <GlassCard>
          <div className="section-heading">
            <div>
              <h3>Recently updated products</h3>
              <p>Latest inventory changes</p>
            </div>
            <Link to="/inventory">View all</Link>
          </div>

          <div className="mini-list">
            {stock?.recent?.length ? (
              stock.recent.map(product => (
                <div className="mini-row" key={product._id}>
                  <div className="product-avatar">
                    {product.name?.charAt(0)}
                  </div>

                  <div className="mini-info">
                    <strong>{product.name}</strong>
                    <small>
                      {product.barcode} · {product.currentStock}{' '}
                      {product.unitType}
                    </small>
                  </div>

                  <StatusBadge status={product.status} />
                </div>
              ))
            ) : (
              <div className="empty-state">No products found.</div>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="section-heading">
            <div>
              <h3>Low-stock attention</h3>
              <p>Products at or below reorder level</p>
            </div>
            <Link to="/alerts">View alerts</Link>
          </div>

          <div className="mini-list">
            {stock?.lowStock?.length ? (
              stock.lowStock.map(product => (
                <div className="mini-row" key={product._id}>
                  <div className="product-avatar warning-avatar">!</div>

                  <div className="mini-info">
                    <strong>{product.name}</strong>
                    <small>
                      {product.currentStock} remaining · Reorder at{' '}
                      {product.reorderLevel}
                    </small>
                  </div>

                  <StatusBadge status={product.status} />
                </div>
              ))
            ) : (
              <div className="empty-state success-empty">
                Stock levels look healthy.
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}