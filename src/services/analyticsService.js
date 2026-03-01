import { supabase } from '../lib/supabase'

export const analyticsService = {
  // Get sales data with time filter
  async getSalesData(period = 'all', startDate = null, endDate = null) {
    let query = supabase
      .from('sales')
      .select(`
        *,
        products (
          name,
          cost_price,
          selling_price
        )
      `)

    if (period === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      query = query.gte('created_at', today.toISOString())
    } else if (period === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      query = query.gte('created_at', weekAgo.toISOString())
    } else if (period === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      query = query.gte('created_at', monthAgo.toISOString())
    } else if (period === 'year') {
      const yearAgo = new Date()
      yearAgo.setFullYear(yearAgo.getFullYear() - 1)
      query = query.gte('created_at', yearAgo.toISOString())
    } else if (period === 'custom' && startDate && endDate) {
      query = query
        .gte('created_at', startDate)
        .lte('created_at', endDate)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  // Get expense data with time filter
  async getExpensesData(period = 'all', startDate = null, endDate = null) {
    let query = supabase.from('expenses').select('*')

    if (period === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      query = query.gte('created_at', today.toISOString())
    } else if (period === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      query = query.gte('created_at', weekAgo.toISOString())
    } else if (period === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      query = query.gte('created_at', monthAgo.toISOString())
    } else if (period === 'year') {
      const yearAgo = new Date()
      yearAgo.setFullYear(yearAgo.getFullYear() - 1)
      query = query.gte('created_at', yearAgo.toISOString())
    } else if (period === 'custom' && startDate && endDate) {
      query = query
        .gte('created_at', startDate)
        .lte('created_at', endDate)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  // Get inventory movements
  async getInventoryMovements(period = 'all') {
    let query = supabase
      .from('inventory_movements')
      .select(`
        *,
        products (
          name,
          cost_price,
          selling_price
        )
      `)
      .order('created_at', { ascending: false })

    if (period === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      query = query.gte('created_at', today.toISOString())
    } else if (period === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      query = query.gte('created_at', weekAgo.toISOString())
    } else if (period === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      query = query.gte('created_at', monthAgo.toISOString())
    } else if (period === 'year') {
      const yearAgo = new Date()
      yearAgo.setFullYear(yearAgo.getFullYear() - 1)
      query = query.gte('created_at', yearAgo.toISOString())
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  // Calculate comprehensive metrics
  async calculateMetrics(period = 'all', startDate = null, endDate = null) {
    try {
      const [sales, expenses, movements, products] = await Promise.all([
        this.getSalesData(period, startDate, endDate),
        this.getExpensesData(period, startDate, endDate),
        this.getInventoryMovements(period),
        supabase.from('products').select('*')
      ])

      const productsList = products.data || []
      const salesList = sales || []
      const expensesList = expenses || []
      const movementsList = movements || []

      // Sales metrics
      const totalRevenue = salesList.reduce((sum, s) => sum + (s.revenue || 0), 0)
      const totalProfit = salesList.reduce((sum, s) => sum + (s.profit || 0), 0)
      const totalSalesCount = salesList.length
      const averageOrderValue = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0
      const totalItemsSold = salesList.reduce((sum, s) => sum + (s.quantity || 0), 0)

      // Expense metrics
      const totalExpenses = expensesList.reduce((sum, e) => sum + (e.amount || 0), 0)
      const expensesByCategory = expensesList.reduce((acc, e) => {
        const cat = e.category || 'Other'
        acc[cat] = (acc[cat] || 0) + e.amount
        return acc
      }, {})

      // Inventory metrics
      const totalInventoryValue = productsList.reduce((sum, p) => sum + (p.cost_price * p.quantity), 0)
      const totalRetailValue = productsList.reduce((sum, p) => sum + (p.selling_price * p.quantity), 0)
      const potentialProfit = totalRetailValue - totalInventoryValue
      const lowStockCount = productsList.filter(p => p.quantity <= p.min_threshold).length
      
      // Purchases (inventory additions)
      const purchases = movementsList.filter(m => m.movement_type === 'purchase')
      const totalPurchases = purchases.reduce((sum, p) => sum + (p.total_cost || 0), 0)
      const totalItemsPurchased = purchases.reduce((sum, p) => sum + (p.quantity || 0), 0)

      // Profitability ratios
      const grossProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
      const netProfit = totalProfit - totalExpenses
      const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
      const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0

      // Daily averages (if period has days)
      let daysInPeriod = 1
      if (period === 'week') daysInPeriod = 7
      else if (period === 'month') daysInPeriod = 30
      else if (period === 'year') daysInPeriod = 365
      
      const dailyAverageRevenue = totalRevenue / daysInPeriod
      const dailyAverageProfit = totalProfit / daysInPeriod
      const dailyAverageExpenses = totalExpenses / daysInPeriod

      // Product performance
      const productPerformance = salesList.reduce((acc, sale) => {
        const productName = sale.products?.name
        if (productName) {
          if (!acc[productName]) {
            acc[productName] = {
              name: productName,
              quantity: 0,
              revenue: 0,
              profit: 0,
              cost: 0
            }
          }
          acc[productName].quantity += sale.quantity
          acc[productName].revenue += sale.revenue
          acc[productName].profit += sale.profit
          acc[productName].cost += sale.revenue - sale.profit
        }
        return acc
      }, {})

      const topProducts = Object.values(productPerformance)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      const topSellingProducts = Object.values(productPerformance)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)

      return {
        // Sales metrics
        totalRevenue,
        totalProfit,
        totalSalesCount,
        averageOrderValue,
        totalItemsSold,
        
        // Expense metrics
        totalExpenses,
        expensesByCategory,
        
        // Inventory metrics
        totalInventoryValue,
        totalRetailValue,
        potentialProfit,
        lowStockCount,
        totalPurchases,
        totalItemsPurchased,
        
        // Profitability metrics
        grossProfitMargin,
        netProfit,
        netProfitMargin,
        expenseRatio,
        
        // Daily averages
        dailyAverageRevenue,
        dailyAverageProfit,
        dailyAverageExpenses,
        
        // Product performance
        topProducts,
        topSellingProducts,
        
        // Raw data
        sales: salesList,
        expenses: expensesList,
        movements: movementsList,
        products: productsList
      }
    } catch (error) {
      console.error('Error calculating metrics:', error)
      throw error
    }
  },

  // Get time series data for charts
  async getTimeSeriesData(period = 'month') {
    let interval
    let format
    
    switch(period) {
      case 'week':
        interval = 'day'
        format = 'EEE'
        break
      case 'month':
        interval = 'day'
        format = 'MMM d'
        break
      case 'year':
        interval = 'month'
        format = 'MMM'
        break
      default:
        interval = 'day'
        format = 'MMM d'
    }

    const { data, error } = await supabase
      .rpc('get_time_series_data', { 
        interval_type: interval,
        date_format: format
      })

    if (error) throw error
    return data
  }
}