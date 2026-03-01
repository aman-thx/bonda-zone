import React, { useState } from 'react'

export default function TimeFilter({ onFilterChange, currentPeriod = 'month' }) {
  const [period, setPeriod] = useState(currentPeriod)
  const [showCustom, setShowCustom] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const periods = [
    { id: 'today', label: 'Today', icon: '📅' },
    { id: 'week', label: 'This Week', icon: '📆' },
    { id: 'month', label: 'This Month', icon: '📊' },
    { id: 'year', label: 'This Year', icon: '📈' },
    { id: 'all', label: 'All Time', icon: '∞' },
    { id: 'custom', label: 'Custom', icon: '✏️' }
  ]

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod)
    if (newPeriod === 'custom') {
      setShowCustom(true)
    } else {
      setShowCustom(false)
      onFilterChange({ period: newPeriod })
    }
  }

  const handleCustomSubmit = () => {
    if (startDate && endDate) {
      onFilterChange({
        period: 'custom',
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      })
      setShowCustom(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
      <div className="flex flex-wrap gap-2">
        {periods.map(p => (
          <button
            key={p.id}
            onClick={() => handlePeriodChange(p.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === p.id
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="mr-1">{p.icon}</span>
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom Date Range */}
      {showCustom && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCustomSubmit}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
            >
              Apply Filter
            </button>
            <button
              onClick={() => {
                setShowCustom(false)
                setPeriod('month')
                onFilterChange({ period: 'month' })
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}