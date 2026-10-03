BEGIN;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS idempotency_key UUID;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS request_hash CHAR(64);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(12,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_rate_bps INTEGER;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'completed';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reversal_reason TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reversal_kind VARCHAR(20);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reversed_by INTEGER REFERENCES users(id);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS idempotency_key UUID;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS request_hash CHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS mvp_stock_request_key ON stock_movements(user_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(200);
-- Re-applying after a down migration restores all archived financial/read state.
DO $$ BEGIN
  IF to_regclass('mvp_archive_sales_state') IS NOT NULL THEN
    UPDATE sales s SET idempotency_key=a.idempotency_key,request_hash=a.request_hash,subtotal_amount=a.subtotal_amount,tax_amount=a.tax_amount,tax_rate_bps=a.tax_rate_bps,status=a.status,reversed_at=a.reversed_at,reversal_reason=a.reversal_reason,reversal_kind=a.reversal_kind,reversed_by=a.reversed_by FROM mvp_archive_sales_state a WHERE s.id=a.id;
    UPDATE sale_items si SET product_name=a.product_name FROM mvp_archive_item_state a WHERE si.id=a.id;
    DROP TABLE mvp_archive_sales_state, mvp_archive_item_state;
  END IF;
  IF to_regclass('mvp_archive_stock_state') IS NOT NULL THEN
    UPDATE stock_movements sm SET idempotency_key=a.idempotency_key,request_hash=a.request_hash FROM mvp_archive_stock_state a WHERE sm.id=a.id;
    DROP TABLE mvp_archive_stock_state;
  END IF;
  IF to_regclass('mvp_archive_financial_transactions') IS NOT NULL THEN ALTER TABLE mvp_archive_financial_transactions RENAME TO financial_transactions; END IF;
  IF to_regclass('mvp_archive_expense_audit') IS NOT NULL THEN ALTER TABLE mvp_archive_expense_audit RENAME TO expense_audit; END IF;
  IF to_regclass('mvp_archive_notification_reads') IS NOT NULL THEN ALTER TABLE mvp_archive_notification_reads RENAME TO notification_reads; END IF;
END $$;
UPDATE sale_items si SET product_name=p.name FROM products p WHERE p.id=si.product_id AND si.product_name IS NULL;
UPDATE sales s SET subtotal_amount=COALESCE((SELECT SUM(subtotal) FROM sale_items WHERE sale_id=s.id),s.total_amount), tax_amount=s.total_amount-COALESCE((SELECT SUM(subtotal) FROM sale_items WHERE sale_id=s.id),s.total_amount) WHERE subtotal_amount IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS mvp_sales_checkout_key ON sales(user_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS mvp_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS mvp_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS mvp_sales_date_id ON sales(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS mvp_products_active_name ON products(name,id) WHERE is_active=TRUE;
CREATE INDEX IF NOT EXISTS mvp_products_code_prefix ON products(lower(product_code) text_pattern_ops) WHERE is_active=TRUE;
CREATE INDEX IF NOT EXISTS mvp_products_name_prefix ON products(lower(name) text_pattern_ops) WHERE is_active=TRUE;
CREATE INDEX IF NOT EXISTS mvp_products_generic_prefix ON products(lower(generic_name) text_pattern_ops) WHERE is_active=TRUE;
CREATE INDEX IF NOT EXISTS mvp_products_batch_prefix ON products(lower(batch_number) text_pattern_ops) WHERE is_active=TRUE;
CREATE INDEX IF NOT EXISTS mvp_products_barcode_prefix ON products(lower(barcode) text_pattern_ops) WHERE is_active=TRUE;
CREATE INDEX IF NOT EXISTS mvp_products_barcode ON products(barcode) WHERE is_active=TRUE;
CREATE INDEX IF NOT EXISTS mvp_products_low ON products(quantity,id) WHERE is_active=TRUE AND quantity<=reorder_level;
CREATE INDEX IF NOT EXISTS mvp_products_expiry ON products(expiry_date,id) WHERE is_active=TRUE AND quantity>0;
CREATE INDEX IF NOT EXISTS mvp_attendance_employee_date ON attendance(employee_id,date DESC);
CREATE INDEX IF NOT EXISTS mvp_stock_date ON stock_movements(movement_date DESC,id DESC);
CREATE TABLE IF NOT EXISTS financial_transactions (
  id BIGSERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK(type IN ('income','expense','refund')),
  amount NUMERIC(14,2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sale_id INTEGER REFERENCES sales(id),
  category VARCHAR(50),
  note VARCHAR(500),
  supplier VARCHAR(200),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  version INTEGER NOT NULL DEFAULT 1,
  idempotency_key UUID,
  request_hash CHAR(64)
);
CREATE UNIQUE INDEX IF NOT EXISTS mvp_finance_sale_type ON financial_transactions(sale_id,type) WHERE sale_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS mvp_expense_key ON financial_transactions(created_by,idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS mvp_finance_date ON financial_transactions(transaction_date DESC,id DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS mvp_finance_type_method_date ON financial_transactions(type,payment_method,transaction_date) WHERE deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS expense_audit (
  id BIGSERIAL PRIMARY KEY,
  transaction_id BIGINT NOT NULL REFERENCES financial_transactions(id),
  action VARCHAR(20) NOT NULL CHECK(action IN ('created','edited','deleted')),
  before_value JSONB,
  after_value JSONB,
  user_id INTEGER NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS mvp_expense_audit_transaction ON expense_audit(transaction_id,id DESC);
CREATE TABLE IF NOT EXISTS notification_reads (
  user_id INTEGER NOT NULL REFERENCES users(id),
  alert_key CHAR(32) NOT NULL,
  read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id,alert_key)
);
-- Preserve original sale totals; old user IDs without a matching user remain NULL.
INSERT INTO financial_transactions(type,amount,payment_method,transaction_date,sale_id,created_by)
SELECT 'income',s.total_amount,COALESCE(s.payment_method,'cash'),s.created_at,s.id,u.id
FROM sales s LEFT JOIN users u ON u.id=s.user_id
ON CONFLICT (sale_id,type) WHERE sale_id IS NOT NULL DO NOTHING;
COMMIT;
