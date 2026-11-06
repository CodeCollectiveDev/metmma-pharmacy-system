BEGIN;
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS categories_active_sort ON categories(sort_order,name) WHERE is_active=TRUE;
INSERT INTO categories(name,sort_order,is_active) VALUES
  ('Antibiotics',10,TRUE),
  ('Painkillers',20,TRUE),
  ('Vitamins',30,TRUE),
  ('Cough & Cold',40,TRUE),
  ('First Aid',50,TRUE),
  ('Diagnostics',60,TRUE),
  ('Other',70,TRUE)
ON CONFLICT (name) DO NOTHING;
COMMIT;
