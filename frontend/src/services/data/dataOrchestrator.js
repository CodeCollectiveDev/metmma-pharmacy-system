import { getAll, save, getById } from '@/pouchdb';
import { dataService } from '../api/dataService';

/**
 * Checks if the browser has an active internet connection
 */
const isOnline = () => window.navigator.onLine;

/**
 * Hybrid Data Orchestrator
 * Prioritizes backend API but falls back to local storage (LocalForage)
 */
export const dataOrchestrator = {
    /**
     * Fetch all items for a collection
     * Flow: Try API -> Update Local -> Return. If fails: Return Local.
     */
    fetchCollection: async (collection, apiMethod) => {
        if (isOnline()) {
            try {
                const response = await apiMethod();
                const items = response.data;

                // Sync local storage with fresh data from server
                for (const item of items) {
                    const itemId = item.id || item._id;
                    if (itemId) {
                        const formattedItem = { ...item, _id: itemId.toString(), syncStatus: 'synced' };
                        await save(collection, formattedItem);
                    }
                }

                return await getAll(collection); // Return from local to maintain logic consistency
            } catch (error) {
                console.warn(`[Orchestrator] API failed for ${collection}, falling back to local:`, error);
            }
        }
        return await getAll(collection);
    },

    /**
     * Save an item
     * Flow: If online -> API. If fails or offline -> Store local as 'pending'
     */
    saveItem: async (collection, item, apiMethod) => {
        let syncStatus = 'synced';
        let result = { ok: false };

        if (isOnline()) {
            try {
                const response = await apiMethod(item);
                result = { ok: true, data: response.data };
            } catch (error) {
                console.warn(`[Orchestrator] API save failed for ${collection}, queueing:`, error);
                syncStatus = 'pending';
            }
        } else {
            syncStatus = 'pending';
        }

        // Always update local storage
        const localItem = { ...item, syncStatus };
        const saved = await save(collection, localItem);

        return { ...saved, offline: syncStatus === 'pending' };
    }
};
