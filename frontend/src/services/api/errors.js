const messages = {
  LEAVE_OVERLAP: 'This employee already has pending or approved leave covering these dates.',
  BARCODE_AMBIGUOUS: 'More than one product matches this barcode. Search by name and select the correct batch.',
  PAYMENT_AMOUNT: 'Cash received must cover the total. For other payment methods, enter the exact total received.',
  VALIDATION: 'Please check the highlighted fields and try again.',
  OFFLINE: 'You are offline. Check your connection, then try again.',
  NETWORK: 'We could not reach the pharmacy system. Check your connection and try again.',
  SESSION_EXPIRED: 'Please sign in again to continue. Your work is still here.',
  INVALID_CREDENTIALS: 'The username or password is incorrect. Please try again.',
  CURRENT_PASSWORD_INVALID: 'Your current password is incorrect. Please try again.',
  PASSWORD_REUSE: 'Your new password must be different from your current password.',
  PERMISSION_DENIED: 'Your account cannot do this. Please ask your administrator for help.',
  NOT_FOUND: 'This item is no longer available. Refresh the list and try again.',
  INSUFFICIENT_STOCK: 'There is not enough stock for this sale. Check the quantities and try again.',
  PRODUCT_UNAVAILABLE: 'An item in your cart is expired or no longer available. Remove it and try again.',
  PRICE_CHANGED: 'A price changed. Check the refreshed prices before trying again.',
  CONFLICT: 'This record changed or already exists. Refresh the list and try again.',
  CHECKOUT_KEY_CONFLICT: 'This checkout has already been used for a different cart. Check Sales before continuing.',
  RATE_LIMITED: 'Please wait a moment, then try again.',
  UNEXPECTED: 'We could not complete this action. Please try again. If it keeps happening, ask your administrator for help.'
}
const statusCodes = { 400: 'VALIDATION', 401: 'SESSION_EXPIRED', 403: 'PERMISSION_DENIED', 404: 'NOT_FOUND', 409: 'CONFLICT', 429: 'RATE_LIMITED' }
export function userError(error) {
  if (error?.friendly) return error
  const data = error?.response?.data
  const code = messages[data?.code] ? data.code : (error?.response ? statusCodes[error.response.status] || 'UNEXPECTED' : error?.request ? (navigator.onLine ? 'NETWORK' : 'OFFLINE') : 'UNEXPECTED')
  const fields = Array.isArray(data?.errors) ? data.errors.filter(e => typeof e.field === 'string').map(e => ({ field: e.field, message: 'Please check this value.' })) : []
  const requestId = typeof data?.requestId === 'string' && /^[a-f0-9-]{36}$/.test(data.requestId) ? data.requestId : undefined
  return { friendly: true, code, message: messages[code], fields, requestId, retryable: ['NETWORK', 'OFFLINE', 'UNEXPECTED', 'RATE_LIMITED'].includes(code) }
}
export function localError(code) { return { friendly: true, code, message: messages[code] || messages.UNEXPECTED, fields: [] } }
