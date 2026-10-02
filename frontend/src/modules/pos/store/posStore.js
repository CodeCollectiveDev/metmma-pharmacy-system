import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { save } from '@/pouchdb'
import { dataOrchestrator } from '@/services/data/dataOrchestrator'
import { dataService } from '@/services/api/dataService'

export const usePosStore = defineStore('pos', () => {
    // State
    const cart = ref([])
    const products = ref([])
    const searchQuery = ref('')
    const selectedCategory = ref('All')

    // Fetch products using hybrid layer
    async function fetchProducts() {
        try {
            products.value = await dataOrchestrator.fetchCollection('products', dataService.getProducts)
        } catch (error) {
            console.error('Error fetching products for POS:', error)
        }
    }

    // Getters
    const filteredProducts = computed(() => {
        return products.value.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchQuery.value.toLowerCase())
            const matchesCategory = selectedCategory.value === 'All' || product.category === selectedCategory.value
            return matchesSearch && matchesCategory
        })
    })

    const cartTotal = computed(() => {
        return cart.value.reduce((total, item) => total + (item.price * item.quantity), 0)
    })

    // Actions
    function addToCart(product) {
        // Check if stock is sufficient
        if (product.stock <= 0) {
            alert('Item out of stock!'); // Simple alert for now
            return;
        }

        const existingItem = cart.value.find(item => item._id === product._id)
        if (existingItem) {
            if (existingItem.quantity < product.stock) {
                existingItem.quantity++
            } else {
                alert('Not enough stock!');
            }
        } else {
            cart.value.push({ ...product, quantity: 1 })
        }
    }

    function removeFromCart(productId) {
        cart.value = cart.value.filter(item => item._id !== productId)
    }

    function updateQuantity(productId, change) {
        const item = cart.value.find(item => item._id === productId)
        if (item) {
            // Find original product to check stock limit
            const product = products.value.find(p => p._id === productId);

            const newQuantity = item.quantity + change;

            if (newQuantity <= 0) {
                removeFromCart(productId)
            } else if (product && newQuantity > product.stock) {
                alert('Cannot exceed available stock!');
            } else {
                item.quantity = newQuantity
            }
        }
    }

    function clearCart() {
        cart.value = []
    }

    async function checkout(paymentMethod) {
        if (!cart.value.length) throw new Error('Cart is empty')
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const money = amount => Math.round((amount + Number.EPSILON) * 100) / 100
        const items = cart.value.map(item => {
            const productId = Number(item.id || item._id)
            if (!Number.isSafeInteger(productId) || productId <= 0) {
                throw new Error(`${item.name} must be synchronized before it can be sold`)
            }
            return {
                productId,
                name: item.name,
                batchNumber: item.batchNumber,
                quantity: item.quantity,
                unitPrice: Number(item.price),
                subtotal: money(item.price * item.quantity)
            }
        })
        const subtotal = money(items.reduce((sum, item) => sum + item.subtotal, 0))
        const tax = money(subtotal * 0.165)
        const transaction = {
            _id: `txn_${uuidv4()}`,
            date: new Date().toISOString(),
            items,
            subtotal,
            tax,
            totalAmount: money(subtotal + tax),
            paymentMethod,
            customerName: null,
            userId: user.id,
            cashier: user.name || 'Unknown'
        }
        const result = await dataOrchestrator.saveItem('transactions', transaction, dataService.recordSale)
        if (!result.ok) throw new Error('Sale could not be saved')

        // The checkout endpoint owns persisted stock changes. Offline stock is
        // only a local projection; it must never be replayed as a product write.
        if (result.offline) {
            for (const item of cart.value) {
                const product = products.value.find(p => p._id === item._id)
                if (product) {
                    product.stock -= item.quantity
                    product.quantity = product.stock
                    await save('products', { ...product })
                }
            }
        }
        clearCart()
        if (!result.offline) await fetchProducts()
        return { transaction: result.data, offline: result.offline }
    }

    return {
        cart,
        products,
        searchQuery,
        selectedCategory,
        filteredProducts,
        cartTotal,
        fetchProducts,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        checkout
    }
})
