import { getAll, save, remove } from '@/pouchdb';
import { dataService } from '../api/dataService';

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
            await syncWorker.syncCollection('products', dataService.addProduct);
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
     * Sync a specific collection's pending items
     */
    syncCollection: async (collection, apiMethod) => {
        const items = await getAll(collection);
        const pendingItems = items.filter(item => item.syncStatus === 'pending');

        if (pendingItems.length === 0) return;

        console.log(`[SyncWorker] Syncing ${pendingItems.length} items from ${collection}`);

        for (const item of pendingItems) {
            try {
                // Remove local-only properties before sending to API
                const { syncStatus, _id, ...apiPayload } = item;

                const response = await apiMethod(apiPayload);

                // Update local status to synced
                const sale = collection === 'transactions' ? response.data?.data : null;
                const syncedItem = sale ? {
                    ...item,
                    ...sale,
                    items: sale.items.map((line, index) => ({ ...item.items[index], ...line })),
                    _id: String(sale.id),
                    syncStatus: 'synced'
                } : { ...item, syncStatus: 'synced' };
                await save(collection, syncedItem);
                if (syncedItem._id !== item._id) await remove(collection, item);
            } catch (error) {
                console.error(`[SyncWorker] Failed to sync item in ${collection}:`, error);
                // Keep as pending for next cycle
            }
        }
    }
};
