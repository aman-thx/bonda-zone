
/* eslint-disable */
import React, { createContext, useContext, useState, useEffect } from 'react'

const LanguageContext = createContext()

export const languages = {
  en: {
    name: 'English',
    flag: '🇬🇧',
    dir: 'ltr'
  },
  am: {
    name: 'አማርኛ',
    flag: '🇪🇹',
    dir: 'ltr'
  }
}

export const translations = {
  en: {
    // Common
    'app.name': 'BONDA ZONE',
    'app.tagline': 'Male Clothing Store Management System',
    'loading': 'Loading...',
    'sign.out': 'Sign Out',
    'exit': 'Exit',
    'cancel': 'Cancel',
    'confirm': 'Confirm',
    'delete': 'Delete',
    'edit': 'Edit',
    'add': 'Add',
    'save': 'Save',
    'close': 'Close',
    'back': 'Back',
    'total': 'Total',
    'actions': 'Actions',
    'status': 'Status',
    'date': 'Date',
    'time': 'Time',
    
    // Login Page
    'login.welcome': 'Welcome Back',
    'login.subtitle': 'Sign in to access your dashboard',
    'login.email': 'Email Address',
    'login.password': 'Password',
    'login.forgot': 'Forgot Password?',
    'login.button': 'Sign In',
    'login.signing': 'Signing in...',
    'login.error.title': 'Authentication Error',
    'login.secured': 'Secured by Supabase Authentication',
    'login.email.placeholder': 'owner@bondazone.com',
    'login.password.placeholder': 'Enter your password',
    
    // Dashboard
    'dashboard.owner': 'Owner Dashboard',
    'dashboard.cashier': 'Cashier Dashboard',
    'dashboard.overview': 'Dashboard Overview',
    'dashboard.welcome': 'Welcome back',
    'dashboard.today': 'Today\'s Revenue',
    'dashboard.transactions': 'transactions',
    'dashboard.total.revenue': 'Total Revenue',
    'dashboard.total.profit': 'Total Profit',
    'dashboard.net.profit': 'Net Profit',
    'dashboard.low.stock': 'Low Stock',
    'dashboard.products': 'Products',
    'dashboard.expenses': 'Expenses',
    'dashboard.sales': 'Sales',
    'dashboard.analytics': 'Analytics',
    
    // Tabs
    'tab.dashboard': 'Dashboard',
    'tab.products': 'Products',
    'tab.expenses': 'Expenses',
    'tab.sales': 'Sales',
    'tab.analytics': 'Analytics',
    
    // Products
    'products.manage': 'Manage your inventory',
    'products.add': 'Add Product',
    'products.edit': 'Edit Product',
    'products.name': 'Product Name',
    'products.cost': 'Cost Price',
    'products.price': 'Selling Price',
    'products.quantity': 'Quantity',
    'products.threshold': 'Min Threshold',
    'products.stock': 'Stock',
    'products.low': 'Low Stock',
    'products.in': 'In Stock',
    'products.profit.margin': 'Profit Margin',
    'products.delete.warning': 'Products with sales history cannot be deleted.',
    
    // Expenses
    'expenses.manage': 'Track your spending',
    'expenses.add': 'Add Expense',
    'expenses.title': 'Title',
    'expenses.amount': 'Amount',
    'expenses.category': 'Category',
    'expenses.description': 'Description',
    'expenses.total': 'Total Expenses',
    'expenses.categories': {
      'Rent': 'Rent',
      'Salary': 'Salary',
      'Utilities': 'Utilities',
      'Maintenance': 'Maintenance',
      'Marketing': 'Marketing',
      'Other': 'Other'
    },
    
    // Sales
    'sales.history': 'Sales History',
    'sales.view': 'View and manage all transactions',
    'sales.total': 'Total Sales',
    'sales.avg': 'Avg Order',
    'sales.items': 'items',
    'sales.delete.warning': 'This will restore {quantity} items back to stock.',
    
    // Analytics
    'analytics.title': 'Business insights and performance metrics',
    'analytics.revenue.vs.profit': 'Revenue vs Profit',
    'analytics.key.metrics': 'Key Metrics',
    'analytics.profit.margin': 'Profit Margin',
    'analytics.products.total': 'Products',
    'analytics.sales.total': 'Sales',
    'analytics.expenses.total': 'Expenses',
    'analytics.net.profit': 'Net Profit',
    
    // Notifications
    'notifications.title': 'Notifications',
    'notifications.unread': 'unread',
    'notifications.total': 'total',
    'notifications.empty': 'No notifications yet',
    'notifications.mark.read': 'Mark read',
    'notifications.mark.all': 'Mark all read',
    'notifications.delete': 'Delete',
    
    // Alerts
    'alert.success': 'Success',
    'alert.error': 'Error',
    'alert.confirm': 'Confirm',
    'alert.delete.transaction': 'Delete Transaction',
    'alert.delete.product': 'Delete Product',
    'alert.delete.expense': 'Delete Expense',
    
    // Time periods
    'period.today': 'Today',
    'period.week': 'This Week',
    'period.month': 'This Month',
    'period.year': 'This Year',
    'period.all': 'All Time',
    'period.custom': 'Custom',
    
    // Messages
    'message.transaction.deleted': 'Transaction deleted successfully',
    'message.product.deleted': 'Product deleted successfully',
    'message.expense.deleted': 'Expense deleted successfully',
    'message.product.updated': 'Product updated successfully',
    'message.product.added': 'Product added successfully',
    'message.expense.added': 'Expense added successfully',
    'message.sale.completed': 'Sale completed successfully',
    
    // Footer
    'footer.copyright': 'All rights reserved',
    'footer.secured': 'Secured by Supabase Authentication'
  },
  am: {
    // Common
    'app.name': 'ቦንዳ ዞን',
    'app.tagline': 'የወንዶች ልብስ መሸጫ መደብር አስተዳደር ሥርዓት',
    'loading': 'በመጫን ላይ...',
    'sign.out': 'ውጣ',
    'exit': 'ውጣ',
    'cancel': 'ሰርዝ',
    'confirm': 'አረጋግጥ',
    'delete': 'ሰርዝ',
    'edit': 'አስተካክል',
    'add': 'ጨምር',
    'save': 'አስቀምጥ',
    'close': 'ዝጋ',
    'back': 'ተመለስ',
    'total': 'ጠቅላላ',
    'actions': 'ድርጊቶች',
    'status': 'ሁኔታ',
    'date': 'ቀን',
    'time': 'ሰዓት',
    
    // Login Page
    'login.welcome': 'እንኳን በደህና መጡ',
    'login.subtitle': 'ዳሽቦርድዎን ለመድረስ ይግቡ',
    'login.email': 'ኢሜይል አድራሻ',
    'login.password': 'የይለፍ ቃል',
    'login.forgot': 'የይለፍ ቃል ረሱ?',
    'login.button': 'ግባ',
    'login.signing': 'እየገባ ነው...',
    'login.error.title': 'የማረጋገጫ ስህተት',
    'login.secured': 'በሱፓቤዝ የተጠበቀ',
    'login.email.placeholder': 'ባለቤት@ቦንዳዞን.com',
    'login.password.placeholder': 'የይለፍ ቃልዎን ያስገቡ',
    
    // Dashboard
    'dashboard.owner': 'የባለቤት ዳሽቦርድ',
    'dashboard.cashier': 'የሻጭ ዳሽቦርድ',
    'dashboard.overview': 'ዳሽቦርድ አጠቃላይ እይታ',
    'dashboard.welcome': 'እንኳን በደህና ተመለሱ',
    'dashboard.today': 'የዛሬ ገቢ',
    'dashboard.transactions': 'ግብይቶች',
    'dashboard.total.revenue': 'ጠቅላላ ገቢ',
    'dashboard.total.profit': 'ጠቅላላ ትርፍ',
    'dashboard.net.profit': 'ተጣራ ትርፍ',
    'dashboard.low.stock': 'ዝቅተኛ ክምችት',
    'dashboard.products': 'ምርቶች',
    'dashboard.expenses': 'ወጪዎች',
    'dashboard.sales': 'ሽያጮች',
    'dashboard.analytics': 'ትንታኔ',
    
    // Tabs
    'tab.dashboard': 'ዳሽቦርድ',
    'tab.products': 'ምርቶች',
    'tab.expenses': 'ወጪዎች',
    'tab.sales': 'ሽያጮች',
    'tab.analytics': 'ትንታኔ',
    
    // Products
    'products.manage': 'ክምችትዎን ያስተዳድሩ',
    'products.add': 'ምርት ጨምር',
    'products.edit': 'ምርት አስተካክል',
    'products.name': 'የምርት ስም',
    'products.cost': 'የግዢ ዋጋ',
    'products.price': 'የሽያጭ ዋጋ',
    'products.quantity': 'ብዛት',
    'products.threshold': 'ዝቅተኛ ገደብ',
    'products.stock': 'ክምችት',
    'products.low': 'ዝቅተኛ ክምችት',
    'products.in': 'ክምችት አለ',
    'products.profit.margin': 'ትርፍ ህዳግ',
    'products.delete.warning': 'የሽያጭ ታሪክ ያላቸው ምርቶች መሰረዝ አይችሉም።',
    
    // Expenses
    'expenses.manage': 'ወጪዎችዎን ይከታተሉ',
    'expenses.add': 'ወጪ ጨምር',
    'expenses.title': 'ርዕስ',
    'expenses.amount': 'መጠን',
    'expenses.category': 'ምድብ',
    'expenses.description': 'መግለጫ',
    'expenses.total': 'ጠቅላላ ወጪ',
    'expenses.categories': {
      'Rent': 'ኪራይ',
      'Salary': 'ደመወዝ',
      'Utilities': 'መገልገያዎች',
      'Maintenance': 'ጥገና',
      'Marketing': 'ማስታወቂያ',
      'Other': 'ሌላ'
    },
    
    // Sales
    'sales.history': 'የሽያጭ ታሪክ',
    'sales.view': 'ሁሉንም ግብይቶች ይመልከቱ እና ያስተዳድሩ',
    'sales.total': 'ጠቅላላ ሽያጮች',
    'sales.avg': 'አማካይ ትዕዛዝ',
    'sales.items': 'እቃዎች',
    'sales.delete.warning': 'ይህ {quantity} እቃዎችን ወደ ክምችት ይመልሳል።',
    
    // Analytics
    'analytics.title': 'የንግድ ግንዛቤዎች እና የአፈጻጸም መለኪያዎች',
    'analytics.revenue.vs.profit': 'ገቢ ከትርፍ ጋር',
    'analytics.key.metrics': 'ቁልፍ መለኪያዎች',
    'analytics.profit.margin': 'ትርፍ ህዳግ',
    'analytics.products.total': 'ምርቶች',
    'analytics.sales.total': 'ሽያጮች',
    'analytics.expenses.total': 'ወጪዎች',
    'analytics.net.profit': 'ተጣራ ትርፍ',
    
    // Notifications
    'notifications.title': 'ማሳወቂያዎች',
    'notifications.unread': 'ያልተነበቡ',
    'notifications.total': 'ጠቅላላ',
    'notifications.empty': 'እስካሁን ምንም ማሳወቂያ የለም',
    'notifications.mark.read': 'እንደተነበበ ምልክት አድርግ',
    'notifications.mark.all': 'ሁሉንም እንደተነበበ ምልክት አድርግ',
    'notifications.delete': 'ሰርዝ',
    
    // Alerts
    'alert.success': 'ስኬት',
    'alert.error': 'ስህተት',
    'alert.confirm': 'አረጋግጥ',
    'alert.delete.transaction': 'ግብይት ሰርዝ',
    'alert.delete.product': 'ምርት ሰርዝ',
    'alert.delete.expense': 'ወጪ ሰርዝ',
    
    // Time periods
    'period.today': 'ዛሬ',
    'period.week': 'በዚህ ሳምንት',
    'period.month': 'በዚህ ወር',
    'period.year': 'በዚህ አመት',
    'period.all': 'ሁሉም ጊዜ',
    'period.custom': 'ብጁ',
    
    // Messages
    'message.transaction.deleted': 'ግብይት በተሳካ ሁኔታ ተሰርዟል',
    'message.product.deleted': 'ምርት በተሳካ ሁኔታ ተሰርዟል',
    'message.expense.deleted': 'ወጪ በተሳካ ሁኔታ ተሰርዟል',
    'message.product.updated': 'ምርት በተሳካ ሁኔታ ተዘምኗል',
    'message.product.added': 'ምርት በተሳካ ሁኔታ ተጨምሯል',
    'message.expense.added': 'ወጪ በተሳካ ሁኔታ ተጨምሯል',
    'message.sale.completed': 'ሽያጭ በተሳካ ሁኔታ ተጠናቋል',
    
    // Footer
    'footer.copyright': 'መብቱ በህግ የተጠበቀ ነው',
    'footer.secured': 'በሱፓቤዝ የተጠበቀ'
  }
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language')
    return saved || 'en'
  })

  useEffect(() => {
    localStorage.setItem('language', language)
    document.documentElement.lang = language
    document.documentElement.dir = languages[language].dir
  }, [language])

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'am' : 'en')
  }

  const t = (key, params = {}) => {
    let translation = translations[language][key] || translations.en[key] || key
    
    // Replace parameters
    Object.keys(params).forEach(param => {
      translation = translation.replace(`{${param}}`, params[param])
    })
    
    return translation
  }

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t,
    languages
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}