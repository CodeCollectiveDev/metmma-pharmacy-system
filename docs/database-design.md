# Database Design — METMMA Pharmacy Management System

## users

- profile_image (nullable reference to the user's profile image)
- id (PK)
- username (unique)
- password_hash
- role
- created_at

## products
- id (PK)
- name
- batch_number
- expiry_date
- quantity
- price
- created_at

## sales
- id (PK)
- user_id (FK → users.id)
- total_amount
- payment_method
- sale_date
- synced

## sale_items
- id (PK)
- sale_id (FK → sales.id)
- product_id (FK → products.id)
- quantity
- price_at_sale

## employees
- id (PK)
- user_id (FK → users.id)
- full_name
- role
- salary
- join_date
