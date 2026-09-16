import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getAll } from '@/pouchdb'
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
        clearCart
    }
})
