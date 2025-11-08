'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, ArrowUpRight, Search } from 'lucide-react'

interface StatsData {
  totalSpend: number
  totalInvoices: number
  documentsUploaded: number
  averageInvoiceValue: number
}

interface TrendData {
  month: string
  count: number
  value: number
}

interface VendorData {
  name: string
  spend: number
  percentage: number
}

interface CategoryData {
  category: string
  amount: number
  color: string
}

interface InvoiceData {
  id: string
  vendor: string
  date: string
  invoiceNumber: string
  amount: number
  status: string
}

const COLORS = ['#3B82F6', '#F97316', '#EF4444']

export default function Dashboard() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [trends, setTrends] = useState<TrendData[]>([])
  const [vendors, setVendors] = useState<VendorData[]>([])
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [invoices, setInvoices] = useState<InvoiceData[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all data in parallel
        const [statsRes, trendsRes, vendorsRes, categoriesRes, invoicesRes] = await Promise.all([
          fetch('/api/stats').catch(() => null),
          fetch('/api/invoice-trends').catch(() => null),
          fetch('/api/vendors/top10').catch(() => null),
          fetch('/api/category-spend').catch(() => null),
          fetch('/api/invoices').catch(() => null)
        ])

        // Fallback data matching Figma design
        const fallbackStats = {
          totalSpend: 12679.25,
          totalInvoices: 64,
          documentsUploaded: 17,
          averageInvoiceValue: 2455.00
        }

        const fallbackTrends = [
          { month: 'Jan', count: 25, value: 5200 },
          { month: 'Feb', count: 30, value: 6100 },
          { month: 'Mar', count: 35, value: 7200 },
          { month: 'Apr', count: 28, value: 5800 },
          { month: 'May', count: 40, value: 8400 },
          { month: 'Jun', count: 32, value: 6700 },
          { month: 'Jul', count: 38, value: 7900 },
          { month: 'Aug', count: 45, value: 9200 },
          { month: 'Sep', count: 42, value: 8600 },
          { month: 'Oct', count: 47, value: 8679.25 },
          { month: 'Nov', count: 35, value: 7100 },
          { month: 'Dec', count: 30, value: 6200 }
        ]

        const fallbackVendors = [
          { name: 'Acme Corp', spend: 8679.25, percentage: 68.5 },
          { name: 'Tech Solutions', spend: 2450.00, percentage: 19.3 },
          { name: 'Global Supply', spend: 1200.00, percentage: 9.5 },
          { name: 'Office Ltd', spend: 350.00, percentage: 2.8 }
        ]

        const fallbackCategories = [
          { category: 'Operations', amount: 1000 },
          { category: 'Marketing', amount: 7250 },
          { category: 'Facilities', amount: 1000 }
        ]

        const fallbackInvoices = [
          { id: '1', vendor: 'Phunk GmbH', date: '19.08.2025', invoiceNumber: 'INV-2024-001', amount: 736.78, status: 'PAID' },
          { id: '2', vendor: 'Phunk GmbH', date: '19.08.2025', invoiceNumber: 'INV-2024-002', amount: 736.78, status: 'PAID' },
          { id: '3', vendor: 'Phunk GmbH', date: '18.08.2025', invoiceNumber: 'INV-2024-003', amount: 736.78, status: 'PENDING' },
          { id: '4', vendor: 'Global Supply', date: '17.08.2025', invoiceNumber: 'INV-2024-004', amount: 1200.00, status: 'PAID' },
          { id: '5', vendor: 'Tech Solutions', date: '16.08.2025', invoiceNumber: 'INV-2024-005', amount: 2450.00, status: 'OVERDUE' },
          { id: '6', vendor: 'Office Ltd', date: '15.08.2025', invoiceNumber: 'INV-2024-006', amount: 350.00, status: 'PAID' },
          { id: '7', vendor: 'Acme Corp', date: '14.08.2025', invoiceNumber: 'INV-2024-007', amount: 8679.25, status: 'PAID' }
        ]

        // Use API data if available, otherwise use fallback
        const statsData = statsRes ? await statsRes.json() : fallbackStats
        const trendsData = trendsRes ? await trendsRes.json() : fallbackTrends
        const vendorsData = vendorsRes ? await vendorsRes.json() : fallbackVendors
        const categoriesData = categoriesRes ? await categoriesRes.json() : fallbackCategories
        const invoicesData = invoicesRes ? await invoicesRes.json() : fallbackInvoices

        setStats(statsData)
        setTrends(trendsData)
        setVendors(vendorsData)
        setCategories(categoriesData.map((item: any, index: number) => ({
          ...item,
          color: COLORS[index % COLORS.length]
        })))
        setInvoices(invoicesData)
      } catch (error) {
        console.error('Error fetching data:', error)
        // Set fallback data on error
        setStats({
          totalSpend: 12679.25,
          totalInvoices: 64,
          documentsUploaded: 17,
          averageInvoiceValue: 2455.00
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const filteredInvoices = invoices.filter(invoice =>
    invoice.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">AJ</span>
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-900">Amit Jadhav</div>
                <div className="text-gray-500">Admin</div>
              </div>
            </div>
            <button className="p-1 hover:bg-gray-100 rounded">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Total Spend</h3>
            <div className="flex items-center text-green-600 text-sm">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="font-medium">+8.2%</span>
            </div>
          </div>
          <div className="text-gray-400 text-xs mb-1">(YTD)</div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.totalSpend || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">from last month</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Total Invoices Processed</h3>
            <div className="flex items-center text-green-600 text-sm">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="font-medium">+8.2%</span>
            </div>
          </div>
          <div className="text-gray-400 text-xs mb-1"></div>
          <p className="text-2xl font-bold text-gray-900">{stats?.totalInvoices || 0}</p>
          <p className="text-xs text-gray-500 mt-1">from last month</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Documents Uploaded</h3>
            <div className="flex items-center text-red-600 text-sm">
              <TrendingDown className="w-4 h-4 mr-1" />
              <span className="font-medium">-5%</span>
            </div>
          </div>
          <div className="text-gray-400 text-xs mb-1">This Month</div>
          <p className="text-2xl font-bold text-gray-900">{stats?.documentsUploaded || 0}</p>
          <p className="text-xs text-gray-500 mt-1">less from last month</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Average Invoice Value</h3>
            <div className="flex items-center text-green-600 text-sm">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="font-medium">+8.2%</span>
            </div>
          </div>
          <div className="text-gray-400 text-xs mb-1"></div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.averageInvoiceValue || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">from last month</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Invoice Volume + Value Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Invoice Volume + Value Trend</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm">
                <div className="w-3 h-3 bg-blue-600 rounded mr-2"></div>
                <span className="text-gray-600">Invoice count and total spend over 12 months</span>
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-600 mb-4">
            <div className="flex items-center space-x-4">
              <span>October 2025</span>
              <span>Invoice Count: <strong>47</strong></span>
              <span>Total Spend: <strong>{formatCurrency(8679.25)}</strong></span>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#9CA3AF" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Spend by Vendor (Top 10) */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Spend by Vendor (Top 10)</h3>
          <p className="text-sm text-gray-600 mb-6">Vendor spend with cumulative percentage distribution.</p>
          <div className="space-y-4">
            {vendors.map((vendor, index) => (
              <div key={vendor.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{vendor.name}</span>
                  <span className="font-medium">{formatCurrency(vendor.spend)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      index === 0 ? 'bg-blue-600' :
                      index === 1 ? 'bg-blue-400' : 'bg-gray-400'
                    }`}
                    style={{ width: `${vendor.percentage}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  {vendor.percentage.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Global Supply</span>
              <ArrowUpRight className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(8679.25)}</div>
            <div className="text-xs text-gray-500">Vendor Spend</div>
          </div>
        </div>
      </div>

      {/* Bottom Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Spend by Category */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Spend by Category</h3>
          <p className="text-sm text-gray-600 mb-6">Distribution of spending across different categories.</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="amount"
                  startAngle={90}
                  endAngle={450}
                >
                  {categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {categories.map((category, index) => (
              <div key={category.category} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <span className="text-gray-700">{category.category}</span>
                </div>
                <span className="font-medium">{formatCurrency(category.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cash Outflow Forecast */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Cash Outflow Forecast</h3>
          <p className="text-sm text-gray-600 mb-6">Expected payment obligations grouped by due date ranges.</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { period: '< 7 days', amount: 4200 },
                { period: '8-30 days', amount: 6800 },
                { period: '31-60 days', amount: 5200 },
                { period: '60+ days', amount: 7600 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invoices by Vendor */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Invoices by Vendor</h3>
          <p className="text-sm text-gray-600 mb-6">Top vendors by invoice count and net value.</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
              <span>Vendor</span>
              <span># Invoices</span>
              <span>Net Value</span>
            </div>
            {invoices.slice(0, 7).map((invoice, index) => (
              <div key={invoice.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 flex-1">{invoice.vendor}</span>
                <span className="text-gray-600 w-16 text-center">{new Date(invoice.date).toLocaleDateString('de-DE')}</span>
                <span className="font-medium w-24 text-right">{formatCurrency(invoice.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}