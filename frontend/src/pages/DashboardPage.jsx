import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  Boxes,
  CalendarClock,
  Package,
  ScanLine,
  TrendingDown,
  ShoppingCart,
  Trophy
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
  YAxis,
  Area
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
  }).format(value || 0);

function getGreeting(hour) {
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  }

  if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

export default function DashboardPage() {
  const { account } = useAuth();
  const { lastEvent } = useSocket();

  const [data, setData] = useState(null);
  const [stock, setStock] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [summary, realtime] = await Promise.all([
        client.get('/dashboard/summary'),
        client.get('/dashboard/real-time-stock')
      ]);

      setData(summary.data);
      setStock(realtime.data);
      setError('');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to load dashboard data'
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (lastEvent) {
      load();
    }
  }, [lastEvent]);

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
  const currentHour = new Date().getHours();
  const greeting = getGreeting(currentHour);

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

  const weeklyActivity = data.weeklyActivity || [];
  const salesActivity = data.salesActivity || [];
  const categoryData = data.categoryData || [];
  const bestSeller = data.bestSeller;

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
      value: Number(
        totals.totalStockQuantity || 0
      ).toLocaleString(),
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
      value: Number(
        totals.allTimeItemsSold || 0
      ).toLocaleString(),
      detail: 'Total items sold via POS',
      icon: ShoppingCart,
      tone: 'blue',
      link: '/sales'
    },
    {
      label: 'Revenue Today',
      value: peso(totals.todayRevenue),
      detail: 'Completed sales today',
      icon: TrendingDown,
      tone: 'green',
      link: '/sales'
    }
  ];

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">OVERVIEW</p>

          <h1>
            {greeting}, {firstName}
          </h1>

          <p>
            EssentialSupermarket Inventory & POS Dashboard
          </p>

          <p>
            Monitor stock levels, sales, and inventory activity in real time.
          </p>
        </div>

        <div className="heading-actions">
          {account?.role === 'admin' && (
            <Link
              className="primary-btn"
              to="/products/new"
            >
              <Package size={17} />
              Add Product
            </Link>
          )}

          <Link
            className="secondary-btn"
            to="/scanner"
          >
            <ScanLine size={17} />
            Open Scanner
          </Link>
        </div>
      </div>

      <div className="summary-grid">
        {cards.map(card => {
          const Icon = card.icon;

          return (
            <Link
              to={card.link}
              className="summary-link"
              key={card.label}
            >
              <GlassCard className="summary-card">
                <div
                  className={`summary-icon tone-${card.tone}`}
                >
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
        })}
      </div>

      {/* Best Seller Card */}
      <div className="stock-price-section">
        <GlassCard className="stock-line-card">
          <div className="section-heading">
            <div>
              <h3>Best Seller (This Week)</h3>
              <p>Top product by quantity sold</p>
            </div>

            <span className="analytics-badge">
              Last 7 days
            </span>
          </div>

          {bestSeller ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 0'
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background:
                    'linear-gradient(135deg, #fbbf24, #d97706)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 20
                }}
              >
                <Trophy size={24} />
              </div>

              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 16 }}>
                  {bestSeller.name}
                </strong>
                <div
                  style={{
                    fontSize: 12,
                    color: '#6b7280',
                    marginTop: 4
                  }}
                >
                  {bestSeller.barcode} ·{' '}
                  {bestSeller.quantitySold} sold ·{' '}
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

      {/* Weekly Activity as Bar Chart */}
      <div className="stock-price-section">
        <GlassCard className="stock-line-card">
          <div className="section-heading">
            <div>
              <h3>Weekly Activity</h3>
              <p>Inventory movement trend (last 7 days)</p>
            </div>

            <span className="analytics-badge">
              Last 7 days
            </span>
          </div>

          <ResponsiveContainer
            width="100%"
            height={260}
          >
            <BarChart
              data={weeklyActivity}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0
              }}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="rgba(22, 101, 52, 0.12)"
                vertical={false}
              />

              <XAxis
                dataKey="label"
                tick={{
                  fill: '#86a18c',
                  fontSize: 10
                }}
                axisLine={{
                  stroke:
                    'rgba(22, 101, 52, 0.12)'
                }}
                tickLine={false}
              />

              <YAxis
                tick={{
                  fill: '#86a18c',
                  fontSize: 10
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                contentStyle={{
                  border:
                    '1px solid rgba(22, 101, 52, 0.12)',
                  borderRadius: '10px',
                  background: '#ffffff',
                  color: '#285737',
                  fontSize: '11px'
                }}
              />

              <Bar
                dataKey="value"
                fill="#22c55e"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Sales Activity as Line Chart */}
      <div className="stock-price-section">
        <GlassCard className="stock-line-card">
          <div className="section-heading">
            <div>
              <h3>Sales Activity</h3>
              <p>Revenue trend (last 7 days)</p>
            </div>

            <span className="analytics-badge">
              Last 7 days
            </span>
          </div>

          <ResponsiveContainer
            width="100%"
            height={260}
          >
            <LineChart
              data={salesActivity}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0
              }}
            >
              <defs>
                <linearGradient
                  id="salesLineFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#3b82f6"
                    stopOpacity={0.36}
                  />

                  <stop
                    offset="100%"
                    stopColor="#3b82f6"
                    stopOpacity={0.03}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="4 4"
                stroke="rgba(59, 130, 246, 0.12)"
                vertical={false}
              />

              <XAxis
                dataKey="label"
                tick={{
                  fill: '#64748b',
                  fontSize: 10
                }}
                axisLine={{
                  stroke:
                    'rgba(59, 130, 246, 0.12)'
                }}
                tickLine={false}
              />

              <YAxis
                tick={{
                  fill: '#64748b',
                  fontSize: 10
                }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v =>
                  v >= 1000
                    ? `${(v / 1000).toFixed(0)}k`
                    : v
                }
              />

              <Tooltip
                contentStyle={{
                  border:
                    '1px solid rgba(59, 130, 246, 0.12)',
                  borderRadius: '10px',
                  background: '#ffffff',
                  color: '#1e3a8a',
                  fontSize: '11px'
                }}
                formatter={(value, name) => [
                  peso(value),
                  'Revenue'
                ]}
              />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="none"
                fill="url(#salesLineFill)"
              />

              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: '#3b82f6',
                  stroke: '#ffffff',
                  strokeWidth: 2
                }}
              />
            </LineChart>
          </ResponsiveContainer>
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

          <ResponsiveContainer
            width="100%"
            height={260}
          >
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="quantity"
                nameKey="_id"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={3}
              >
                {categoryData.map(
                  (entry, index) => (
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
                  )
                )}
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

              <p>
                Normal, low-stock, and unavailable products
              </p>
            </div>
          </div>

          <ResponsiveContainer
            width="100%"
            height={260}
          >
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
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                  />
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

            <Link to="/inventory">
              View all
            </Link>
          </div>

          <div className="mini-list">
            {stock?.recent?.length ? (
              stock.recent.map(product => (
                <div
                  className="mini-row"
                  key={product._id}
                >
                  <div className="product-avatar">
                    {product.name?.charAt(0)}
                  </div>

                  <div className="mini-info">
                    <strong>
                      {product.name}
                    </strong>

                    <small>
                      {product.barcode} ·{' '}
                      {product.currentStock}{' '}
                      {product.unitType}
                    </small>
                  </div>

                  <StatusBadge
                    status={product.status}
                  />
                </div>
              ))
            ) : (
              <div className="empty-state">
                No products found.
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="section-heading">
            <div>
              <h3>Low-stock attention</h3>
              <p>
                Products at or below reorder level
              </p>
            </div>

            <Link to="/alerts">
              View alerts
            </Link>
          </div>

          <div className="mini-list">
            {stock?.lowStock?.length ? (
              stock.lowStock.map(product => (
                <div
                  className="mini-row"
                  key={product._id}
                >
                  <div className="product-avatar warning-avatar">
                    !
                  </div>

                  <div className="mini-info">
                    <strong>
                      {product.name}
                    </strong>

                    <small>
                      {product.currentStock}{' '}
                      remaining · Reorder at{' '}
                      {product.reorderLevel}
                    </small>
                  </div>

                  <StatusBadge
                    status={product.status}
                  />
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