-- ============================================
-- Migration 003: sales idempotency key
-- Prevents duplicate checkout retries from creating a second sale row.
-- ============================================

ALTER TABLE sales ADD COLUMN IF NOT EXISTS local_sale_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_local_sale_id_unique
  ON sales (local_sale_id)
  WHERE local_sale_id IS NOT NULL;
