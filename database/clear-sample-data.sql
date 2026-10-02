-- Remove sample business data while preserving the five seeded user accounts.
-- Run against the Neon database after init.sql has already been applied.

BEGIN;

DELETE FROM sale_items;
DELETE FROM sales;
DELETE FROM stock_movements;
DELETE FROM attendance;
DELETE FROM operation_reports;
DELETE FROM compliance_reports;
DELETE FROM financial_reports;
DELETE FROM employees;
DELETE FROM products;

COMMIT;

SELECT
  (SELECT COUNT(*) FROM users) AS users_preserved,
  (SELECT COUNT(*) FROM products) AS products_remaining,
  (SELECT COUNT(*) FROM employees) AS employees_remaining,
  (SELECT COUNT(*) FROM sales) AS sales_remaining;