/* eslint-disable */

import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatETB } from '../utils/currency'
import LanguageToggle from '../components/LanguageToggle'

export default function CashierDashboard() {
  const { user, signOut } = useAuth()
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  
  // Data states
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [transactionDetails, setTransactionDetails] = useState([])
  
  // Cart state
  const [cart, setCart] = useState([])
  
  // Editing state
  const [editingItem, setEditingItem] = useState(null)
  const [editQuantity, setEditQuantity] = useState(1)
  const [editPrice, setEditPrice] = useState(0)
  
  // UI states
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCart, setShowCart] = useState(false)
  
  // Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  
  // Mobile state
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
    fetchProducts()
    fetchRecentTransactions()

    // Subscribe to real-time updates
    const salesSubscription = supabase
      .channel('sales-changes')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'sales' }, 
          () => {
            fetchRecentTransactions()
            fetchProducts()
          })
      .subscribe()

    const productsSubscription = supabase
      .channel('products-changes')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'products' }, 
          fetchProducts)
      .subscribe()

    return () => {
      salesSubscription.unsubscribe()
      productsSubscription.unsubscribe()
    }
  }, [user])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name')
      
      if (!error) {
        setProducts(data || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          products (name)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!error && data) {
        // Group sales that happened within 2 seconds of each other
        const grouped = []
        const processed = new Set()

        data.forEach((sale, index) => {
          if (processed.has(sale.id)) return

          const transactionTime = new Date(sale.created_at).getTime()
          const relatedSales = data.filter((s, i) => {
            if (i <= index || processed.has(s.id)) return false
            const otherTime = new Date(s.created_at).getTime()
            return Math.abs(otherTime - transactionTime) < 2000
          })

          const allSalesInGroup = [sale, ...relatedSales]
          allSalesInGroup.forEach(s => processed.add(s.id))

          const totalAmount = allSalesInGroup.reduce((sum, s) => sum + s.revenue, 0)
          const itemCount = allSalesInGroup.reduce((sum, s) => sum + s.quantity, 0)

          grouped.push({
            id: `trans-${Date.now()}-${index}`,
            timestamp: sale.created_at,
            totalAmount,
            itemCount,
            sales: allSalesInGroup
          })
        })

        setRecentTransactions(grouped.slice(0, 10))
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const fetchTransactionDetails = (transaction) => {
    setSelectedTransaction(transaction)
    setTransactionDetails(transaction.sales)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product.id === product.id)
    
    if (existingItem) {
      if (existingItem.quantity + 1 > product.quantity) {
        setError(t('products.low'))
        setTimeout(() => setError(''), 3000)
        return
      }
      
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
      setSuccess(`${product.name} +1`)
    } else {
      setCart([...cart, {
        product: product,
        quantity: 1,
        price: product.selling_price
      }])
      setSuccess(`${product.name} ${t('add')}`)
    }
    
    setTimeout(() => setSuccess(''), 2000)
  }

  const startEditing = (item) => {
    setEditingItem(item)
    setEditQuantity(item.quantity)
    setEditPrice(item.price)
  }

  const saveEdit = () => {
    if (!editingItem) return

    if (editQuantity > editingItem.product.quantity) {
      setError(t('products.low'))
      return
    }

    if (editPrice < editingItem.product.selling_price) {
      setError(`Min ${formatETB(editingItem.product.selling_price)}`)
      return
    }

    setCart(cart.map(item => 
      item.product.id === editingItem.product.id
        ? { ...item, quantity: editQuantity, price: editPrice }
        : item
    ))

    setEditingItem(null)
    setSuccess(t('save'))
    setTimeout(() => setSuccess(''), 2000)
  }

  const cancelEdit = () => {
    setEditingItem(null)
  }

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product.id !== productId))
    if (editingItem?.product.id === productId) {
      setEditingItem(null)
    }
    setSuccess(t('delete'))
    setTimeout(() => setSuccess(''), 2000)
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  const confirmSale = () => {
    if (cart.length === 0) {
      setError(t('cart.empty'))
      setTimeout(() => setError(''), 3000)
      return
    }
    setShowConfirmModal(true)
  }

  const handleCompleteSale = async () => {
    setShowConfirmModal(false)
    
    try {
      for (const item of cart) {
        const revenue = item.price * item.quantity
        const profit = (item.price - item.product.cost_price) * item.quantity

        const { error } = await supabase
          .from('sales')
          .insert([{
            product_id: item.product.id,
            quantity: item.quantity,
            revenue: revenue,
            profit: profit,
            cashier_id: user.id
          }])

        if (error) throw error
      }

      const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
      setSuccess(t('message.sale.completed'))
      setCart([])
      setShowCart(false)
      fetchProducts()
      fetchRecentTransactions()
    } catch (error) {
      setError(t('alert.error') + ': ' + error.message)
    }
    setTimeout(() => setSuccess(''), 3000)
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">👕</span>
            </div>
          </div>
          <p className="text-gray-600 font-medium text-sm">{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-20">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 rounded-xl">
                <span className="text-xl">👕</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-indigo-600">{t('app.name')}</h1>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                  {t('dashboard.cashier')}: {user?.email?.split('@')[0]}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Language Toggle */}
              <LanguageToggle />
              
              {/* Cart Button - Mobile */}
              {isMobile && (
                <button
                  onClick={() => setShowCart(!showCart)}
                  className="relative p-2 bg-indigo-50 rounded-xl"
                >
                  <span className="text-xl">🛒</span>
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {cart.length}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium"
              >
                {t('exit')}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-3">
            <input
              type="text"
              placeholder={`🔍 ${t('products.name')}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4">
        {/* Messages */}
        {error && (
          <div className="mb-3 p-3 bg-red-100 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 p-3 bg-green-100 text-green-700 rounded-xl text-sm">
            {success}
          </div>
        )}

        {/* Mobile View - Toggle between Products and Cart */}
        {isMobile ? (
          <>
            {/* Products Grid */}
            {showCart ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold">🛒 {t('cart')} ({cart.length})</h2>
                  <button
                    onClick={() => setShowCart(false)}
                    className="text-indigo-600 text-sm"
                  >
                    ← {t('back')}
                  </button>
                </div>

                {/* Cart Items */}
                {cart.length > 0 ? (
                  <div className="space-y-3">
                    {cart.map((item, index) => (
                      <div key={index} className="bg-white rounded-xl p-3 shadow">
                        {editingItem?.product.id === item.product.id ? (
                          // Edit Mode
                          <div className="space-y-2">
                            <h3 className="font-medium">{item.product.name}</h3>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="1"
                                max={item.product.quantity}
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                placeholder={t('products.quantity')}
                              />
                              <input
                                type="number"
                                min={item.product.selling_price}
                                step="0.01"
                                value={editPrice}
                                onChange={(e) => setEditPrice(parseFloat(e.target.value))}
                                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                placeholder={t('products.price')}
                              />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={saveEdit} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm">{t('save')}</button>
                              <button onClick={cancelEdit} className="flex-1 bg-gray-200 py-2 rounded-lg text-sm">{t('cancel')}</button>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <div>
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-medium">{item.product.name}</h3>
                                <p className="text-xs text-gray-500">{item.quantity} x {formatETB(item.price)}</p>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => startEditing(item)} className="text-blue-600 px-2">{t('edit')}</button>
                                <button onClick={() => removeFromCart(item.product.id)} className="text-red-600 px-2">{t('delete')}</button>
                              </div>
                            </div>
                            <div className="mt-2 text-right">
                              <span className="font-bold text-indigo-600">{formatETB(item.price * item.quantity)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Cart Total */}
                    <div className="bg-indigo-50 p-4 rounded-xl">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{t('total')}:</span>
                        <span className="text-xl font-bold text-indigo-600">{formatETB(cartTotal)}</span>
                      </div>
                      <button
                        onClick={confirmSale}
                        className="w-full mt-3 bg-green-600 text-white py-3 rounded-xl font-medium"
                      >
                        {t('confirm')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl">
                    <p className="text-gray-500">{t('cart.empty')}</p>
                    <button
                      onClick={() => setShowCart(false)}
                      className="mt-3 text-indigo-600 text-sm"
                    >
                      {t('products.name')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-bold">📦 {t('products.name')}</h2>
                  <button
                    onClick={() => setShowCart(true)}
                    className="relative px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm"
                  >
                    {t('cart')} ({cart.length})
                  </button>
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="bg-white p-3 rounded-xl shadow text-left hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                          product.quantity > 10 
                            ? 'bg-green-100 text-green-800'
                            : product.quantity > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.quantity}
                        </span>
                      </div>
                      <p className="text-indigo-600 font-bold text-base">{formatETB(product.selling_price)}</p>
                      <p className="text-xs text-gray-400 mt-1">{t('add')}</p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          /* Desktop View */
          <div className="grid grid-cols-3 gap-6">
            {/* Products List */}
            <div className="col-span-2">
              <div className="bg-white rounded-xl p-4">
                <h2 className="text-lg font-bold mb-4">{t('products.name')}</h2>
                <div className="grid grid-cols-2 gap-4">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="p-4 border rounded-xl text-left hover:border-indigo-500 transition"
                    >
                      <div className="flex justify-between">
                        <h3 className="font-medium">{product.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          product.quantity > 10 
                            ? 'bg-green-100 text-green-800'
                            : product.quantity > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.quantity}
                        </span>
                      </div>
                      <p className="text-indigo-600 font-bold mt-2">{formatETB(product.selling_price)}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cart */}
            <div className="col-span-1">
              <div className="bg-white rounded-xl p-4 sticky top-24">
                <h2 className="text-lg font-bold mb-4">{t('cart')} ({cart.length})</h2>
                
                {cart.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {cart.map((item, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        {editingItem?.product.id === item.product.id ? (
                          <div className="space-y-2">
                            <h3 className="font-medium">{item.product.name}</h3>
                            <input
                              type="number"
                              min="1"
                              max={item.product.quantity}
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                              className="w-full px-2 py-1 border rounded text-sm"
                              placeholder={t('products.quantity')}
                            />
                            <input
                              type="number"
                              min={item.product.selling_price}
                              step="0.01"
                              value={editPrice}
                              onChange={(e) => setEditPrice(parseFloat(e.target.value))}
                              className="w-full px-2 py-1 border rounded text-sm"
                              placeholder={t('products.price')}
                            />
                            <div className="flex gap-2">
                              <button onClick={saveEdit} className="flex-1 bg-green-600 text-white py-1 rounded text-sm">{t('save')}</button>
                              <button onClick={cancelEdit} className="flex-1 bg-gray-200 py-1 rounded text-sm">{t('cancel')}</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex justify-between">
                              <h3 className="font-medium text-sm">{item.product.name}</h3>
                              <div>
                                <button onClick={() => startEditing(item)} className="text-blue-600 px-1">{t('edit')}</button>
                                <button onClick={() => removeFromCart(item.product.id)} className="text-red-600 px-1">{t('delete')}</button>
                              </div>
                            </div>
                            <div className="flex justify-between mt-2 text-sm">
                              <span>{item.quantity} x {formatETB(item.price)}</span>
                              <span className="font-bold text-indigo-600">{formatETB(item.price * item.quantity)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    <div className="border-t pt-3">
                      <div className="flex justify-between font-bold">
                        <span>{t('total')}:</span>
                        <span className="text-indigo-600">{formatETB(cartTotal)}</span>
                      </div>
                      <button
                        onClick={confirmSale}
                        className="w-full mt-3 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                      >
                        {t('confirm')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">{t('cart.empty')}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-3">{t('sales.history')}</h2>
          <div className="bg-white rounded-xl overflow-hidden">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((t) => (
                <div key={t.id} className="p-3 border-b last:border-b-0 hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">
                        {new Date(t.timestamp).toLocaleString(language === 'am' ? 'am-ET' : 'en-US')}
                      </p>
                      <p className="text-sm font-medium mt-1">{t.itemCount} {t('sales.items')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-600 font-bold">{formatETB(t.totalAmount)}</p>
                      <button
                        onClick={() => fetchTransactionDetails(t)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 mt-1"
                      >
                        {t('details')}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p>{t('no.sales')}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 animate-slideUp sm:animate-none">
            <h3 className="text-xl font-bold mb-4">{t('confirm')}</h3>
            <div className="bg-gray-50 p-4 rounded-xl mb-6">
              <div className="flex justify-between mb-2">
                <span>{t('items')}:</span>
                <span className="font-medium">{cart.length}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>{t('total.quantity')}:</span>
                <span className="font-medium">{cart.reduce((sum, i) => sum + i.quantity, 0)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>{t('total')}:</span>
                <span className="text-green-600">{formatETB(cartTotal)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCompleteSale}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl hover:bg-green-700"
              >
                {t('confirm')}
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-gray-200 py-3 rounded-xl hover:bg-gray-300"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 animate-slideUp sm:animate-none max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{t('details')}</h3>
              <button onClick={() => setSelectedTransaction(null)} className="text-2xl">✕</button>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              {new Date(selectedTransaction.timestamp).toLocaleString(language === 'am' ? 'am-ET' : 'en-US')}
            </p>
            
            <div className="space-y-3 mb-6">
              {transactionDetails.map((sale, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-sm">{sale.products?.name}</p>
                    <p className="text-xs text-gray-500">{sale.quantity} x {formatETB(sale.revenue / sale.quantity)}</p>
                  </div>
                  <p className="font-bold text-green-600">{formatETB(sale.revenue)}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedTransaction(null)}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition font-medium"
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}