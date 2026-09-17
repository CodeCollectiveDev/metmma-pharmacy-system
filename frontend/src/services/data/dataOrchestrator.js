import { getAll, save, getById, clearCollection } from '@/pouchdb';
import { dataService } from '../api/dataService';

/**
 * Checks if the browser has an active internet connection
 */
const isOnline = () => window.navigator.onLine;

/**
 * Hybrid Data Orchestrator
 * Prioritizes backend API but falls back to local storage (LocalForage)
 */
const normalizeCollectionItems = (collection, items) => {
    if (!Array.isArray(items)) return [];

    if (collection === 'products') {
        return items.map((item) => ({
            ...item,
            stock: item.stock ?? item.quantity ?? 0,
            minStockLevel: item.minStockLevel ?? item.reorderLevel ?? 10,
            price: item.price ?? item.sellingPrice ?? item.unitPrice ?? 0,
            productCode: item.productCode ?? item.product_code,
            batchNumber: item.batchNumber ?? item.batch_number,
            expiryDate: item.expiryDate ?? item.expiry_date,
            supplier: item.supplier,
            category: item.category,
            _id: (item.id || item._id || item.product_id || item.productCode || item.product_code)?.toString()
        }));
    }

    if (collection === 'employees') {
        return items.map((item) => ({
            ...item,
            name: item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim(),
            position: item.position || item.role || 'Employee',
            department: item.department || 'General',
            status: item.status || (item.is_active === false ? 'inactive' : 'active'),
            startDate: item.startDate || item.hire_date || null,
            _id: (item.id || item._id)?.toString()
        }));
    }

    if (collection === 'transactions') {
        return items.map((item) => ({
            ...item,
            _id: (item.id || item._id || item.sale_id || item.receipt_number)?.toString()
        }));
    }

    return items.map((item) => ({
        ...item,
        _id: (item.id || item._id)?.toString()
    }));
};

export const dataOrchestrator = {
    /**
     * Fetch all items for a collection
     * Flow: Try API -> Update Local -> Return. If fails: Return Local.
     */
    fetchCollection: async (collection, apiMethod) => {
        if (isOnline()) {
            try {
                const response = await apiMethod();
                const payload = response?.data?.data ?? response?.data ?? [];
                const items = normalizeCollectionItems(collection, payload);

                // Sync local storage with fresh data from server
                await clearCollection(collection);
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

        // Always update local storage (normalize before saving)
        const normalized = normalizeCollectionItems(collection, [item])[0] || item;
        const localItem = { ...normalized, syncStatus };
        const saved = await save(collection, localItem);

        return { ...saved, offline: syncStatus === 'pending' };
    }
};
