BEGIN;
-- Canonical batch numbers: store upper case so the same physical batch cannot be
-- recorded twice with different capitalisation. Lookups stay case-insensitive.
-- Non-destructive: only the letter case changes, no rows are deleted or merged.

-- 1. Normalise every existing batch number to upper case. Trailing spaces are
-- kept as-is so this matches the validator, which only trims on the way in.
UPDATE products SET batch_number=upper(batch_number), updated_at=CURRENT_TIMESTAMP WHERE batch_number<>upper(batch_number);

-- 2. Report duplicate name + batch + expiry combinations for staff to review.
-- Out of scope: auto-merging records. This only raises a notice so the run does
-- not fail on data that is already there.
DO $$
DECLARE duplicate RECORD; total INTEGER:=0;
BEGIN
  FOR duplicate IN
    SELECT product_code,name,batch_number,expiry_date,COUNT(*) AS copies,array_agg(id ORDER BY id) AS ids
    FROM products
    GROUP BY product_code,batch_number,expiry_date
    HAVING COUNT(*)>1
  LOOP
    total:=total+1;
    RAISE NOTICE 'Duplicate batch: code=% name=% batch=% expiry=% rows=%',
      duplicate.product_code,duplicate.name,duplicate.batch_number,duplicate.expiry_date,duplicate.ids;
  END LOOP;
  IF total>0 THEN
    RAISE NOTICE '% duplicate product_code/batch/expiry group(s) left untouched for manual review.',total;
  END IF;
END $$;

-- 3. Support the case-insensitive duplicate-batch advisory (active rows only).
CREATE INDEX IF NOT EXISTS mvp_products_name_batch ON products(lower(name),upper(batch_number)) WHERE is_active=TRUE;
COMMIT;
