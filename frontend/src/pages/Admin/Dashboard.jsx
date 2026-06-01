import { useState, useEffect } from 'react'
import { useTheme } from '@context/ThemeContext'
import {
  FiTrendingUp, FiShoppingBag, FiUsers, FiPackage,
  FiArrowUp, FiArrowDown, FiClock
} from 'react-icons/fi'
import { Line, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js'
import apiServices from '../../services/apiServices'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler)

const STATUS_COLORS = {
  delivered: 'bg-green-500/20 text-green-600 border-green-500/30',
  processing: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  shipped: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  pending: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
  cancelled: 'bg-red-500/20 text-red-600 border-red-500/30',
  refunded: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
  returned: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
}

function AdminDashboard() {
  const { isDarkMode } = useTheme()
  const [period, setPeriod] = useState('7d')
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const res = await apiServices.adminService.getDashboardMetrics()
      if (res.data.success) {
        setMetrics(res.data.metrics)
      }
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const cardBg = isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900'
  const textSecondary = isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-500'
  const gridColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
  const tickColor = isDarkMode ? '#666' : '#888'

  if (loading || !metrics) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-8 h-8 border-4 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const STATS = [
    { label: 'Total Revenue', value: `₹${metrics.totalSales.toLocaleString('en-IN')}`, change: 0, icon: FiTrendingUp, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
    { label: 'Total Orders', value: metrics.totalOrders.toLocaleString(), change: 0, icon: FiShoppingBag, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
    { label: 'Total Users', value: metrics.totalUsers.toLocaleString(), change: 0, icon: FiUsers, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' },
    { label: 'Avg Order Value', value: `₹${metrics.avgOrderValue.toFixed(0)}`, change: 0, icon: FiPackage, color: 'text-luxury-gold', bg: 'bg-luxury-gold/10 border-luxury-gold/20' },
  ]

  // Prepare Chart Data
  const lineData = {
    labels: metrics.salesTimeline.map(s => s.date),
    datasets: [
      {
        label: 'Revenue (₹)',
        data: metrics.salesTimeline.map(s => s.revenue),
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255,215,0,0.08)',
        pointBackgroundColor: '#FFD700',
        tension: 0.4,
        fill: true,
      },
    ],
  }

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `₹${ctx.parsed.y.toLocaleString('en-IN')}`,
        },
      },
    },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: tickColor } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor, callback: (v) => `₹${(v / 1000).toFixed(1)}K` } },
    },
  }

  // Assuming doughnut based on static status for now, or we can use real category sales
  const doughnutData = {
    labels: metrics.categorySales.map(c => c.category || 'Other'),
    datasets: [{
      data: metrics.categorySales.map(c => c.sales),
      backgroundColor: ['#22c55e', '#3b82f6', '#a855f7', '#eab308', '#ef4444'],
      borderWidth: 0,
    }],
  }

  const doughnutOptions = {
    plugins: { legend: { position: 'bottom', labels: { color: isDarkMode ? '#999' : '#555', padding: 16, font: { size: 12 } } } },
    cutout: '70%',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-serif font-bold ${textPrimary}`}>Overview</h2>
        <div className={`flex gap-1 p-1 rounded-lg ${isDarkMode ? 'bg-luxury-charcoal' : 'bg-gray-100'}`}>
          {['7d', '30d', '90d', '1y'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                period === p
                  ? 'bg-luxury-gold text-luxury-black'
                  : isDarkMode ? 'text-luxury-mediumGray hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map(({ label, value, change, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border p-5 ${bg} ${cardBg}`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2.5 rounded-lg ${bg} border`}>
                <Icon size={20} className={color} />
              </div>
              <span className={`flex items-center gap-1 text-xs font-semibold ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {change !== 0 && (change > 0 ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
                {change !== 0 ? `${Math.abs(change)}%` : '-'}
              </span>
            </div>
            <p className={`text-2xl font-bold mb-1 ${textPrimary}`}>{value}</p>
            <p className={`text-sm ${textSecondary}`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className={`xl:col-span-2 rounded-xl border p-5 ${cardBg}`}>
          <h3 className={`text-lg font-bold mb-4 ${textPrimary}`}>Revenue Trend</h3>
          <Line data={lineData} options={lineOptions} />
        </div>
        {/* Category Sales */}
        <div className={`rounded-xl border p-5 ${cardBg}`}>
          <h3 className={`text-lg font-bold mb-4 ${textPrimary}`}>Sales by Category</h3>
          <div className="flex items-center justify-center py-4">
            <div className="w-48 h-48">
              {metrics.categorySales.length > 0 ? (
                <Doughnut data={doughnutData} options={doughnutOptions} />
              ) : (
                <div className={`flex h-full items-center justify-center ${textSecondary}`}>No data</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className={`xl:col-span-2 rounded-xl border overflow-hidden ${cardBg}`}>
          <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-luxury-darkGray' : 'border-gray-200'}`}>
            <h3 className={`text-lg font-bold ${textPrimary}`}>Recent Orders</h3>
            <a href="/admin/orders" className="text-sm text-luxury-gold hover:underline flex items-center gap-1">
              View all <FiArrowUp size={12} className="rotate-45" />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-luxury-darkGray' : 'border-gray-200'}`}>
                  {['Order', 'Customer', 'Amount', 'Status', 'Date'].map((h) => (
                    <th key={h} className={`px-5 py-3 text-left text-xs uppercase tracking-wider font-semibold ${textSecondary}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.recentOrders.map((order) => (
                  <tr key={order.id} className={`border-b transition-colors ${isDarkMode ? 'border-luxury-darkGray/50 hover:bg-luxury-darkGray/20' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <td className="px-5 py-3.5 text-sm text-luxury-gold font-mono font-semibold">#{order.id.substring(18)}</td>
                    <td className={`px-5 py-3.5 text-sm font-medium ${textPrimary}`}>{order.customer}</td>
                    <td className={`px-5 py-3.5 text-sm font-semibold ${textPrimary}`}>₹{order.total.toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${STATUS_COLORS[order.status] || STATUS_COLORS.pending}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className={`px-5 py-3.5 text-xs flex items-center gap-1 ${textSecondary}`}>
                      <FiClock size={12} /> {new Date(order.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {metrics.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan="5" className={`px-5 py-6 text-center text-sm ${textSecondary}`}>
                      No recent orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products / Low Stock */}
        <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
          <div className={`px-5 py-4 border-b ${isDarkMode ? 'border-luxury-darkGray' : 'border-gray-200'}`}>
            <h3 className={`text-lg font-bold ${textPrimary}`}>Low Stock Alerts</h3>
          </div>
          <div className={`divide-y p-5 text-center ${isDarkMode ? 'divide-luxury-darkGray/50' : 'divide-gray-100'}`}>
            <p className={`text-4xl font-bold text-red-500 mb-2`}>{metrics.lowStockCount}</p>
            <p className={`text-sm ${textSecondary}`}>Products have fallen below the stock threshold and need re-ordering.</p>
            <a href="/admin/products?filter=low_stock" className="inline-block mt-4 text-sm text-luxury-gold hover:underline">
              View Inventory
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
