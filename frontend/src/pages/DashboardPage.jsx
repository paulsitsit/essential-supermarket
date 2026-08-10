import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  Boxes,
  CalendarClock,
  Package,
  ScanLine,
  TrendingDown
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Area,
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

  const weeklyLineData = [
    { label: 'Aug', value: 38 },
    { label: 'Sep', value: 45 },
    { label: 'Oct', value: 42 },
    { label: 'Nov', value: 31 },
    { label: 'Dec', value: 34 },
    { label: 'Jan', value: 22 },
    { label: 'Feb', value: 18 },
    { label: 'Mar', value: 26 },
    { label: 'Apr', value: 20 },
    { label: 'May', value: 28 },
    { label: 'Jun', value: 21 },
    { label: 'Jul', value: 24 }
  ];

  const categoryData = data.categoryData || [];

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
      label: 'Movements Today',
      value: totals.movementsToday || 0,
      detail: 'Inventory activity recorded',
      icon: ArrowDownToLine,
      tone: 'green',
      link: '/stock-movements'
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
            EssentialSupermarket Inventory Dashboard
          </p>

          <p>
            Monitor stock levels and inventory activity in real time.
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

      <div className="stock-price-section">
        <GlassCard className="stock-line-card">
          <div className="section-heading">
            <div>
              <h3>Weekly Activity</h3>
              <p>Inventory movement trend</p>
            </div>

            <span className="analytics-badge">
              This year
            </span>
          </div>

          <ResponsiveContainer
            width="100%"
            height={260}
          >
            <LineChart
              data={weeklyLineData}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0
              }}
            >
              <defs>
                <linearGradient
                  id="greenLineFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#22c55e"
                    stopOpacity={0.36}
                  />

                  <stop
                    offset="100%"
                    stopColor="#22c55e"
                    stopOpacity={0.03}
                  />
                </linearGradient>
              </defs>

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
                  stroke: 'rgba(22, 101, 52, 0.12)'
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
                  border: '1px solid rgba(22, 101, 52, 0.12)',
                  borderRadius: '10px',
                  background: '#ffffff',
                  color: '#285737',
                  fontSize: '11px'
                }}
              />

              <Area
                type="monotone"
                dataKey="value"
                stroke="none"
                fill="url(#greenLineFill)"
              />

              <Line
                type="monotone"
                dataKey="value"
                stroke="#166534"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: '#22c55e',
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
                    <strong>{product.name}</strong>

                    <small>
                      {product.barcode} · {product.currentStock}{' '}
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
                    <strong>{product.name}</strong>

                    <small>
                      {product.currentStock} remaining ·
                      Reorder at {product.reorderLevel}
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