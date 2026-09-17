import { getAll, save } from '@/pouchdb';
import { dataService } from '../api/dataService';

const generateLocalSaleId = () => {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }
    return `sale_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

/**
 * Sync Worker
 * Periodically synchronization pending local changes to the backend API.
 */
export const syncWorker = {
    isSyncing: false,

    /**
     * Start the synchronization process
     */
    start: (intervalMs = 30000) => {
        console.log('[SyncWorker] Started');
        setInterval(() => syncWorker.syncAll(), intervalMs);

        // Also sync when coming back online
        window.addEventListener('online', () => {
            console.log('[SyncWorker] Connection restored, triggering sync');
            syncWorker.syncAll();
        });
    },

    /**
     * Sync all pending collections
     */
    syncAll: async () => {
        if (syncWorker.isSyncing || !window.navigator.onLine) return;

        syncWorker.isSyncing = true;
        console.log('[SyncWorker] Synchronization cycle started');

        try {
            await syncWorker.syncProducts();
            await syncWorker.syncCollection('transactions', dataService.recordSale);
            // Add other collections as needed
        } catch (error) {
            console.error('[SyncWorker] Error during sync cycle:', error);
        } finally {
            syncWorker.isSyncing = false;
            console.log('[SyncWorker] Synchronization cycle complete');
        }
    },

    /**
     * Sync pending product changes.
     * Existing products (have a DB id) are updated via PUT /products/:id.
     * Only genuinely new products (no DB id) are created via POST /products.
     * Never use POST to apply stock adjustments — it creates duplicates.
     */
    syncProducts: async () => {
        const items = await getAll('products');
        const pendingItems = items.filter(item => item.syncStatus === 'pending');

        if (pendingItems.length === 0) return;

        console.log(`[SyncWorker] Syncing ${pendingItems.length} products`);

        for (const item of pendingItems) {
            try {
                // Remove local-only properties before sending to API
                const { syncStatus, _id, stock, ...rest } = item;
                const hasDbId = item.id !== undefined && item.id !== null;

                // Normalize to the API contract the backend expects
                const apiPayload = {
                    ...rest,
                    productCode: rest.productCode ?? rest.product_code,
                    quantity: Number(stock ?? rest.quantity ?? 0),
                    reorderLevel: rest.reorderLevel ?? rest.minStockLevel ?? 10,
                    sellingPrice: rest.sellingPrice ?? rest.unitPrice ?? rest.price ?? 0,
                };

                if (hasDbId && apiPayload.productCode) {
                    await dataService.updateProduct({ id: item.id, ...apiPayload });
                } else {
                    await dataService.addProduct(apiPayload);
                }

                // Update local status to synced
                await save('products', { ...item, syncStatus: 'synced' });
            } catch (error) {
                console.error(`[SyncWorker] Failed to sync product ${item.name || item._id}:`, error);
                // Keep as pending for next cycle
            }
        }
    },

    /**
     * Sync a specific collection's pending items
     */
    syncCollection: async (collection, apiMethod) => {
        const items = await getAll(collection);
        const pendingItems = items.filter(item => item.syncStatus === 'pending');

        if (pendingItems.length === 0) return;

        console.log(`[SyncWorker] Syncing ${pendingItems.length} items from ${collection}`);

        for (const item of pendingItems) {
            try {
                const persistedId = item.localSaleId || item.local_sale_id || item.idempotencyKey || item.idempotency_key || generateLocalSaleId();
                const apiPayload = {
                    ...item,
                    localSaleId: persistedId,
                    idempotencyKey: persistedId,
                };

                delete apiPayload.syncStatus;
                delete apiPayload._id;

                await apiMethod(apiPayload);

                // Update local status to synced
                await save(collection, { ...item, localSaleId: persistedId, idempotencyKey: persistedId, syncStatus: 'synced' });
            } catch (error) {
                console.error(`[SyncWorker] Failed to sync item in ${collection}:`, error);
                // Keep as pending for next cycle
            }
        }
    }
};
