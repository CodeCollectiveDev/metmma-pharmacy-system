/**
 * Database Seeding Script
 * Populates initial test data for the pharmacy system
 */
import { bulkDocs, getAll } from './index';

const initialUsers = [
    { _id: 'user_admin', name: 'Admin User', email: 'admin@metmma.com', password: 'admin', role: 'admin' },
    { _id: 'user_pharmacist', name: 'Pharmacist Jane', email: 'pharmacist@metmma.com', password: 'pharm', role: 'pharmacist' },
    { _id: 'user_cashier', name: 'Cashier Mike', email: 'cashier@metmma.com', password: 'cashier', role: 'cashier' },
    { _id: 'user_manager', name: 'Manager Steve', email: 'manager@metmma.com', password: 'manager', role: 'store_manager' },
    { _id: 'user_hr', name: 'HR Sarah', email: 'hr@metmma.com', password: 'hr', role: 'hr_officer' }
];

export const seedDatabase = async () => {
    console.log('[Seed] Starting database seeding...');

    try {
        const users = await getAll('users');
        if (users.length === 0) {
            await bulkDocs('users', initialUsers);
            console.log('[Seed] Users seeded');
        }

        console.log('[Seed] Database seeding complete');
    } catch (error) {
        console.error('[Seed] Error during seeding:', error);
    }
};
