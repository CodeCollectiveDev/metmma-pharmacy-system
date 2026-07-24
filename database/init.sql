-- ============================================
-- METMMA Pharmacy Database Schema v1.0
-- Auto-executed on Docker container startup
-- Created: $(28 december 2025)
-- ============================================

-- ============================================
-- SECTION 1: AUTHENTICATION TABLES (Joshua's Section)
-- ============================================
-- Joshua: These tables handle user login, roles, and permissions
-- Add any authentication-related tables here

-- USERS TABLE - For user authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'pharmacist', 'cashier', 'store_manager', 'hr_officer')),
    full_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE users IS 'User authentication and authorization table';
COMMENT ON COLUMN users.password_hash IS 'Store hashed passwords (use bcrypt)';
COMMENT ON COLUMN users.role IS 'RBAC: admin, pharmacist, cashier, store_manager, hr_officer';

-- ============================================
-- SECTION 2: INVENTORY TABLES (Patrick's section)
-- ============================================
-- Patrick: These tables handle products, stock, and sales
-- Add any product/inventory related tables here

-- PRODUCTS TABLE - Main medicines inventory
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    generic_name VARCHAR(200),
    batch_number VARCHAR(100) NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    selling_price DECIMAL(10, 2) NOT NULL CHECK (selling_price >= 0),
    cost_price DECIMAL(10, 2),
    supplier VARCHAR(200),
    category VARCHAR(100),
    reorder_level INTEGER DEFAULT 10,
    location VARCHAR(100),
    barcode VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE products IS 'Pharmacy medicines and products inventory';
COMMENT ON COLUMN products.reorder_level IS 'Minimum stock level before reorder alert';

-- Main Sales Table
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'cash',
    customer_name VARCHAR(100),
    user_id INTEGER, -- Removed NOT NULL for easier testing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE sales IS 'Sales transactions with financial details';

-- Individual items in a sale
CREATE TABLE IF NOT EXISTS sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL
);

COMMENT ON TABLE sale_items IS 'Individual items sold in each transaction';

-- STOCK_MOVEMENTS TABLE - Audit trail for every stock change
CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id), -- Who performed the action?
    movement_type VARCHAR(20) NOT NULL CHECK (
        movement_type IN ('purchase', 'sale', 'adjustment_in', 'adjustment_out', 'return', 'expired', 'damage')
    ),
    quantity_change INTEGER NOT NULL, -- e.g., +50 or -10
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    notes TEXT, -- e.g., "Received from SADM shipment" or "Dropped bottle"
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE stock_movements IS 'Audit log for all inventory changes';

-- ============================================
-- SESSIONS TABLE - Session management and inactivity tracking
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- ============================================
-- SECTION 3: HR TABLES (Gilbert's Section)
-- ============================================
-- Gilbert: These tables handle employees, attendance, and HR functions
-- Add any HR-related tables here

-- EMPLOYEES TABLE - Employee records
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    national_id VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(10),
    phone_number VARCHAR(20),
    address TEXT,
    position VARCHAR(100),
    department VARCHAR(50),
    employment_type VARCHAR(20) CHECK (employment_type IN ('full_time', 'part_time', 'contract')),
    salary DECIMAL(10, 2),
    bank_account VARCHAR(50),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    hire_date DATE NOT NULL,
    termination_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE employees IS 'Employee personal and professional details';

-- ATTENDANCE TABLE - Daily attendance records
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'leave', 'holiday')),
    hours_worked DECIMAL(4, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)  -- One record per employee per day
);

COMMENT ON TABLE attendance IS 'Daily employee attendance tracking';

--OPERATION REPORTS TABLE
CREATE TABLE IF NOT EXISTS operation_reports (
    id SERIAL PRIMARY KEY,
    report_date DATE,
    total_sales NUMERIC(12,2),
    total_expenses NUMERIC(12,2),
    net_profit NUMERIC(12,2),
    metrics JSONB,
    created_by INTEGER REFERENCES employees(id)
);

COMMENT ON TABLE operation_reports IS 'Daily, weekly, monthly operational performance reports';

