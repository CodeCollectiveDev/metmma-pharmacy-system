BEGIN;
CREATE TABLE IF NOT EXISTS pharmacy_profile (
 id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
 pharmacy_name VARCHAR(120) NOT NULL,
 phone VARCHAR(30),
 email VARCHAR(120),
 address VARCHAR(300),
 tax_registration_number VARCHAR(100),
 logo_data TEXT,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_by INTEGER REFERENCES users(id)
);
INSERT INTO pharmacy_profile (id, pharmacy_name)
VALUES (1, 'METMMA Pharmacy')
ON CONFLICT (id) DO NOTHING;
COMMIT;
