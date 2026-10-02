BEGIN;
-- Roll back schema without destroying new expense, income, audit or read data.
-- Quiesce writes and take a full backup first. Up restores these archives.
CREATE TABLE mvp_archive_sales_state AS SELECT id,idempotency_key,request_hash,subtotal_amount,tax_amount,tax_rate_bps,status,reversed_at,reversal_reason,reversal_kind,reversed_by FROM sales;
CREATE TABLE mvp_archive_stock_state AS SELECT id,idempotency_key,request_hash FROM stock_movements;
CREATE TABLE mvp_archive_item_state AS SELECT id,product_name FROM sale_items;
ALTER TABLE expense_audit RENAME TO mvp_archive_expense_audit;
ALTER TABLE financial_transactions RENAME TO mvp_archive_financial_transactions;
ALTER TABLE notification_reads RENAME TO mvp_archive_notification_reads;
DROP INDEX IF EXISTS mvp_stock_request_key,mvp_sales_checkout_key,mvp_sale_items_sale,mvp_sale_items_product,mvp_sales_date_id,mvp_products_active_name,mvp_products_code_prefix,mvp_products_name_prefix,mvp_products_generic_prefix,mvp_products_barcode,mvp_products_barcode_prefix,mvp_products_batch_prefix,mvp_products_low,mvp_products_expiry,mvp_attendance_employee_date,mvp_stock_date,mvp_finance_sale_type,mvp_expense_key,mvp_finance_date,mvp_finance_type_method_date,mvp_expense_audit_transaction;
ALTER TABLE sales DROP COLUMN idempotency_key,DROP COLUMN request_hash,DROP COLUMN subtotal_amount,DROP COLUMN tax_amount,DROP COLUMN tax_rate_bps,DROP COLUMN status,DROP COLUMN reversed_at,DROP COLUMN reversal_reason,DROP COLUMN reversal_kind,DROP COLUMN reversed_by;
ALTER TABLE stock_movements DROP COLUMN idempotency_key,DROP COLUMN request_hash;
ALTER TABLE sale_items DROP COLUMN product_name;
COMMIT;
