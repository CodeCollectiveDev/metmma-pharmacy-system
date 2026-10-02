/**
 * Database Configuration and Initialization
 * Uses LocalForage for offline-first browser storage (IndexedDB with fallbacks)
 */
import localforage from 'localforage';

// Configure LocalForage instances for each collection
const stores = {
    products: localforage.createInstance({ name: 'mpms', storeName: 'products' }),
    users: localforage.createInstance({ name: 'mpms', storeName: 'users' }),
    transactions: localforage.createInstance({ name: 'mpms', storeName: 'transactions' }),
    employees: localforage.createInstance({ name: 'mpms', storeName: 'employees' }),
    attendance: localforage.createInstance({ name: 'mpms', storeName: 'attendance' })
};

/**
 * Get all documents from a collection
 */
export const getAll = async (collection) => {
    try {
        const items = [];
        await stores[collection].iterate((value) => {
            items.push(value);
        });
        return items;
    } catch (error) {
        console.error(`[DB] Error fetching ${collection}:`, error);
        return [];
    }
};

/**
 * Get a single document by ID
 */
export const getById = async (collection, id) => {
    try {
        return await stores[collection].getItem(id);
    } catch (error) {
        console.error(`[DB] Error getting ${id} from ${collection}:`, error);
        return null;
    }
};

/**
 * Save (create or update) a document
 */
export const save = async (collection, doc) => {
    try {
        if (!doc._id) {
            doc._id = `${collection}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        await stores[collection].setItem(doc._id, doc);
        return { ok: true, id: doc._id };
    } catch (error) {
        console.error(`[DB] Error saving to ${collection}:`, error);
        throw error;
    }
};

/**
 * Remove a document
 */
export const remove = async (collection, doc) => {
    try {
        await stores[collection].removeItem(doc._id);
        return { ok: true };
    } catch (error) {
        console.error(`[DB] Error removing from ${collection}:`, error);
        throw error;
    }
};

/**
 * Bulk insert documents (for seeding)
 */
export const bulkDocs = async (collection, docs) => {
    try {
        for (const doc of docs) {
            await stores[collection].setItem(doc._id, doc);
        }
        return { ok: true };
    } catch (error) {
        console.error(`[DB] Error bulk inserting to ${collection}:`, error);
        throw error;
    }
};

/**
 * Clear a collection
 */
export const clearCollection = async (collection) => {
    try {
        await stores[collection].clear();
        return { ok: true };
    } catch (error) {
        console.error(`[DB] Error clearing ${collection}:`, error);
        throw error;
    }
};

export default stores;
