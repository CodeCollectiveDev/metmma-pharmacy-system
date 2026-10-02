import { getAll, save, getById, clearCollection, remove } from '@/pouchdb';
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
            status: item.status || 'active',
            startDate: item.startDate || item.hire_date,
            _id: (item.id || item._id)?.toString()
        }));
    }

    if (collection === 'transactions') {
        return items.map((item) => ({
            ...item,
            totalAmount: item.totalAmount ?? item.total_amount ?? item.total,
            // Existing dashboard/report readers still use `total`.
            total: item.totalAmount ?? item.total_amount ?? item.total,
            paymentMethod: item.paymentMethod ?? item.payment_method,
            customerName: item.customerName ?? item.customer_name,
            userId: item.userId ?? item.user_id,
            receiptNumber: item.receiptNumber ?? item.receipt_number,
            date: item.date ?? item.created_at,
            items: item.items?.map(line => ({
                ...line,
                productId: line.productId ?? line.product_id,
                unitPrice: line.unitPrice ?? line.unit_price,
                subtotal: line.subtotal ?? line.total
            })),
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

                // Leave pending sales in place: restoring a snapshot after a
                // concurrent replay could queue an already-confirmed sale again.
                if (collection === 'transactions') {
                    for (const item of await getAll(collection)) {
                        if (item.syncStatus !== 'pending') await remove(collection, item);
                    }
                } else {
                    await clearCollection(collection);
                }
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
                // A rejected checkout is not an offline sale.
                if (collection === 'transactions' && (error.response || !error.request)) throw error;
                console.warn(`[Orchestrator] API save failed for ${collection}, queueing:`, error);
                syncStatus = 'pending';
            }
        } else {
            syncStatus = 'pending';
        }

        // Always update local storage (normalize before saving)
        const serverSale = collection === 'transactions' ? result.data?.data : null;
        const savedItem = serverSale ? {
            ...item,
            ...serverSale,
            items: serverSale.items.map((line, index) => ({ ...item.items[index], ...line }))
        } : item;
        const normalized = normalizeCollectionItems(collection, [savedItem])[0] || savedItem;
        const localItem = { ...normalized, syncStatus };
        const saved = await save(collection, localItem);

        return { ...saved, data: localItem, offline: syncStatus === 'pending' };
    }
};
