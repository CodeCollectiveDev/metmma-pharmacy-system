import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { dataService } from '@/services/api/dataService'
import { minor, decimal, normalizeProduct } from '@/services/api/money'
import { localError, userError } from '@/services/api/errors'
export const usePosStore = defineStore('pos', () => {
  const cart = ref([]), products = ref([]), searchQuery = ref(''), selectedCategory = ref('All')
  const loading = ref(false), processing = ref(false), error = ref(null), pending = ref(null), taxBps = ref(1650)
  const productError = ref(null), pagination = ref(null)
  let owner = null, generation = 0
  function storageKey() { return `mpms:cart:v1:${owner}` }
  function restoreCart() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (owner === user.id) return
    owner = user.id
    try { const draft = JSON.parse(localStorage.getItem(storageKey()) || '{}'); cart.value = draft.cart || []; pending.value = draft.pending || null }
    catch { cart.value = []; pending.value = null }
  }
  watch([cart, pending], () => {
    if (owner) { try { localStorage.setItem(storageKey(), JSON.stringify({ cart: cart.value, pending: pending.value })) } catch { error.value = localError('UNEXPECTED') } }
  }, { deep: true, flush: 'sync' })
  const subtotalMinor = computed(() => cart.value.reduce((sum, item) => sum + minor(item.price) * item.quantity, 0))
  const taxMinor = computed(() => Math.floor((subtotalMinor.value * taxBps.value + 5000) / 10000))
  const cartTotal = computed(() => subtotalMinor.value / 100)
  const totalAmount = computed(() => (subtotalMinor.value + taxMinor.value) / 100)
  const filteredProducts = computed(() => products.value)
  const locked = computed(() => processing.value || !!pending.value)
  async function fetchProducts(page = 1) {
    const current = ++generation
    loading.value = true
    try {
      const res = await dataService.getProductPage({ search: searchQuery.value, category: selectedCategory.value === 'All' ? undefined : selectedCategory.value, page, limit: 40 })
      if (current === generation) { products.value = res.data.data.map(normalizeProduct); pagination.value = res.data.pagination; productError.value = null }
    } catch (err) { if (current === generation) { products.value = []; productError.value = err } }
    finally { if (current === generation) loading.value = false }
  }
  async function configure() { restoreCart(); error.value = null; try { taxBps.value = (await dataService.getConfig()).data.taxRateBps; if (cart.value.length && !pending.value) await refreshCart() } catch (err) { error.value = err; throw err } }
  async function refreshCart() {
    if (pending.value) return
    const originalOwner=owner
    await Promise.allSettled(cart.value.map(async item=>{
      try {
        const response=await dataService.getProduct(item.id || item._id)
        if(owner!==originalOwner || !cart.value.includes(item))return
        const product=normalizeProduct(response.data.data)
        Object.assign(item,{price:product.price,stock:product.stock,expired:product.expired,isActive:product.isActive,expiryDate:product.expiryDate})
        item.unavailableReason=product.isActive===false?'inactive':product.expired?'expired':product.expiryDate===null?'missing_expiry':null
      }catch(err){if(owner===originalOwner && userError(err).code==='NOT_FOUND')item.unavailableReason='missing'}
    }))
  }
  function addToCart(product) {
    if (locked.value) return false
    if (product.expired || product.isActive === false || product.expiryDate === null) { error.value = localError('PRODUCT_UNAVAILABLE'); return false }
    if (product.stock <= 0) { error.value = localError('INSUFFICIENT_STOCK'); return false }
    const item = cart.value.find(i => i._id === product._id)
    if (item) { if (item.quantity >= product.stock) { error.value = localError('INSUFFICIENT_STOCK'); return false }; item.quantity++ }
    else cart.value.push({ ...product, quantity: 1 })
    error.value = null
    return true
  }
  function removeFromCart(id) { if (!locked.value) cart.value = cart.value.filter(i => i._id !== id) }
  function updateQuantity(id, change) {
    if (locked.value) return
    const item = cart.value.find(i => i._id === id)
    if (!item) return
    const quantity = item.quantity + change
    if (quantity <= 0) removeFromCart(id)
    else if (quantity > item.stock) error.value = localError('INSUFFICIENT_STOCK')
    else item.quantity = quantity
  }
  function clearCart() { if (!locked.value) cart.value = [] }
  async function scan(code) {
    if (locked.value || !code?.trim()) return false
    try {
      const response = await dataService.getProductPage({ barcode: code.trim(), sellable: true, limit: 2 })
      if (response.data.data.length === 1) { return addToCart(normalizeProduct(response.data.data[0])) }
      error.value = localError(response.data.data.length > 1 ? 'BARCODE_AMBIGUOUS' : 'NOT_FOUND')
    } catch (err) { error.value = err }
    return false
  }
  async function checkout(paymentMethod, customerName = '', amountReceived) {
    if (processing.value || !cart.value.length) return
    processing.value = true; error.value = null
    try {
      if (!pending.value) {
        if (cart.value.some(item=>item.unavailableReason || item.expired || item.isActive===false)) throw localError('PRODUCT_UNAVAILABLE')
        const items = cart.value.map(i => ({ productId: Number(i.id || i._id), quantity: i.quantity, unitPrice: decimal(minor(i.price)), subtotal: decimal(minor(i.price) * i.quantity) }))
        if (items.some(i => !Number.isSafeInteger(i.productId) || i.productId < 1)) throw localError('PRODUCT_UNAVAILABLE')
        if (amountReceived !== undefined) {
          const received = minor(amountReceived), total = subtotalMinor.value + taxMinor.value
          if (received < total || (paymentMethod !== 'cash' && received !== total)) throw localError('PAYMENT_AMOUNT')
        }
        pending.value = { idempotencyKey: crypto.randomUUID(), items, totalAmount: decimal(subtotalMinor.value + taxMinor.value), paymentMethod, customerName, ...(amountReceived !== undefined ? { amountReceived: decimal(minor(amountReceived)) } : {}) }
      }
      // A retry reference must survive a reload before any sale can reach the server.
      try { localStorage.setItem(storageKey(), JSON.stringify({ cart: cart.value, pending: pending.value })) }
      catch { throw localError('UNEXPECTED') }
      const response = await dataService.recordSale(pending.value)
      const transaction = response.data.data
      // Only the confirmed server response clears the cart. No catalogue refresh on the checkout path.
      pending.value = null; cart.value = []
      for (const product of products.value) {
        const line = transaction.items.find(i => i.productId === product.id)
        if (line) product.stock = line.remainingStock
      }
      window.dispatchEvent(new Event('stock-changed'))
      return { transaction, offline: false }
    } catch (err) {
      const safe = userError(err)
      if (['VALIDATION', 'PAYMENT_AMOUNT', 'INSUFFICIENT_STOCK', 'PRICE_CHANGED', 'PRODUCT_UNAVAILABLE', 'PERMISSION_DENIED', 'NOT_FOUND'].includes(safe.code)) pending.value = null
      if (safe.code === 'PRICE_CHANGED') { try { taxBps.value = (await dataService.getConfig()).data.taxRateBps } catch {} }
      if (['PRICE_CHANGED', 'INSUFFICIENT_STOCK', 'PRODUCT_UNAVAILABLE'].includes(safe.code)) await refreshCart()
      if(safe.code==='PRODUCT_UNAVAILABLE'){
        for(const issue of err.response?.data?.unavailableItems || []){
          const item=cart.value.find(i=>Number(i.id || i._id)===issue.productId)
          if(item && ['expired','inactive','missing','missing_expiry'].includes(issue.reason)) {
            item.unavailableReason=issue.reason
            if(issue.expiryDate)item.expiryDate=issue.expiryDate
          }
        }
      }
      error.value = err
      throw err
    } finally { processing.value = false }
  }
  return { productError, pagination, cart, products, searchQuery, selectedCategory, filteredProducts, cartTotal, subtotalMinor, taxMinor, totalAmount, taxBps, loading, processing, error, pending, locked, restoreCart, refreshCart, configure, fetchProducts, addToCart, removeFromCart, updateQuantity, clearCart, scan, checkout }
})
