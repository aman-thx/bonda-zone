/* eslint-disable */

import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatETB } from '../utils/currency'
import NotificationCenter from '../components/NotificationCenter'
import ConfirmModal from '../components/ConfirmModal'
import LanguageToggle from '../components/LanguageToggle'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell
} from 'recharts'
import { formatDistanceToNow } from 'date-fns'

export default function OwnerDashboard() {
  const { user, signOut } = useAuth()
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  
  // Tab state
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Data states
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Delete confirmation states
  const [showTransactionDeleteConfirm, setShowTransactionDeleteConfirm] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState(null)
  const [showProductDeleteConfirm, setShowProductDeleteConfirm] = useState(false)
  const [productToDelete, setProductToDelete] = useState(null)
  const [showExpenseDeleteConfirm, setShowExpenseDeleteConfirm] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState(null)
  
  // Form states
  const [showProductForm, setShowProductForm] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  
  // Form data
  const [productForm, setProductForm] = useState({
    name: '',
    cost_price: '',
    selling_price: '',
    quantity: '',
    min_threshold: '5'
  })
  
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    category: 'Rent',
    description: ''
  })

  // Chart data
  const [revenueData, setRevenueData] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [productPerformanceData, setProductPerformanceData] = useState([])
  const [monthlyData, setMonthlyData] = useState([])

  // Metrics
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalProducts: 0,
    lowStockCount: 0,
    todaySales: 0,
    todayRevenue: 0,
    profitMargin: 0,
    averageTransaction: 0
  })

  // Success/Error messages with dismissible state
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showError, setShowError] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Check if mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!user) return
    fetchAllData()
    fetchNotifications()

    // Subscribe to real-time updates
    const salesSubscription = supabase
      .channel('sales-changes')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'sales' }, 
          () => {
            fetchAllData()
            fetchNotifications()
          })
      .subscribe()

    const productsSubscription = supabase
      .channel('products-changes')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'products' }, 
          fetchAllData)
      .subscribe()

    const expensesSubscription = supabase
      .channel('expenses-changes')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'expenses' }, 
          fetchAllData)
      .subscribe()

    return () => {
      salesSubscription.unsubscribe()
      productsSubscription.unsubscribe()
      expensesSubscription.unsubscribe()
    }
  }, [user])

  const fetchNotifications = async () => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      
      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const processChartData = (productsList, salesList, expensesList) => {
    // Revenue over time (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return d.toISOString().split('T')[0]
    }).reverse()

    const revenueByDay = last7Days.map(date => {
      const daySales = salesList.filter(s => 
        new Date(s.created_at).toISOString().split('T')[0] === date
      )
      return {
        date: new Date(date).toLocaleDateString(language === 'am' ? 'am-ET' : 'en-US', { weekday: isMobile ? 'short' : 'short' }),
        revenue: daySales.reduce((sum, s) => sum + (s.revenue || 0), 0),
        profit: daySales.reduce((sum, s) => sum + (s.profit || 0), 0)
      }
    })
    setRevenueData(revenueByDay)

    // Category distribution
    const categories = expensesList.reduce((acc, exp) => {
      const cat = exp.category || 'Other'
      acc[cat] = (acc[cat] || 0) + exp.amount
      return acc
    }, {})

    setCategoryData(Object.entries(categories).map(([name, value]) => ({
      name: isMobile ? name.substring(0, 3) : t(`expenses.categories.${name}`) || name,
      value
    })))

    // Product performance
    const productSales = salesList.reduce((acc, sale) => {
      const name = sale.products?.name
      if (name) {
        acc[name] = (acc[name] || 0) + sale.quantity
      }
      return acc
    }, {})

    setProductPerformanceData(
      Object.entries(productSales)
        .map(([name, quantity]) => ({ 
          name: isMobile ? name.substring(0, 8) + '...' : name, 
          quantity 
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
    )

    // Monthly data
    const monthly = {}
    salesList.forEach(sale => {
      const month = new Date(sale.created_at).toLocaleDateString(language === 'am' ? 'am-ET' : 'en-US', { month: 'short' })
      if (!monthly[month]) {
        monthly[month] = { month, revenue: 0, profit: 0, count: 0 }
      }
      monthly[month].revenue += sale.revenue || 0
      monthly[month].profit += sale.profit || 0
      monthly[month].count += 1
    })
    setMonthlyData(Object.values(monthly))
  }

  const fetchAllData = async () => {
    try {
      const [productsData, salesData, expensesData] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('sales').select('*, products(name)').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').order('created_at', { ascending: false })
      ])

      const productsList = productsData.data || []
      const salesList = salesData.data || []
      const expensesList = expensesData.data || []

      setProducts(productsList)
      setSales(salesList)
      setExpenses(expensesList)

      // Calculate today's sales
      const today = new Date().toDateString()
      const todaySales = salesList.filter(s => new Date(s.created_at).toDateString() === today)
      const todayRevenue = todaySales.reduce((sum, s) => sum + (s.revenue || 0), 0)

      // Calculate metrics
      const totalRevenue = salesList.reduce((sum, s) => sum + (s.revenue || 0), 0)
      const totalProfit = salesList.reduce((sum, s) => sum + (s.profit || 0), 0)
      const totalExpenses = expensesList.reduce((sum, e) => sum + (e.amount || 0), 0)
      const lowStockCount = productsList.filter(p => p.quantity <= p.min_threshold).length
      const netProfit = totalProfit - totalExpenses
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
      const averageTransaction = salesList.length > 0 ? totalRevenue / salesList.length : 0

      setMetrics({
        totalRevenue,
        totalProfit,
        totalExpenses,
        netProfit,
        totalProducts: productsList.length,
        lowStockCount,
        todaySales: todaySales.length,
        todayRevenue,
        profitMargin,
        averageTransaction
      })

      processChartData(productsList, salesList, expensesList)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  // Handle transaction deletion
  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return

    try {
      const { data, error } = await supabase
        .rpc('delete_sale_and_restore_stock', { sale_id: transactionToDelete.id })

      if (error) throw error

      showSuccessMessage(t('message.transaction.deleted'))
      await fetchAllData()
      await fetchNotifications()
      setShowTransactionDeleteConfirm(false)
      setTransactionToDelete(null)
    } catch (error) {
      showErrorMessage(t('alert.error') + ': ' + error.message)
    }
  }

  // Handle product deletion with sales check
  const handleDeleteProduct = async () => {
    if (!productToDelete) return

    try {
      // First check if product has any sales
      const { count, error: countError } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', productToDelete.id)

      if (countError) throw countError

      // If product has sales, show error and don't delete
      if (count && count > 0) {
        showErrorMessage(t('products.delete.warning'))
        setShowProductDeleteConfirm(false)
        setProductToDelete(null)
        return
      }

      // No sales, safe to delete
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id)

      if (error) throw error

      showSuccessMessage(t('message.product.deleted'))
      await fetchAllData()
      setShowProductDeleteConfirm(false)
      setProductToDelete(null)
    } catch (error) {
      showErrorMessage(t('alert.error') + ': ' + error.message)
    }
  }

  // Handle expense deletion
  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseToDelete.id)

      if (error) throw error

      showSuccessMessage(t('message.expense.deleted'))
      await fetchAllData()
      setShowExpenseDeleteConfirm(false)
      setExpenseToDelete(null)
    } catch (error) {
      showErrorMessage(t('alert.error') + ': ' + error.message)
    }
  }

  // Helper functions for dismissible messages
  const showSuccessMessage = (message) => {
    setSuccess(message)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 5000)
  }

  const showErrorMessage = (message) => {
    setError(message)
    setShowError(true)
    setTimeout(() => setShowError(false), 5000)
  }

  const dismissError = () => {
    setShowError(false)
    setError('')
  }

  const dismissSuccess = () => {
    setShowSuccess(false)
    setSuccess('')
  }

  // Product CRUD
  const handleProductSubmit = async (e) => {
    e.preventDefault()
    try {
      const productData = {
        name: productForm.name,
        cost_price: parseFloat(productForm.cost_price),
        selling_price: parseFloat(productForm.selling_price),
        quantity: parseInt(productForm.quantity),
        min_threshold: parseInt(productForm.min_threshold)
      }

      if (editingProduct) {
        await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)
        showSuccessMessage(t('message.product.updated'))
      } else {
        await supabase
          .from('products')
          .insert([productData])
        showSuccessMessage(t('message.product.added'))
      }

      setShowProductForm(false)
      setEditingProduct(null)
      setProductForm({ name: '', cost_price: '', selling_price: '', quantity: '', min_threshold: '5' })
      await fetchAllData()
    } catch (error) {
      showErrorMessage(t('alert.error') + ': ' + error.message)
    }
  }

  const handleEditProduct = (product) => {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      quantity: product.quantity,
      min_threshold: product.min_threshold
    })
    setShowProductForm(true)
  }

  // Expense CRUD
  const handleExpenseSubmit = async (e) => {
    e.preventDefault()
    try {
      await supabase.from('expenses').insert([{
        title: expenseForm.title,
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category,
        description: expenseForm.description
      }])

      setShowExpenseForm(false)
      setExpenseForm({ title: '', amount: '', category: 'Rent', description: '' })
      showSuccessMessage(t('message.expense.added'))
      await fetchAllData()
    } catch (error) {
      showErrorMessage(t('alert.error') + ': ' + error.message)
    }
  }

  // Colors for charts
  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  const tabs = [
    { id: 'dashboard', label: t('tab.dashboard'), icon: '📊', mobileIcon: '📊' },
    { id: 'products', label: t('tab.products'), icon: '👕', mobileIcon: '👕' },
    { id: 'expenses', label: t('tab.expenses'), icon: '💰', mobileIcon: '💰' },
    { id: 'sales', label: t('tab.sales'), icon: '🛒', mobileIcon: '🛒' },
    { id: 'analytics', label: t('tab.analytics'), icon: '📈', mobileIcon: '📊' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl sm:text-2xl">👕</span>
            </div>
          </div>
          <p className="text-gray-600 font-medium text-sm sm:text-base">{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
      {/* Header with Notification Center and Language Toggle */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-20 border-b border-indigo-100">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg">
                <span className="text-xl sm:text-2xl">👕</span>
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {t('app.name')}
                </h1>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 rounded-full text-xs font-medium">
                    {t('dashboard.owner')}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Language Toggle */}
              <LanguageToggle />
              
              {/* Notification Center */}
              {user && <NotificationCenter userId={user.id} />}
              
              {/* Mobile Menu Button */}
              {isMobile && (
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                >
                  <span className="text-xl">{isMobileMenuOpen ? '✕' : '☰'}</span>
                </button>
              )}
              
              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 sm:px-6 sm:py-2.5 bg-white text-red-600 rounded-xl hover:bg-red-50 transition-all duration-300 font-medium border border-red-200 text-sm sm:text-base"
              >
                {isMobile ? t('exit') : t('sign.out')}
              </button>
            </div>
          </div>

          {/* Mobile Tabs Menu */}
          {isMobile && isMobileMenuOpen && (
            <div className="py-2 border-t border-indigo-100 animate-slideDown">
              <div className="grid grid-cols-5 gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      setIsMobileMenuOpen(false)
                    }}
                    className={`py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                        : 'text-gray-600 hover:bg-indigo-50'
                    }`}
                  >
                    <div className="text-lg mb-1">{tab.mobileIcon}</div>
                    <span className="text-[10px]">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Desktop Tabs */}
      {!isMobile && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-2 border border-indigo-100">
            <nav className="flex space-x-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                      : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Dismissible Success/Error Messages */}
        {showError && error && (
          <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={dismissError}
              className="text-red-700 hover:text-red-900 font-bold text-xl"
            >
              ✕
            </button>
          </div>
        )}
        
        {showSuccess && success && (
          <div className="mb-4 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-lg flex justify-between items-center">
            <span>{success}</span>
            <button
              onClick={dismissSuccess}
              className="text-green-700 hover:text-green-900 font-bold text-xl"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="mt-4 sm:mt-8">
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4 sm:space-y-8">
              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl sm:rounded-3xl shadow-xl p-4 sm:p-8 text-white">
                <h2 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">
                  {t('dashboard.welcome')}, {user?.email?.split('@')[0]}! 👋
                </h2>
                <p className="text-indigo-100 text-sm sm:text-lg">{t('dashboard.overview')}</p>
              </div>

              {/* Metrics Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-6 border border-indigo-100">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="p-2 sm:p-3 bg-green-100 rounded-lg sm:rounded-xl">
                      <span className="text-lg sm:text-2xl">💰</span>
                    </div>
                  </div>
                  <h3 className="text-xs sm:text-sm text-gray-500 mb-1">{t('dashboard.today')}</h3>
                  <p className="text-base sm:text-2xl font-bold text-gray-800 truncate">{formatETB(metrics.todayRevenue)}</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">{metrics.todaySales} {t('dashboard.transactions')}</p>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-6 border border-indigo-100">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="p-2 sm:p-3 bg-blue-100 rounded-lg sm:rounded-xl">
                      <span className="text-lg sm:text-2xl">📊</span>
                    </div>
                  </div>
                  <h3 className="text-xs sm:text-sm text-gray-500 mb-1">{t('dashboard.total.revenue')}</h3>
                  <p className="text-base sm:text-2xl font-bold text-gray-800 truncate">{formatETB(metrics.totalRevenue)}</p>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-6 border border-indigo-100">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="p-2 sm:p-3 bg-purple-100 rounded-lg sm:rounded-xl">
                      <span className="text-lg sm:text-2xl">💎</span>
                    </div>
                  </div>
                  <h3 className="text-xs sm:text-sm text-gray-500 mb-1">{t('dashboard.net.profit')}</h3>
                  <p className="text-base sm:text-2xl font-bold text-gray-800 truncate">{formatETB(metrics.netProfit)}</p>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-6 border border-indigo-100">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="p-2 sm:p-3 bg-yellow-100 rounded-lg sm:rounded-xl">
                      <span className="text-lg sm:text-2xl">⚠️</span>
                    </div>
                  </div>
                  <h3 className="text-xs sm:text-sm text-gray-500 mb-1">{t('dashboard.low.stock')}</h3>
                  <p className="text-base sm:text-2xl font-bold text-gray-800">{metrics.lowStockCount}</p>
                </div>
              </div>

              {/* Recent Notifications Preview */}
              {notifications.length > 0 && (
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-indigo-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm sm:text-lg font-semibold text-gray-800">🔔 {t('notifications.title')}</h3>
                  </div>
                  <div className="space-y-3">
                    {notifications.slice(0, 3).map((notification) => (
                      <div
                        key={notification.id}
                        className={`flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl ${
                          notification.type === 'low_stock' ? 'bg-red-50' : 
                          notification.type === 'sale_deleted' ? 'bg-orange-50' : 
                          'bg-green-50'
                        }`}
                      >
                        <span className="text-lg sm:text-xl">
                          {notification.type === 'low_stock' ? '⚠️' : 
                           notification.type === 'sale_deleted' ? '🗑️' : '💰'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium">
                            {notification.type === 'low_stock' ? t('dashboard.low.stock') : 
                             notification.type === 'sale_deleted' ? t('alert.delete.transaction') : 
                             t('dashboard.sales')}
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-600 mt-1 truncate">
                            {notification.message}
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-indigo-100">
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-800 mb-4">{t('analytics.revenue.vs.profit')}</h3>
                  <div className="h-48 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                        <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: isMobile ? 10 : 12 }} />
                        <YAxis stroke="#6b7280" tick={{ fontSize: isMobile ? 10 : 12 }} />
                        <Tooltip formatter={(value) => formatETB(value)} />
                        <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fillOpacity={1} fill="url(#colorRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-indigo-100">
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-800 mb-4">{t('dashboard.expenses')}</h3>
                  <div className="h-48 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={isMobile ? 40 : 60}
                          outerRadius={isMobile ? 60 : 80}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatETB(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
                <button
                  onClick={() => { setShowProductForm(true); setActiveTab('products'); }}
                  className="group bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white hover:shadow-xl transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-indigo-100 text-xs sm:text-sm mb-1">{t('add')}</p>
                      <h3 className="text-lg sm:text-2xl font-bold mb-1">{t('products.add')}</h3>
                      <p className="text-indigo-200 text-xs sm:text-sm">{t('products.manage')}</p>
                    </div>
                    <div className="text-3xl sm:text-5xl group-hover:rotate-12 transition-transform">➕</div>
                  </div>
                </button>

                <button
                  onClick={() => { setShowExpenseForm(true); setActiveTab('expenses'); }}
                  className="group bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white hover:shadow-xl transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-xs sm:text-sm mb-1">{t('add')}</p>
                      <h3 className="text-lg sm:text-2xl font-bold mb-1">{t('expenses.add')}</h3>
                      <p className="text-orange-200 text-xs sm:text-sm">{t('expenses.manage')}</p>
                    </div>
                    <div className="text-3xl sm:text-5xl group-hover:rotate-12 transition-transform">💰</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('analytics')}
                  className="group bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white hover:shadow-xl transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-xs sm:text-sm mb-1">{t('analytics.title')}</p>
                      <h3 className="text-lg sm:text-2xl font-bold mb-1">{t('tab.analytics')}</h3>
                      <p className="text-purple-200 text-xs sm:text-sm">{t('analytics.title')}</p>
                    </div>
                    <div className="text-3xl sm:text-5xl group-hover:rotate-12 transition-transform">📊</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* PRODUCTS TAB */}
          {activeTab === 'products' && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">{t('dashboard.products')}</h2>
                  <p className="text-sm sm:text-base text-gray-500 mt-1">{t('products.manage')}</p>
                </div>
                <button
                  onClick={() => setShowProductForm(true)}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center justify-center space-x-2 text-sm sm:text-base"
                >
                  <span className="text-lg">➕</span>
                  <span>{t('products.add')}</span>
                </button>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {products.map((product) => (
                  <div key={product.id} className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-indigo-100 hover:shadow-xl transition-all">
                    <div className="h-1.5 sm:h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-4">
                        <h3 className="text-base sm:text-xl font-bold text-gray-800">{product.name}</h3>
                        <span className={`self-start sm:self-auto px-2 py-1 rounded-full text-xs font-medium ${
                          product.quantity <= product.min_threshold
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {product.quantity <= product.min_threshold ? t('products.low') : t('products.in')}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-4 sm:mb-6">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-500">{t('products.cost')}</span>
                          <span className="font-medium text-gray-800">{formatETB(product.cost_price)}</span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-500">{t('products.price')}</span>
                          <span className="font-medium text-indigo-600">{formatETB(product.selling_price)}</span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-500">{t('products.stock')}</span>
                          <span className={`font-medium ${product.quantity <= product.min_threshold ? 'text-red-600' : 'text-gray-800'}`}>
                            {product.quantity} {t('sales.items')}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-500">{t('products.threshold')}</span>
                          <span className="font-medium text-gray-800">{product.min_threshold}</span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-gray-500">{t('products.profit.margin')}</span>
                          <span className="font-medium text-green-600">
                            {product.selling_price > 0 ? (((product.selling_price - product.cost_price) / product.cost_price) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </div>

                      <div className="flex space-x-2 sm:space-x-3">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg sm:rounded-xl hover:bg-indigo-100 transition font-medium text-xs sm:text-sm"
                        >
                          {t('edit')}
                        </button>
                        <button
                          onClick={() => {
                            setProductToDelete(product)
                            setShowProductDeleteConfirm(true)
                          }}
                          className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg sm:rounded-xl hover:bg-red-100 transition font-medium text-xs sm:text-sm"
                        >
                          {t('delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EXPENSES TAB */}
          {activeTab === 'expenses' && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">{t('dashboard.expenses')}</h2>
                  <p className="text-sm sm:text-base text-gray-500 mt-1">{t('expenses.manage')}</p>
                </div>
                <button
                  onClick={() => setShowExpenseForm(true)}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center justify-center space-x-2 text-sm sm:text-base"
                >
                  <span className="text-lg">➕</span>
                  <span>{t('expenses.add')}</span>
                </button>
              </div>

              {/* Summary Card */}
              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white mb-6 sm:mb-8">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-orange-100 text-xs sm:text-sm mb-1">{t('expenses.total')}</p>
                    <p className="text-2xl sm:text-4xl font-bold">{formatETB(metrics.totalExpenses)}</p>
                  </div>
                  <div className="text-4xl sm:text-6xl">💰</div>
                </div>
              </div>

              {/* Expenses Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {expenses.map((expense) => (
                  <div key={expense.id} className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-orange-100 hover:shadow-xl transition-all">
                    <div className="h-1.5 sm:h-2 bg-gradient-to-r from-orange-500 to-red-500"></div>
                    <div className="p-4 sm:p-6">
                      <div className="flex justify-between items-start mb-3 sm:mb-4">
                        <div>
                          <h3 className="text-base sm:text-xl font-bold text-gray-800">{expense.title}</h3>
                          <span className="inline-block mt-1 px-2 py-0.5 sm:px-3 sm:py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                            {t(`expenses.categories.${expense.category}`) || expense.category}
                          </span>
                        </div>
                        <p className="text-lg sm:text-2xl font-bold text-red-600">{formatETB(expense.amount)}</p>
                      </div>
                      
                      <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4">{expense.description || t('expenses.description')}</p>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-gray-500">
                          {new Date(expense.created_at).toLocaleDateString(language === 'am' ? 'am-ET' : 'en-US')}
                        </span>
                        <button
                          onClick={() => {
                            setExpenseToDelete(expense)
                            setShowExpenseDeleteConfirm(true)
                          }}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-50 text-red-600 rounded-lg sm:rounded-xl hover:bg-red-100 transition font-medium text-xs sm:text-sm"
                        >
                          {t('delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SALES TAB */}
          {activeTab === 'sales' && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">{t('sales.history')}</h2>
              <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8">{t('sales.view')}</p>

              {/* Sales Table */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-indigo-100">
                <div className="p-4 sm:p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">{t('dashboard.total.revenue')}</p>
                      <p className="text-sm sm:text-2xl font-bold text-indigo-600 truncate">{formatETB(metrics.totalRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">{t('dashboard.total.profit')}</p>
                      <p className="text-sm sm:text-2xl font-bold text-green-600 truncate">{formatETB(metrics.totalProfit)}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">{t('sales.total')}</p>
                      <p className="text-sm sm:text-2xl font-bold text-gray-800">{sales.length}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">{t('sales.avg')}</p>
                      <p className="text-sm sm:text-2xl font-bold text-purple-600 truncate">{formatETB(metrics.averageTransaction)}</p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('date')} & {t('time')}</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('products.name')}</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('products.quantity')}</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('products.price')}</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('total')}</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('dashboard.total.profit')}</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-gray-50 transition">
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            {new Date(sale.created_at).toLocaleString(language === 'am' ? 'am-ET' : 'en-US')}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                            {sale.products?.name}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            {sale.quantity}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            {formatETB(sale.revenue / sale.quantity)}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-green-600 font-medium">
                            {formatETB(sale.revenue)}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-blue-600 font-medium">
                            {formatETB(sale.profit)}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                            <button
                              onClick={() => {
                                setTransactionToDelete(sale)
                                setShowTransactionDeleteConfirm(true)
                              }}
                              className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition"
                              title={t('delete')}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">{t('tab.analytics')}</h2>
              <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8">{t('analytics.title')}</p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                {/* Revenue vs Profit */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-indigo-100">
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-800 mb-4">{t('analytics.revenue.vs.profit')}</h3>
                  <div className="h-48 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                        <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: isMobile ? 10 : 12 }} />
                        <YAxis stroke="#6b7280" tick={{ fontSize: isMobile ? 10 : 12 }} />
                        <Tooltip formatter={(value) => formatETB(value)} />
                        <Legend />
                        <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} name={t('dashboard.total.revenue')} />
                        <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name={t('dashboard.total.profit')} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-indigo-100">
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-800 mb-4">{t('analytics.key.metrics')}</h3>
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <div className="flex justify-between text-xs sm:text-sm mb-2">
                        <span className="text-gray-600">{t('analytics.profit.margin')}</span>
                        <span className="font-semibold text-indigo-600">{metrics.profitMargin.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${Math.min(metrics.profitMargin, 100)}%` }}></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-4">
                      <div className="bg-indigo-50 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                        <p className="text-xs sm:text-sm text-indigo-600 mb-1">{t('analytics.products.total')}</p>
                        <p className="text-lg sm:text-2xl font-bold text-indigo-800">{metrics.totalProducts}</p>
                      </div>
                      <div className="bg-green-50 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                        <p className="text-xs sm:text-sm text-green-600 mb-1">{t('analytics.sales.total')}</p>
                        <p className="text-lg sm:text-2xl font-bold text-green-800">{sales.length}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-orange-50 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                        <p className="text-xs sm:text-sm text-orange-600 mb-1">{t('analytics.expenses.total')}</p>
                        <p className="text-lg sm:text-2xl font-bold text-orange-800">{formatETB(metrics.totalExpenses)}</p>
                      </div>
                      <div className="bg-purple-50 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                        <p className="text-xs sm:text-sm text-purple-600 mb-1">{t('analytics.net.profit')}</p>
                        <p className="text-lg sm:text-2xl font-bold text-purple-800">{formatETB(metrics.netProfit)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Product Form Modal */}
        {showProductForm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white rounded-t-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-8 shadow-2xl transform transition-all animate-slideUp sm:animate-none">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 sm:p-3 bg-indigo-100 rounded-xl sm:rounded-2xl">
                  <span className="text-xl sm:text-2xl">👕</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{editingProduct ? t('products.edit') : t('products.add')}</h3>
              </div>
              <form onSubmit={handleProductSubmit} className="space-y-3 sm:space-y-4">
                <input 
                  type="text" 
                  placeholder={t('products.name')}
                  value={productForm.name} 
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})} 
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-sm sm:text-base" 
                  required 
                />
                <input 
                  type="number" 
                  placeholder={t('products.cost')}
                  value={productForm.cost_price} 
                  onChange={(e) => setProductForm({...productForm, cost_price: e.target.value})} 
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-sm sm:text-base" 
                  required 
                  min="0" 
                  step="0.01" 
                />
                <input 
                  type="number" 
                  placeholder={t('products.price')}
                  value={productForm.selling_price} 
                  onChange={(e) => setProductForm({...productForm, selling_price: e.target.value})} 
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-sm sm:text-base" 
                  required 
                  min="0" 
                  step="0.01" 
                />
                <input 
                  type="number" 
                  placeholder={t('products.quantity')}
                  value={productForm.quantity} 
                  onChange={(e) => setProductForm({...productForm, quantity: e.target.value})} 
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-sm sm:text-base" 
                  required 
                  min="0" 
                />
                <input 
                  type="number" 
                  placeholder={t('products.threshold')}
                  value={productForm.min_threshold} 
                  onChange={(e) => setProductForm({...productForm, min_threshold: e.target.value})} 
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-sm sm:text-base" 
                  required 
                  min="0" 
                />
                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium"
                  >
                    {editingProduct ? t('save') : t('add')}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setShowProductForm(false); setEditingProduct(null); }} 
                    className="flex-1 bg-gray-100 text-gray-800 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Expense Form Modal */}
        {showExpenseForm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white rounded-t-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-8 shadow-2xl transform transition-all animate-slideUp sm:animate-none">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 sm:p-3 bg-orange-100 rounded-xl sm:rounded-2xl">
                  <span className="text-xl sm:text-2xl">💰</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{t('expenses.add')}</h3>
              </div>
              <form onSubmit={handleExpenseSubmit} className="space-y-3 sm:space-y-4">
                <input 
                  type="text" 
                  placeholder={t('expenses.title')}
                  value={expenseForm.title} 
                  onChange={(e) => setExpenseForm({...expenseForm, title: e.target.value})} 
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-sm sm:text-base" 
                  required 
                />
                <input 
                  type="number" 
                  placeholder={t('expenses.amount')}
                  value={expenseForm.amount} 
                  onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})} 
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-sm sm:text-base" 
                  required 
                  min="0" 
                  step="0.01" 
                />
                <select 
                  value={expenseForm.category} 
                  onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})} 
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-sm sm:text-base"
                >
                  <option value="Rent">{t('expenses.categories.Rent')}</option>
                  <option value="Salary">{t('expenses.categories.Salary')}</option>
                  <option value="Utilities">{t('expenses.categories.Utilities')}</option>
                  <option value="Maintenance">{t('expenses.categories.Maintenance')}</option>
                  <option value="Marketing">{t('expenses.categories.Marketing')}</option>
                  <option value="Other">{t('expenses.categories.Other')}</option>
                </select>
                <textarea 
                  placeholder={t('expenses.description')}
                  value={expenseForm.description} 
                  onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})} 
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-sm sm:text-base" 
                  rows="3" 
                />
                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium"
                  >
                    {t('add')}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowExpenseForm(false)} 
                    className="flex-1 bg-gray-100 text-gray-800 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Transaction Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showTransactionDeleteConfirm}
          onClose={() => {
            setShowTransactionDeleteConfirm(false)
            setTransactionToDelete(null)
          }}
          onConfirm={handleDeleteTransaction}
          title={t('alert.delete.transaction')}
          message={t('sales.delete.warning', { quantity: transactionToDelete?.quantity || 0 })}
          confirmText={t('delete')}
          cancelText={t('cancel')}
          type="danger"
        />

        {/* Product Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showProductDeleteConfirm}
          onClose={() => {
            setShowProductDeleteConfirm(false)
            setProductToDelete(null)
          }}
          onConfirm={handleDeleteProduct}
          title={t('alert.delete.product')}
          message={t('products.delete.warning')}
          confirmText={t('delete')}
          cancelText={t('cancel')}
          type="danger"
        />

        {/* Expense Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showExpenseDeleteConfirm}
          onClose={() => {
            setShowExpenseDeleteConfirm(false)
            setExpenseToDelete(null)
          }}
          onConfirm={handleDeleteExpense}
          title={t('alert.delete.expense')}
          message={`${t('expenses.title')} "${expenseToDelete?.title}" ${t('expenses.amount')} ${formatETB(expenseToDelete?.amount)}?`}
          confirmText={t('delete')}
          cancelText={t('cancel')}
          type="danger"
        />
      </main>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}