-- Product creation no longer requires batch or expiry at product level.
ALTER TABLE products
  ALTER COLUMN product_code DROP NOT NULL,
  ALTER COLUMN batch_number DROP NOT NULL,
  ALTER COLUMN expiry_date DROP NOT NULL;
