import { useState } from 'react'
import { useTheme } from '@context/ThemeContext'
import {
  FiTrendingUp, FiShoppingBag, FiUsers, FiPackage,
  FiArrowUp, FiArrowDown, FiEye, FiClock, FiCheckCircle, FiXCircle
} from 'react-icons/fi'
import { Line, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler)

// Mock data
const STATS = [
  { label: 'Total Revenue', value: '₹18,42,500', change: +23.5, icon: FiTrendingUp, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
  { label: 'Total Orders', value: '3,847', change: +12.1, icon: FiShoppingBag, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
  { label: 'Total Users', value: '12,293', change: +8.4, icon: FiUsers, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' },
  { label: 'Total Products', value: '1,085', change: -2.3, icon: FiPackage, color: 'text-luxury-gold', bg: 'bg-luxury-gold/10 border-luxury-gold/20' },
]

const RECENT_ORDERS = [
  { id: '#ORD-5821', customer: 'Priya Sharma', product: 'Silk Kurta Set', amount: '₹4,299', status: 'delivered', time: '2h ago' },
  { id: '#ORD-5820', customer: 'Rahul Mehta', product: 'Leather Sneakers', amount: '₹8,999', status: 'processing', time: '4h ago' },
  { id: '#ORD-5819', customer: 'Anjali Reddy', product: 'Floral Saree', amount: '₹12,500', status: 'shipped', time: '6h ago' },
  { id: '#ORD-5818', customer: 'Vikram Singh', product: 'Formal Blazer', amount: '₹6,750', status: 'pending', time: '8h ago' },
  { id: '#ORD-5817', customer: 'Meena Patel', product: 'Designer Handbag', amount: '₹3,199', status: 'cancelled', time: '10h ago' },
]

const TOP_PRODUCTS = [
  { name: 'Silk Kurta Set', sold: 342, revenue: '₹14,69,658', trend: +18 },
  { name: 'Leather Sneakers', sold: 289, revenue: '₹25,99,111', trend: +24 },
  { name: 'Floral Saree', sold: 201, revenue: '₹25,12,500', trend: +9 },
  { name: 'Designer Handbag', sold: 178, revenue: '₹5,69,422', trend: -3 },
  { name: 'Formal Blazer', sold: 154, revenue: '₹10,39,500', trend: +12 },
]

const STATUS_COLORS = {
  delivered: 'bg-green-500/20 text-green-600 border-green-500/30',
  processing: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  shipped: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  pending: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
  cancelled: 'bg-red-500/20 text-red-600 border-red-500/30',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']

function AdminDashboard() {
  const { isDarkMode } = useTheme()
  const [period, setPeriod] = useState('7d')

  const cardBg = isDarkMode ? 'bg-luxury-charcoal border-luxury-darkGray' : 'bg-white border-gray-200'
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900'
  const textSecondary = isDarkMode ? 'text-luxury-mediumGray' : 'text-gray-500'
  const gridColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
  const tickColor = isDarkMode ? '#666' : '#888'

  const lineData = {
    labels: MONTHS,
    datasets: [
      {
        label: 'Revenue (₹)',
        data: [820000, 950000, 1100000, 890000, 1300000, 1150000, 1842500],
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
      y: { grid: { color: gridColor }, ticks: { color: tickColor, callback: (v) => `₹${(v / 100000).toFixed(1)}L` } },
    },
  }

  const doughnutData = {
    labels: ['Delivered', 'Processing', 'Shipped', 'Pending', 'Cancelled'],
    datasets: [{
      data: [45, 20, 18, 12, 5],
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
                {change >= 0 ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />}
                {Math.abs(change)}%
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
        {/* Order Status */}
        <div className={`rounded-xl border p-5 ${cardBg}`}>
          <h3 className={`text-lg font-bold mb-4 ${textPrimary}`}>Order Status</h3>
          <div className="flex items-center justify-center py-4">
            <div className="w-48 h-48">
              <Doughnut data={doughnutData} options={doughnutOptions} />
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
                  {['Order', 'Customer', 'Product', 'Amount', 'Status', 'Time'].map((h) => (
                    <th key={h} className={`px-5 py-3 text-left text-xs uppercase tracking-wider font-semibold ${textSecondary}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECENT_ORDERS.map((order) => (
                  <tr key={order.id} className={`border-b transition-colors ${isDarkMode ? 'border-luxury-darkGray/50 hover:bg-luxury-darkGray/20' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <td className="px-5 py-3.5 text-sm text-luxury-gold font-mono font-semibold">{order.id}</td>
                    <td className={`px-5 py-3.5 text-sm font-medium ${textPrimary}`}>{order.customer}</td>
                    <td className={`px-5 py-3.5 text-sm ${textSecondary}`}>{order.product}</td>
                    <td className={`px-5 py-3.5 text-sm font-semibold ${textPrimary}`}>{order.amount}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${STATUS_COLORS[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className={`px-5 py-3.5 text-xs flex items-center gap-1 ${textSecondary}`}>
                      <FiClock size={12} /> {order.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products */}
        <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
          <div className={`px-5 py-4 border-b ${isDarkMode ? 'border-luxury-darkGray' : 'border-gray-200'}`}>
            <h3 className={`text-lg font-bold ${textPrimary}`}>Top Products</h3>
          </div>
          <div className={`divide-y ${isDarkMode ? 'divide-luxury-darkGray/50' : 'divide-gray-100'}`}>
            {TOP_PRODUCTS.map((product, i) => (
              <div key={product.name} className={`px-5 py-3.5 flex items-center gap-3 transition-colors ${isDarkMode ? 'hover:bg-luxury-darkGray/20' : 'hover:bg-gray-50'}`}>
                <span className={`w-6 h-6 rounded-full flex-center text-xs font-bold flex-shrink-0 flex items-center justify-center ${isDarkMode ? 'bg-luxury-darkGray text-luxury-mediumGray' : 'bg-gray-100 text-gray-500'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${textPrimary}`}>{product.name}</p>
                  <p className={`text-xs ${textSecondary}`}>{product.sold} sold · {product.revenue}</p>
                </div>
                <span className={`text-xs font-bold flex items-center gap-0.5 ${product.trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {product.trend >= 0 ? <FiArrowUp size={11} /> : <FiArrowDown size={11} />}
                  {Math.abs(product.trend)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