-- COMPLIANCE REPORTS TABLE
CREATE TABLE IF NOT EXISTS compliance_reports (
    id SERIAL PRIMARY KEY,
    report_date DATE,
    compliance_type VARCHAR(100),
    description TEXT,
    status VARCHAR(50) CHECK (status IN ('pending', 'completed', 'in_progress')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES employees(id)
);

COMMENT ON TABLE compliance_reports IS 'Regulatory compliance reports for audits and inspections';

-- FINANCIAL REPORTS TABLE
CREATE TABLE IF NOT EXISTS financial_reports (
    id SERIAL PRIMARY KEY,
    report_date DATE,
    total_revenue NUMERIC(12,2),
    total_costs NUMERIC(12,2),
    expenses_breakdown JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES employees(id)
);

COMMENT ON TABLE financial_reports IS 'Financial performance reports for accounting and management';

-- ============================================
-- SAMPLE DATA FOR DEVELOPMENT
-- ============================================

-- Sample users (Joshua will update password hashing later)
INSERT INTO users (username, password_hash, role, full_name, email) VALUES
('admin', 'temp_hash_admin123', 'admin', 'System Administrator', 'admin@metmma.pharmacy'),
('pharmacist1', 'temp_hash_pharm123', 'pharmacist', 'Dr. Jane Smith', 'jane@metmma.pharmacy'),
('cashier1', 'temp_hash_cash123', 'cashier', 'John Doe', 'john@metmma.pharmacy'),
('manager1', 'temp_hash_mgr123', 'store_manager', 'Sarah Johnson', 'sarah@metmma.pharmacy'),
('hr1', 'temp_hash_hr123', 'hr_officer', 'Michael Brown', 'michael@metmma.pharmacy')
ON CONFLICT (username) DO NOTHING;

-- Sample products (Patrick's data)
INSERT INTO products (product_code, name, batch_number, expiry_date, quantity, unit_price, selling_price, category, supplier, reorder_level) VALUES
('MED001', 'Panadol Extra', 'BATCH2024-001', '2025-06-30', 100, 50.00, 80.00, 'Pain Relief', 'GSK Pharmaceuticals', 20),
('MED002', 'Amoxicillin 500mg', 'BATCH2024-002', '2024-12-31', 50, 120.00, 200.00, 'Antibiotics', 'Pfizer', 15),
('MED003', 'Ventolin Inhaler', 'BATCH2024-003', '2025-03-31', 30, 450.00, 600.00, 'Respiratory', 'GSK Pharmaceuticals', 10),
('MED004', 'Insulin Glargine', 'BATCH2024-004', '2024-11-30', 25, 1200.00, 1500.00, 'Diabetes', 'Sanofi', 5),
('MED005', 'Paracetamol 500mg', 'BATCH2024-005', '2026-01-31', 200, 20.00, 40.00, 'Pain Relief', 'Local Pharma', 50)
ON CONFLICT (product_code) DO NOTHING;

-- Sample employees (Gilbert's data)
INSERT INTO employees (employee_id, user_id, position, department, salary, hire_date, phone_number) VALUES
('EMP001', 2, 'Chief Pharmacist', 'Pharmacy', 80000.00, '2023-01-15', '+255123456789'),
('EMP002', 3, 'Cashier', 'Sales', 30000.00, '2023-03-20', '+255987654321'),
('EMP003', 4, 'Store Manager', 'Inventory', 50000.00, '2023-02-10', '+255712345678'),
('EMP004', 5, 'HR Officer', 'Human Resources', 45000.00, '2023-04-05', '+255765432109')
ON CONFLICT (employee_id) DO NOTHING;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users indexes (Joshua)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Products indexes (Patrick)
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_batch ON products(batch_number);
CREATE INDEX IF NOT EXISTS idx_products_expiry ON products(expiry_date);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Sales indexes (Patrick)
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);

-- Employees indexes (Gilbert)
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);

-- Attendance indexes (Gilbert)
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);


-- REPORTS INDEXES
CREATE INDEX IF NOT EXISTS idx_operation_reports_date ON operation_reports(report_date);
CREATE INDEX IF NO EXISTS idx_operation_reports_created_by ON operation_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_financial_reports_date ON financial_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_financial_reports_created_by ON financial_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_date ON compliance_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_created_by ON compliance_reports(created_by);
-- ============================================
-- HELPER VIEWS
-- ============================================

-- Low stock alert view (Patrick)
CREATE OR REPLACE VIEW low_stock_products AS
SELECT 
    id,
    product_code,
    name,
    quantity,
    reorder_level,
    supplier,
    CASE 
        WHEN quantity = 0 THEN 'Out of Stock'
        WHEN quantity <= reorder_level THEN 'Low Stock'
        ELSE 'In Stock'
    END as stock_status
FROM products
WHERE is_active = TRUE AND quantity <= reorder_level;

-- Expiring products view (Patrick)
CREATE OR REPLACE VIEW expiring_products AS
SELECT 
    id,
    name,
    batch_number,
    expiry_date,
    quantity,
    supplier,
    expiry_date - CURRENT_DATE as days_to_expiry
FROM products
WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
  AND quantity > 0
  AND is_active = TRUE
ORDER BY expiry_date ASC;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'METMMA Pharmacy Database Initialized';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - Joshua: users';
    RAISE NOTICE '  - Gilbert: products, sales, sale_items';
    RAISE NOTICE '  - Patrick: employees, attendance','operation_reports, compliance_reports, financial_reports';
    RAISE NOTICE '';
    RAISE NOTICE 'Sample data loaded:';
    RAISE NOTICE '  - 5 users (admin, pharmacist, cashier, manager, hr)';
    RAISE NOTICE '  - 5 medicine products';
    RAISE NOTICE '  - 4 employees';
    RAISE NOTICE '===========================================';
END $$;