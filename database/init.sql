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
    role VARCHAR(24) NOT NULL CHECK (role IN ('super_admin', 'managing_director', 'director', 'pharmacist_manager', 'pharmacist', 'assistant_pharmacist', 'store_manager', 'cashier', 'hr_officer')),
    full_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE users IS 'User authentication and authorization table';
COMMENT ON COLUMN users.password_hash IS 'Store hashed passwords (use bcrypt)';
COMMENT ON COLUMN users.role IS 'RBAC: super_admin, managing_director, director, pharmacist_manager, pharmacist, assistant_pharmacist, store_manager, cashier, hr_officer';

-- SESSIONS TABLE - Server-side session lifecycle & audit trail
-- Every login creates one session row (sid). Access & refresh JWTs carry the
-- sid claim; revocation, refresh rotation (token_version) and session audit
-- are all enforced server-side against this table.
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    sid UUID UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_agent TEXT,
    ip_address VARCHAR(45),
    token_version INTEGER NOT NULL DEFAULT 1,
    issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE sessions IS 'Server-side session store: enables token revocation, logout, refresh rotation and login audit';
COMMENT ON COLUMN sessions.token_version IS 'Incremented on each token refresh; tokens minted with an older version are rejected';
COMMENT ON COLUMN sessions.revoked_at IS 'Set on logout / account deactivation / force-logout; non-null means the session is dead';

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_sid ON sessions(sid);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON sessions(revoked_at);

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
    local_sale_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE sales IS 'Sales transactions with financial details';

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_local_sale_id_unique
    ON sales (local_sale_id)
    WHERE local_sale_id IS NOT NULL;

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
-- SECTION 3: HR TABLES (Gilbert's Section)
-- ============================================
-- Gilbert: These tables handle employees, attendance, and HR functions
-- Add any HR-related tables here

-- EMPLOYEES TABLE - Employee records
-- employee_id auto-generated from a sequence (e.g. EMP-000001).
CREATE SEQUENCE IF NOT EXISTS employee_id_seq START 1;
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id),
    employee_id VARCHAR(50) UNIQUE NOT NULL DEFAULT ('EMP-' || lpad(nextval('employee_id_seq')::text, 6, '0')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50),
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

-- EMPLOYEE LEAVE TABLE - Current and historical leave records
CREATE TABLE IF NOT EXISTS employee_leave (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    reason TEXT,
    start_date DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (expected_return_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_employee_leave_current
    ON employee_leave (status, start_date, expected_return_date);

--OPERATION REPORTS TABLE
CREATE TABLE IF NOT EXISTS operation_reports (
    id SERIAL PRIMARY KEY,
    report_id SERIAL,
    report_date DATE,
    total_sales NUMERIC(12,2),
    total_expenses NUMERIC(12,2),
    net_profit NUMERIC(12,2),
    metrics JSONB, -- store structured analytics data
    created_by INT REFERENCES users(id)
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
    created_by INT REFERENCES users(id)
);

COMMENT ON TABLE compliance_reports IS 'Regulatory compliance reports for audits and inspections';

-- FINANCIAL REPORTS TABLE
CREATE TABLE IF NOT EXISTS financial_reports (
    id SERIAL PRIMARY KEY,
    report_id SERIAL,
    report_date DATE,
    total_revenue NUMERIC(12,2),
    total_costs NUMERIC(12,2),
    expenses_breakdown JSONB, -- detailed expenses
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id)
);

COMMENT ON TABLE financial_reports IS 'Financial performance reports for accounting and management';

-- ============================================
-- SAMPLE DATA FOR DEVELOPMENT
-- ============================================

-- Sample users (Joshua will update password hashing later)
-- NOTE: Run `npm run create-admin` in backend to set a real bcrypt password
-- for the super_admin account. Other dev accounts use placeholder hashes.
INSERT INTO users (username, password_hash, role, full_name, email) VALUES
('admin', 'temp_hash_admin123', 'super_admin', 'System Administrator', 'admin@metmma.pharmacy'),
('pharmacist1', 'temp_hash_pharm123', 'pharmacist', 'Dr. Jane Smith', 'jane@metmma.pharmacy'),
('cashier1', 'temp_hash_cash123', 'cashier', 'John Doe', 'john@metmma.pharmacy'),
('manager1', 'temp_hash_mgr123', 'store_manager', 'Sarah Johnson', 'sarah@metmma.pharmacy'),
('hr1', 'temp_hash_hr123', 'hr_officer', 'Michael Brown', 'michael@metmma.pharmacy')
ON CONFLICT (username) DO NOTHING;

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
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);

-- Employees indexes (Gilbert)
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);

-- Attendance indexes (Gilbert)
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);


-- REPORTS INDEXES
CREATE INDEX IF NOT EXISTS idx_operation_reports_date ON operation_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_operation_reports_created_by ON operation_reports(created_by);
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
    RAISE NOTICE '  - Patrick: employees, attendance, operation_reports, compliance_reports, financial_reports';
    RAISE NOTICE '';
    RAISE NOTICE 'Seeded accounts loaded:';
    RAISE NOTICE '  - 5 users (super_admin, pharmacist, cashier, store_manager, hr_officer)';
    RAISE NOTICE '  - Run `npm run create-admin` in backend to set the super_admin password';
    RAISE NOTICE '===========================================';
END $$;