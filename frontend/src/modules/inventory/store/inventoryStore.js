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
                if (res.offline) {
                    const localProduct = {
                        ...product,
                        _id: res.id,
                        syncStatus: 'pending',
                        stock: Number(product.stock ?? product.quantity ?? 0),
                        price: Number(product.price ?? product.sellingPrice ?? product.unitPrice ?? 0)
                    };
                    products.value = [...products.value, localProduct];
                } else {
                    await fetchProducts(); // Refresh list from the server
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error adding product:', error);
            return false;
        }
    }

    // Update product using hybrid layer
    async function updateProduct(product) {
        try {
            const res = await dataOrchestrator.saveItem('products', product, dataService.updateProduct);
            if (res.ok) {
                await fetchProducts();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating product:', error);
            return false;
        }
    }

    // Delete product (attempt API, then local)
    async function deleteProduct(product) {
        try {
            if (window.navigator.onLine) {
                try {
                    await dataService.deleteProduct(product);
                } catch (apiError) {
                    console.warn('API delete failed, removing locally:', apiError);
                }
            }

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

    // Restock product and log movement
    async function restockProduct(product, quantityToAdd, note = '') {
        const qty = Number(quantityToAdd || 0);
        if (Number.isNaN(qty) || qty <= 0) return false;

        const productId = product.id || product._id;
        const now = new Date().toISOString();
        const updated = {
            ...product,
            id: productId,
            stock: Number(product.stock || 0) + qty,
            lastRestockedAt: now,
            lastRestockedQty: qty,
            lastRestockNote: note,
            lowStockIgnored: false,
            restockHistory: [
                ...(product.restockHistory || []),
                { date: now, quantity: qty, note }
            ]
        };

        return await updateProduct(updated);
    }

    // Ignore low stock notifications for a product
    async function ignoreLowStock(product, reason = '') {
        const productId = product.id || product._id;
        const updated = {
            ...product,
            id: productId,
            lowStockIgnored: true,
            lowStockIgnoredAt: new Date().toISOString(),
            lowStockIgnoreReason: reason
        };

        return await updateProduct(updated);
    }

    // Getters
    const lowStockProducts = computed(() => {
        return products.value.filter(
            p => p.stock <= (p.minStockLevel || 10) && !p.lowStockIgnored
        );
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
        updateProduct,
        deleteProduct,
        restockProduct,
        ignoreLowStock,
        lowStockProducts,
        expiredProducts
    };
});
