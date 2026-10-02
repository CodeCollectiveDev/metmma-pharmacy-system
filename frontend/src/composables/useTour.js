import { reactive } from 'vue'
export const tour = reactive({ open: false, index: 0, steps: [] })
const allSteps = [
  { path: '/dashboard', title: 'Your pharmacy overview', description: 'This page shows current stock and recent work. Use the menu on the left to open a tool.', roles: ['admin', 'store_manager', 'pharmacist', 'hr_officer'] },
  { path: '/pos', title: 'Sell items', description: 'Search or scan a product, add it to the cart, choose how the customer pays, then select Complete Sale. A receipt means the sale was saved.', roles: ['admin', 'cashier', 'pharmacist'] },
  { path: '/inventory', title: 'Manage your stock', description: 'Add products with a price, batch and expiry date. Use Add stock when a delivery arrives. Low stock and expiry filters help you find items needing attention.', roles: ['admin', 'store_manager', 'pharmacist'] },
  { path: '/sales', title: 'Find a past sale', description: 'Sales shows receipts and the items sold. Use the dates and receipt search to find one. An administrator can reverse a sale with a reason.', roles: ['admin', 'store_manager', 'pharmacist', 'hr_officer', 'cashier'] },
  { path: null, title: 'Check notifications', description: 'The bell at the top shows how many stock or expiry notices you have not read. Open it to read them and go to the product. Reading a notice does not change stock.', roles: ['admin', 'store_manager', 'pharmacist', 'hr_officer', 'cashier'] },
  { path: '/finances', title: 'Track money', description: 'Sales add income automatically. Record money spent as an expense. Choose a period to see income, expenses and the amount left. The list below shows each record.', roles: ['admin', 'store_manager', 'pharmacist', 'hr_officer'] },
  { path: '/help', title: 'Help is always here', description: 'Use Help for short instructions. You can take this tour again or resume it after a break.', roles: ['admin', 'store_manager', 'pharmacist', 'hr_officer', 'cashier'] }
]
function key() { const user = JSON.parse(localStorage.getItem('user') || '{}'); return `mpms:tour:v1:${user.id || user.username || 'unknown'}` }
function save(done = false) { localStorage.setItem(key(), JSON.stringify({ index: tour.index, done })) }
export function startTour(restart = false) {
  const state = JSON.parse(localStorage.getItem(key()) || '{}')
  tour.steps = allSteps.filter(s => s.roles.includes(localStorage.getItem('role')))
  tour.index = restart ? 0 : Math.min(state.index || 0, Math.max(0, tour.steps.length - 1))
  tour.open = true
}
export function autoTour() { if (!localStorage.getItem(key())) startTour() }
export function pauseTour() { save(); tour.open = false }
export function advanceTour(delta) {
  if (tour.index + delta >= tour.steps.length) { save(true); tour.open = false }
  else { tour.index = Math.max(0, tour.index + delta); save() }
}
