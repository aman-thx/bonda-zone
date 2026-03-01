/* eslint-disable */

import React, { useState, useEffect, useRef } from 'react'
import { notificationService } from '../services/notificationService'
import { formatETB } from '../utils/currency'
import { formatDistanceToNow } from 'date-fns'

export default function NotificationCenter({ userId }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const notificationRef = useRef(null)

  useEffect(() => {
    if (!userId) return
    fetchNotifications()
    subscribeToNotifications()

    // Click outside to close
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [userId])

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getNotifications(userId)
      setNotifications(data)
      const count = await notificationService.getUnreadCount(userId)
      setUnreadCount(count)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const subscribeToNotifications = () => {
    const subscription = notificationService.subscribeToNotifications(userId, (payload) => {
      setNotifications(prev => [payload.new, ...prev])
      setUnreadCount(prev => prev + 1)
      
      // Show browser notification if supported
      if (Notification.permission === 'granted') {
        new Notification(payload.new.title, {
          body: payload.new.message,
          icon: '/icon.png'
        })
      }
    })

    return () => subscription.unsubscribe()
  }

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId)
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(userId)
      setNotifications(notifications.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleDelete = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId)
      const deleted = notifications.find(n => n.id === notificationId)
      setNotifications(notifications.filter(n => n.id !== notificationId))
      if (!deleted?.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission()
    }
  }

  // Get icon based on notification type
  const getIcon = (type) => {
    switch(type) {
      case 'low_stock': return '⚠️'
      case 'sale_completed': return '💰'
      default: return '📢'
    }
  }

  // Get color based on notification type
  const getColor = (type) => {
    switch(type) {
      case 'low_stock': return 'bg-red-100 text-red-800'
      case 'sale_completed': return 'bg-green-100 text-green-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  return (
    <div className="relative" ref={notificationRef}>
      {/* Notification Bell */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen && unreadCount > 0) {
            requestNotificationPermission()
          }
        }}
        className="relative p-2 hover:bg-gray-100 rounded-xl transition"
      >
        <span className="text-xl sm:text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-96 bg-white rounded-2xl shadow-2xl border border-indigo-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="p-3 sm:p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm sm:text-base">Notifications</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs bg-white/20 px-2 sm:px-3 py-1 rounded-full hover:bg-white/30 transition"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500">
                <span className="text-3xl sm:text-4xl mb-2 sm:mb-3 block">🔔</span>
                <p className="text-xs sm:text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 sm:p-4 hover:bg-gray-50 transition ${
                      !notification.is_read ? 'bg-indigo-50/50' : ''
                    }`}
                  >
                    <div className="flex gap-2 sm:gap-3">
                      {/* Icon */}
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-lg sm:text-xl ${getColor(notification.type)}`}>
                        {getIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-medium text-xs sm:text-sm truncate">{notification.title}</h4>
                          <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                        
                        {/* Action buttons */}
                        <div className="flex gap-2 mt-2">
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-[10px] sm:text-xs text-indigo-600 hover:text-indigo-800"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="text-[10px] sm:text-xs text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>

                        {/* Additional data */}
                        {notification.type === 'sale_completed' && notification.data && (
                          <div className="mt-2 text-[10px] sm:text-xs bg-green-50 p-2 rounded-lg">
                            <span className="font-medium">Profit: </span>
                            {formatETB(notification.data.profit)}
                          </div>
                        )}
                        
                        {notification.type === 'low_stock' && notification.data && (
                          <div className="mt-2 text-[10px] sm:text-xs bg-red-50 p-2 rounded-lg">
                            <span className="font-medium">Stock: </span>
                            {notification.data.quantity} / {notification.data.threshold}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 sm:p-3 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-[10px] sm:text-xs text-gray-500">
              {unreadCount} unread • {notifications.length} total
            </p>
          </div>
        </div>
      )}
    </div>
  )
}