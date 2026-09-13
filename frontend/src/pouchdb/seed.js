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

const initialProducts = [
    { _id: 'prod_001', name: 'Amoxicillin 500mg', batchNumber: 'BATCH001', barcode: '0111109876543', expiryDate: '2026-12-31', supplier: 'PharmaMeds Malawi', price: 1500, stock: 120, minStockLevel: 20, category: 'Antibiotics' },
    { _id: 'prod_002', name: 'Paracetamol 500mg', batchNumber: 'BATCH002', barcode: '0600004444444', expiryDate: '2027-06-30', supplier: 'HealthCare Ltd', price: 500, stock: 500, minStockLevel: 50, category: 'Painkillers' },
    { _id: 'prod_003', name: 'Ibuprofen 400mg', batchNumber: 'BATCH003', expiryDate: '2026-05-15', supplier: 'HealthCare Ltd', price: 850, stock: 200, minStockLevel: 30, category: 'Painkillers' },
    { _id: 'prod_004', name: 'Vitamin C 1000mg', batchNumber: 'BATCH004', expiryDate: '2026-11-20', supplier: 'Wellness Inc', price: 1000, stock: 50, minStockLevel: 15, category: 'Vitamins' },
    { _id: 'prod_005', name: 'Cough Syrup 100ml', batchNumber: 'BATCH005', expiryDate: '2025-08-10', supplier: 'PharmaMeds Malawi', price: 1200, stock: 30, minStockLevel: 10, category: 'Cough & Cold' },
    { _id: 'prod_006', name: 'Metformin 500mg', batchNumber: 'BATCH006', expiryDate: '2027-03-15', supplier: 'DiabetesCare', price: 2000, stock: 80, minStockLevel: 25, category: 'Diabetes' },
    { _id: 'prod_007', name: 'Omeprazole 20mg', batchNumber: 'BATCH007', expiryDate: '2026-09-01', supplier: 'GastroHealth', price: 1800, stock: 60, minStockLevel: 15, category: 'Gastrointestinal' },
    { _id: 'prod_008', name: 'Bandages (Pack of 10)', batchNumber: 'BATCH008', expiryDate: '2028-01-01', supplier: 'MedSupply Co', price: 300, stock: 200, minStockLevel: 50, category: 'First Aid' }
];

const initialEmployees = [
    { _id: 'emp_001', name: 'John Banda', position: 'Pharmacist', department: 'Pharmacy', salary: 150000, startDate: '2023-01-15', status: 'active' },
    { _id: 'emp_002', name: 'Grace Phiri', position: 'Cashier', department: 'Sales', salary: 80000, startDate: '2023-06-01', status: 'active' },
    { _id: 'emp_003', name: 'Peter Mwale', position: 'Store Manager', department: 'Operations', salary: 120000, startDate: '2022-03-10', status: 'active' },
    { _id: 'emp_004', name: 'Mary Chirwa', position: 'HR Officer', department: 'Human Resources', salary: 100000, startDate: '2024-01-05', status: 'active' }
];

export const seedDatabase = async () => {
    console.log('[Seed] Starting database seeding...');

    try {
        const users = await getAll('users');
        if (users.length === 0) {
            await bulkDocs('users', initialUsers);
            console.log('[Seed] Users seeded');
        }

        const products = await getAll('products');
        if (products.length === 0) {
            await bulkDocs('products', initialProducts);
            console.log('[Seed] Products seeded');
        }

        const employees = await getAll('employees');
        if (employees.length === 0) {
            await bulkDocs('employees', initialEmployees);
            console.log('[Seed] Employees seeded');
        }

        console.log('[Seed] Database seeding complete');
    } catch (error) {
        console.error('[Seed] Error during seeding:', error);
    }
};
