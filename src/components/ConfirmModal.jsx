import React from 'react'

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Yes, Delete', 
  cancelText = 'Cancel',
  type = 'danger' 
}) {
  if (!isOpen) return null

  const colors = {
    danger: {
      bg: 'bg-red-600',
      hover: 'hover:bg-red-700',
      icon: 'bg-red-100 text-red-600'
    },
    warning: {
      bg: 'bg-yellow-600',
      hover: 'hover:bg-yellow-700',
      icon: 'bg-yellow-100 text-yellow-600'
    },
    info: {
      bg: 'bg-blue-600',
      hover: 'hover:bg-blue-700',
      icon: 'bg-blue-100 text-blue-600'
    }
  }

  const color = colors[type] || colors.danger

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-slideUp">
        <div className="text-center mb-6">
          <div className={`w-16 h-16 ${color.icon} rounded-full flex items-center justify-center text-3xl mx-auto mb-4`}>
            {type === 'danger' ? '⚠️' : type === 'warning' ? '⚠️' : 'ℹ️'}
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
          <p className="text-gray-600 text-sm">{message}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className={`flex-1 ${color.bg} text-white py-3 rounded-xl ${color.hover} transition font-medium`}
          >
            {confirmText}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 transition font-medium"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  )
}