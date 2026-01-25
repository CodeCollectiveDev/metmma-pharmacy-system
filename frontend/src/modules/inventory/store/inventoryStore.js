import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getAll, save, remove } from '@/pouchdb';
import { dataOrchestrator } from '@/services/data/dataOrchestrator';
import { dataService } from '@/services/api/dataService';

export const useInventoryStore = defineStore('inventory', () => {
    const products = ref([]);
    const loading = ref(false);

    // Fetch products using hybrid layer
    async function fetchProducts() {
        loading.value = true;
        try {
            products.value = await dataOrchestrator.fetchCollection('products', dataService.getProducts);
        } catch (error) {
            console.error('Error fetching inventory products:', error);
        } finally {
            loading.value = false;
        }
    }

    // Add product using hybrid layer
    async function addProduct(product) {
        try {
            const res = await dataOrchestrator.saveItem('products', product, dataService.addProduct);
            if (res.ok) {
                await fetchProducts(); // Refresh list
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error adding product:', error);
            return false;
        }
    }

    // Delete product
    async function deleteProduct(product) {
        try {
            const res = await remove('products', product);
            if (res.ok) {
                await fetchProducts(); // Refresh list
                return true;
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            return false;
        }
    }

    // Getters
    const lowStockProducts = computed(() => {
        return products.value.filter(p => p.stock <= (p.minStockLevel || 10));
    });

    const expiredProducts = computed(() => {
        const today = new Date();
        return products.value.filter(p => new Date(p.expiryDate) < today);
    });

    return {
        products,
        loading,
        fetchProducts,
        addProduct,
        deleteProduct,
        lowStockProducts,
        expiredProducts
    };
});
