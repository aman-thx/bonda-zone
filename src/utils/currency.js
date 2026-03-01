// Utility function to format ETB currency
export const formatETB = (amount) => {
  if (amount === null || amount === undefined) return '0 ETB'
  
  // Convert to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  // Format with commas for thousands
  const formatted = numAmount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')
  
  return `${formatted} ETB`
}