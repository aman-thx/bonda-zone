/* eslint-disable */

import React, { useState, useEffect } from 'react'
import { analyticsService } from '../services/analyticsService'
import { formatETB } from '../utils/currency'
import TimeFilter from './TimeFilter'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts'

export default function BusinessAnalytics() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [period, setPeriod] = useState('month')
  const [timeSeriesData, setTimeSeriesData] = useState([])

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

  useEffect(() => {
    loadData()
  }, [period])

  const loadData = async (filter = { period: 'month' }) => {
    setLoading(true)
    try {
      const data = await analyticsService.calculateMetrics(filter.period, filter.startDate, filter.endDate)
      setMetrics(data)
      
      // Generate time series data
      const series = await analyticsService.getTimeSeriesData(filter.period)
      setTimeSeriesData(series)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (filter) => {
    setPeriod(filter.period)
    loadData(filter)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!metrics) return null

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'sales', label: 'Sales Analysis', icon: '💰' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'expenses', label: 'Expenses', icon: '💸' },
    { id: 'products', label: 'Products', icon: '👕' }
  ]

  return (
    <div className="space-y-6">
      {/* Time Filter */}
      <TimeFilter onFilterChange={handleFilterChange} currentPeriod={period} />

      {/* Analytics Tabs */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg p-2 border border-indigo-100">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-indigo-50'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-indigo-100 text-sm mb-1">Total Revenue</p>
              <p className="text-3xl font-bold mb-2">{formatETB(metrics.totalRevenue)}</p>
              <p className="text-indigo-200 text-xs">{metrics.totalSalesCount} transactions</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-green-100 text-sm mb-1">Net Profit</p>
              <p className="text-3xl font-bold mb-2">{formatETB(metrics.netProfit)}</p>
              <p className="text-green-200 text-xs">Margin: {metrics.netProfitMargin.toFixed(1)}%</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-orange-100 text-sm mb-1">Total Expenses</p>
              <p className="text-3xl font-bold mb-2">{formatETB(metrics.totalExpenses)}</p>
              <p className="text-orange-200 text-xs">Expense Ratio: {metrics.expenseRatio.toFixed(1)}%</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-purple-100 text-sm mb-1">Inventory Value</p>
              <p className="text-3xl font-bold mb-2">{formatETB(metrics.totalInventoryValue)}</p>
              <p className="text-purple-200 text-xs">{metrics.lowStockCount} low stock items</p>
            </div>
          </div>

          {/* Second Row KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-lg p-4 border border-indigo-100">
              <p className="text-gray-500 text-xs mb-1">Average Order Value</p>
              <p className="text-2xl font-bold text-gray-800">{formatETB(metrics.averageOrderValue)}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-4 border border-indigo-100">
              <p className="text-gray-500 text-xs mb-1">Gross Profit Margin</p>
              <p className="text-2xl font-bold text-green-600">{metrics.grossProfitMargin.toFixed(1)}%</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-4 border border-indigo-100">
              <p className="text-gray-500 text-xs mb-1">Items Sold</p>
              <p className="text-2xl font-bold text-gray-800">{metrics.totalItemsSold}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-4 border border-indigo-100">
              <p className="text-gray-500 text-xs mb-1">Potential Profit</p>
              <p className="text-2xl font-bold text-indigo-600">{formatETB(metrics.potentialProfit)}</p>
            </div>
          </div>

          {/* Daily Averages */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-indigo-50 rounded-xl p-4">
              <p className="text-indigo-600 text-sm mb-1">Daily Avg Revenue</p>
              <p className="text-xl font-bold text-indigo-800">{formatETB(metrics.dailyAverageRevenue)}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-green-600 text-sm mb-1">Daily Avg Profit</p>
              <p className="text-xl font-bold text-green-800">{formatETB(metrics.dailyAverageProfit)}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4">
              <p className="text-orange-600 text-sm mb-1">Daily Avg Expenses</p>
              <p className="text-xl font-bold text-orange-800">{formatETB(metrics.dailyAverageExpenses)}</p>
            </div>
          </div>

          {/* Revenue Trend Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-indigo-100">
            <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip formatter={(value) => formatETB(value)} />
                  <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fillOpacity={1} fill="url(#revenueGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* SALES ANALYSIS TAB */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sales by Day */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-indigo-100">
              <h3 className="text-lg font-semibold mb-4">Sales by Day</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip formatter={(value) => formatETB(value)} />
                    <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Profit Distribution */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-indigo-100">
              <h3 className="text-lg font-semibold mb-4">Profit vs Revenue</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip formatter={(value) => formatETB(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} />
                    <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Sales Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <p className="text-gray-500 text-sm">Total Sales</p>
              <p className="text-2xl font-bold">{metrics.totalSalesCount}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4">
              <p className="text-gray-500 text-sm">Items Sold</p>
              <p className="text-2xl font-bold">{metrics.totalItemsSold}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4">
              <p className="text-gray-500 text-sm">Avg Order Value</p>
              <p className="text-2xl font-bold">{formatETB(metrics.averageOrderValue)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4">
              <p className="text-gray-500 text-sm">Revenue/Item</p>
              <p className="text-2xl font-bold">
                {metrics.totalItemsSold > 0 ? formatETB(metrics.totalRevenue / metrics.totalItemsSold) : '0 ETB'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inventory Value */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Inventory Value Breakdown</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Cost Value</span>
                    <span className="font-medium">{formatETB(metrics.totalInventoryValue)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Retail Value</span>
                    <span className="font-medium">{formatETB(metrics.totalRetailValue)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: `${(metrics.totalRetailValue / metrics.totalRetailValue) * 100}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Potential Profit</span>
                    <span className="font-medium text-green-600">{formatETB(metrics.potentialProfit)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: `${(metrics.potentialProfit / metrics.totalRetailValue) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stock Health */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Stock Health</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Products</span>
                  <span className="font-bold text-2xl">{metrics.products.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Low Stock Items</span>
                  <span className="font-bold text-2xl text-red-600">{metrics.lowStockCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Healthy Stock</span>
                  <span className="font-bold text-2xl text-green-600">{metrics.products.length - metrics.lowStockCount}</span>
                </div>
              </div>
              
              {/* Stock Distribution Pie */}
              <div className="h-48 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Healthy Stock', value: metrics.products.length - metrics.lowStockCount },
                        { name: 'Low Stock', value: metrics.lowStockCount }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Purchases Summary */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Inventory Movements</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-indigo-50 p-4 rounded-xl">
                <p className="text-indigo-600 text-sm">Total Purchases</p>
                <p className="text-2xl font-bold text-indigo-800">{formatETB(metrics.totalPurchases)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-xl">
                <p className="text-green-600 text-sm">Items Purchased</p>
                <p className="text-2xl font-bold text-green-800">{metrics.totalItemsPurchased}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl">
                <p className="text-purple-600 text-sm">Avg Cost/Item</p>
                <p className="text-2xl font-bold text-purple-800">
                  {metrics.totalItemsPurchased > 0 
                    ? formatETB(metrics.totalPurchases / metrics.totalItemsPurchased)
                    : '0 ETB'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXPENSES TAB */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Expenses by Category */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Expenses by Category</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(metrics.expensesByCategory).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {Object.keys(metrics.expensesByCategory).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatETB(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expense Trends */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Expense vs Revenue</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip formatter={(value) => formatETB(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} />
                    <Line type="monotone" dataKey="expenses" stroke="#f59e0b" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Expense Summary */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Expense Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-red-50 p-4 rounded-xl">
                <p className="text-red-600 text-sm">Total Expenses</p>
                <p className="text-2xl font-bold text-red-800">{formatETB(metrics.totalExpenses)}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-xl">
                <p className="text-orange-600 text-sm">Expense Ratio</p>
                <p className="text-2xl font-bold text-orange-800">{metrics.expenseRatio.toFixed(1)}%</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-xl">
                <p className="text-yellow-600 text-sm">Daily Avg</p>
                <p className="text-2xl font-bold text-yellow-800">{formatETB(metrics.dailyAverageExpenses)}</p>
              </div>
            </div>

            {/* Expense Categories List */}
            <div className="mt-6">
              <h4 className="font-medium mb-3">Category Breakdown</h4>
              <div className="space-y-2">
                {Object.entries(metrics.expensesByCategory).map(([category, amount]) => (
                  <div key={category} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span>{category}</span>
                    <span className="font-medium text-red-600">{formatETB(amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Top Products */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Top Revenue Products</h3>
              <div className="space-y-4">
                {metrics.topProducts.map((product, index) => (
                  <div key={product.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{product.name}</span>
                      <span className="text-indigo-600">{formatETB(product.revenue)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full" 
                        style={{ width: `${(product.revenue / metrics.topProducts[0].revenue) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{product.quantity} sold</span>
                      <span>Profit: {formatETB(product.profit)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Top Selling Products</h3>
              <div className="space-y-4">
                {metrics.topSellingProducts.map((product, index) => (
                  <div key={product.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{product.name}</span>
                      <span className="text-green-600">{product.quantity} units</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${(product.quantity / metrics.topSellingProducts[0].quantity) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Revenue: {formatETB(product.revenue)}</span>
                      <span>Profit: {formatETB(product.profit)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Product Performance Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Product Performance Comparison</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.topProducts.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                  <XAxis type="number" stroke="#6b7280" />
                  <YAxis type="category" dataKey="name" stroke="#6b7280" width={100} />
                  <Tooltip formatter={(value) => formatETB(value)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="profit" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Product Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <p className="text-gray-500 text-sm">Total Products</p>
              <p className="text-2xl font-bold">{metrics.products.length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4">
              <p className="text-gray-500 text-sm">Avg Product Price</p>
              <p className="text-2xl font-bold">
                {metrics.products.length > 0 
                  ? formatETB(metrics.products.reduce((sum, p) => sum + p.selling_price, 0) / metrics.products.length)
                  : '0 ETB'}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4">
              <p className="text-gray-500 text-sm">Avg Profit Margin</p>
              <p className="text-2xl font-bold text-green-600">
                {metrics.products.length > 0
                  ? (metrics.products.reduce((sum, p) => 
                      sum + ((p.selling_price - p.cost_price) / p.cost_price * 100), 0) / metrics.products.length
                    ).toFixed(1) + '%'
                  : '0%'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}