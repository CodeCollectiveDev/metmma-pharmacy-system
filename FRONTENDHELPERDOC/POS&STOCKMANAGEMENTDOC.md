
# 💊 METMMA Pharmacy System: API & Database Documentation

## 1. 🛡️ Database Philosophy
This system is built for **accountability**. In a pharmacy, losing track of a single bottle of Amoxicillin isn't just a financial loss; it's a regulatory risk. Our schema uses **Strict Integrity** (Postgres constraints) and an **Audit-First** approach.

> [!IMPORTANT]
> ### The "NOT NULL" Rule
> We enforce `NOT NULL` on fields like `unit_price`, `quantity`, and `batch_number`.
> **Why?** Because a medicine without an expiry date or a price is a liability. By enforcing this at the database level, we prevent "dirty data" from ever entering the system.

---

## 2. 📊 Core Tables & Data Rationale

### 📦 Products Table
*Stores the current state of inventory.*

| Field | Rationale |
| :--- | :--- |
| **product_code** | `Unique`. Used for fast scanning and preventing duplicate entries of the same brand. |
| **reorder_level** | Triggers automated alerts when stock is dangerously low. |
| **is_active** | We **never delete** products to preserve sales history. We simply deactivate them. |

### 💰 Sales & Sale Items
*Separated into two tables (Parent/Child) for relational integrity.*

- **receipt_number**: The unique legal reference for the customer.
- **unit_price (in sale_items)**: **Crucial.** We save the price at the exact moment of sale. If you change the product price tomorrow, historical receipts remain accurate to what the customer actually paid.

### 🕵️ Stock Movements (The Audit Trail)
**This is the most important table for the owner.** 
Every time a product is created, updated, or sold, a row is added here. It answers the question: 
> *"Why did we have 100 bottles yesterday but only 80 today?"*

---

## 3. ⚙️ Controller Logic & Validation

### 🛡️ Security Layer
We use **Joi Validation** as a shield before data hits the database.
- **Strip Unknown:** Our Joi middleware uses `{ stripUnknown: true }`. This prevents malicious actors from "injecting" unauthorized fields into our database.
- **Stock Logic:** The `updateProduct` controller **requires a reason** if the quantity is changed manually. Staff cannot change stock levels without leaving a paper trail.

### 🧪 Transaction Protection (ACID)
The `processSale` controller utilizes `BEGIN`, `COMMIT`, and `ROLLBACK`.
```sql
-- Logic Example:
-- If a sale of 5 items is processed, but the 5th item is out of stock,
-- the entire transaction is cancelled. 
-- This ensures cash records ALWAYS match physical shelf stock.
```

---

## 4. 🌐 Frontend Integration Guide

### A. Creating a Product
**Endpoint:** `POST /api/products`

```json
{
  "productCode": "AMOX-500",
  "name": "Amoxicillin 500mg",
  "batchNumber": "BN9982",
  "expiryDate": "2026-05-20",
  "quantity": 100,
  "unitPrice": 50.00,
  "sellingPrice": 150.00,
  "supplier": "SADM Malawi",
  "category": "Antibiotics"
}
```

### B. Processing a Sale
**Endpoint:** `POST /api/sales/checkout`
> [!NOTE]
> Ensure `userId` is passed from your Frontend Auth state.

```json
{
  "userId": 1,
  "customerName": "John Phiri",
  "totalAmount": 3000.00,
  "items": [
    {
      "productId": 5,
      "quantity": 2,
      "unitPrice": 1500.00,
      "subtotal": 3000.00
    }
  ]
}
```

### C. Standardized Responses
All routes return a consistent JSON format to make frontend handling easier:

```json
// ✅ Success
{ 
  "success": true, 
  "data": { ... } 
}

// ❌ Error
{ 
  "success": false, 
  "message": "Reason for error (e.g., Insufficient Stock)" 
}
```

---

## 5. 🏗️ Technical Stack Summary

| Layer | Technology |
| :--- | :--- |
| **Backend** | Node.js / Express |
| **Database** | PostgreSQL (Dockerized) |
| **Validation** | Joi |
| **Audit** | Automated via `stock_movements` |
| **Reliability** | ACID Transactions |

---
**© 2024 METMMA Pharmacy Systems**  
*Internal Documentation - Confidential*