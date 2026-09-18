# API Endpoint Reference & Usage Guide

## Base URL
- **Development**: `http://localhost:3000/api`
- **Frontend Proxy**: `/api` (Vite dev server forwards to backend)

## Authentication
All endpoints (except `/auth/login` and `/health`) require:
```
Headers: {
  Authorization: "Bearer {JWT_TOKEN}",
  Content-Type: "application/json"
}
```

Token is automatically added by `apiClient` interceptor in `frontend/src/services/api/apiClient.js`

---

## Products Endpoints

### GET /products
Fetch all products

**Frontend Usage**:
```javascript
const products = await dataService.getProducts()
// OR via orchestrator (recommended):
const products = await dataOrchestrator.fetchCollection('products', dataService.getProducts)
```

**Response**:
```json
[
  {
    "id": 1,
    "productCode": "AMOX-001",
    "name": "Amoxicillin 500mg",
    "quantity": 95,
    "sellingPrice": 150.00,
    "reorderLevel": 20,
    "batch_number": "BN12345",
    "expiry_date": "2026-12-31"
  }
]
```

### POST /products
Create a new product

**Frontend Usage**:
```javascript
const product = {
  productCode: "IBUP-001",
  name: "Ibuprofen 400mg",
  quantity: 100,
  sellingPrice: 120.00,
  reorderLevel: 15
}
const result = await dataService.addProduct(product)
```

### PUT /products/:id
Update a product (deducts stock and logs movement)

**Frontend Usage**:
```javascript
const updated = {
  ...product,
  quantity: 150,
  reason: "Received delivery from SADM"
}
const result = await dataService.updateProduct(updated)
```

### DELETE /products/:id
Soft delete a product (marks as inactive, preserves audit trail)

**Frontend Usage**:
```javascript
const result = await dataService.deleteProduct(product)
```

---

## Sales Endpoints

### POST /sales/checkout
Process a new sale transaction

**Frontend Usage**:
```javascript
const saleData = {
  items: [
    { productId: 1, quantity: 5, unitPrice: 150.00, subtotal: 750.00 }
  ],
  totalAmount: 750.00,
  paymentMethod: "cash",
  customerName: "John Phiri"
}
const result = await dataService.recordSale(saleData)
```

The authenticated JWT supplies the sale and stock-movement actor identity; callers do not submit a user ID.

**Response**:
```json
{
  "success": true,
  "message": "Sale completed",
  "receiptNumber": "REC-1705940000000",
  "saleId": 42
}
```

**Backend Actions**:
1. Creates sale record in `sales` table
2. Creates `sale_items` entries for each product
3. Updates `products.quantity` (deducts stock)
4. Logs to `stock_movements` table for audit trail
5. All within a database transaction

### GET /sales/history
Fetch all sales transactions with line items

**Frontend Usage**:
```javascript
const history = await dataService.getSalesHistory()
// Via orchestrator:
const transactions = await dataOrchestrator.fetchCollection('transactions', dataService.getSalesHistory)
```

**Response**:
```json
[
  {
    "id": 1,
    "receipt_number": "REC-1705940000000",
    "total_amount": 750.00,
    "payment_method": "cash",
    "customer_name": "John Phiri",
    "created_at": "2026-01-25T14:30:00Z",
    "items": [
      { "product_id": 1, "quantity": 5, "unit_price": 150.00, "subtotal": 750.00 }
    ]
  }
]
```

---

## Employees Endpoints

### GET /employees
Fetch all employees

**Frontend Usage**:
```javascript
const employees = await dataService.getEmployees()
// Via orchestrator (recommended):
const staff = await dataOrchestrator.fetchCollection('employees', dataService.getEmployees)
```

**Response**:
```json
[
  {
    "id": 1,
    "first_name": "Grace",
    "last_name": "Banda",
    "role": "pharmacist",
    "hire_date": "2024-01-01",
    "salary": 150000
  }
]
```

### POST /employees
Add a new employee

**Frontend Usage**:
```javascript
const employee = {
  first_name: "John",
  last_name: "Chakwera",
  role: "cashier",
  hire_date: "2026-02-01",
  salary: 80000
}
const result = await dataService.addEmployee(employee)
```

**HR Module Flow**:
```javascript
// In HrDashboard.vue
const saveEmployee = async () => {
  const success = await store.addEmployee(newEmployee.value)
  // store.addEmployee() internally:
  // 1. Normalizes form data to backend schema
  // 2. Calls dataService.addEmployee()
  // 3. Refetches employee list
  // 4. Clears form
}
```

### PUT /employees/:id
Update employee information

**Frontend Usage**:
```javascript
const updated = {
  id: 1,
  first_name: "Grace",
  last_name: "Banda",
  role: "store_manager",
  salary: 180000
}
const result = await dataService.updateEmployee(updated)
```

### DELETE /employees/:id
Remove an employee

**Frontend Usage**:
```javascript
const result = await dataService.deleteEmployee(employee)
```

---

## Attendance Endpoints

### POST /attendance
Mark attendance for an employee

**Frontend Usage**:
```javascript
const record = {
  employee_id: 1,
  date: "2026-01-25",
  status: "present"
}
const result = await dataService.markAttendance(record)
```

### GET /attendance/:employeeId
Fetch attendance history for specific employee

**Frontend Usage**:
```javascript
const history = await dataService.getAttendance(employeeId)
```

**Response**:
```json
[
  {
    "id": 1,
    "employee_id": 1,
    "date": "2026-01-25",
    "status": "present",
    "created_at": "2026-01-25T08:00:00Z"
  }
]
```

---

## Reports Endpoints

### GET /reports/recent-activity
Fetch combined activity feed (sales + stock movements)

**Frontend Usage**:
```javascript
const activity = await dataService.getRecentActivity()
```

**Response**:
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "type": "sale",
      "timestamp": "2026-01-25T14:35:00Z",
      "title": "Sale completed",
      "description": "Receipt REC-1705940000000 - MWK 750.00"
    },
    {
      "type": "stock",
      "timestamp": "2026-01-25T14:35:00Z",
      "title": "Stock reduced",
      "description": "Amoxicillin 500mg (-5)"
    }
  ]
}
```

**Used By**:
- Dashboard Recent Activity section
- Reports module activity feed

### GET /reports/sales-daily
(Currently in dataService but not fully implemented)

**Planned Usage**:
```javascript
const dailyReport = await dataService.getDailySales()
```

---

## Auth Endpoints

### POST /auth/login
Authenticate user and receive JWT token

**Frontend Usage** (from Login.vue):
```javascript
const login = async () => {
  const response = await authService.login(email, password)
  // Receives: { token, user: { id, name, role } }
  localStorage.setItem('token', response.token)
  localStorage.setItem('user', JSON.stringify(response.user))
  localStorage.setItem('role', response.user.role)
  // Redirects to dashboard based on role
}
```

**Request**:
```json
{
  "email": "admin@metmma.mw",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "name": "Admin User",
    "role": "admin"
  }
}
```

---

## Health Check Endpoint

### GET /health
System health status (no auth required)

**Response**:
```json
{
  "status": "OK",
  "timestamp": "2026-01-25T14:35:00Z",
  "service": "METMMA Pharmacy API",
  "version": "1.0.0"
}
```

---

## Data Flow with Normalization

### Example: Fetching Products

**Frontend Request**:
```javascript
const products = await dataOrchestrator.fetchCollection('products', dataService.getProducts)
```

**Backend Response** (raw):
```json
[
  {
    "id": 1,
    "name": "Paracetamol 500mg",
    "quantity": 45,        ← Backend uses "quantity"
    "reorderLevel": 10,    ← Backend uses "reorderLevel"
    "sellingPrice": 100,   ← Backend uses "sellingPrice"
    "batch_number": "BN001",
    "expiry_date": "2026-06-30"
  }
]
```

**Orchestrator Normalization**:
```javascript
// Converts to frontend schema:
{
  id: 1,
  name: "Paracetamol 500mg",
  stock: 45,             ← Normalized from "quantity"
  minStockLevel: 10,     ← Normalized from "reorderLevel"
  price: 100,            ← Normalized from "sellingPrice"
  batchNumber: "BN001",  ← Normalized from "batch_number"
  expiryDate: "2026-06-30",
  _id: "1"
}
```

**Frontend Use**:
```javascript
<div>{{ product.stock }} units at {{ formatCurrency(product.price) }}</div>
// ✅ Works because orchestrator normalized the fields
```

---

## Common Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```
**Solution**: Clear localStorage, redirect to login

### 400 Bad Request
```json
{
  "error": "Validation error",
  "details": [
    { "message": "Field is required", "path": "name" }
  ]
}
```
**Solution**: Check request data matches schema

### 404 Not Found
```json
{
  "error": "Product not found"
}
```
**Solution**: Verify resource ID exists in database

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Database error: constraint violation"
}
```
**Solution**: Check backend logs, ensure database is running

---

## Offline & Sync Behavior

### Normal Flow (Online)
```
Frontend → API Client → Backend Database
        ↓
   Save to LocalForage (syncStatus: 'synced')
        ↓
   Return to Component
```

### Offline Flow
```
Frontend → API Client (FAILS)
        ↓
   Save to LocalForage (syncStatus: 'pending')
        ↓
   Return to Component (with offline flag)
```

### Reconnection Flow
```
Connection Restored → 'online' event fires
        ↓
   Sync Worker queries LocalForage for pending items
        ↓
   POST pending items to API
        ↓
   Update LocalForage (syncStatus: 'synced')
```

**Frontend Notification**:
```javascript
// Components can check offline status:
const { offline } = await orchestrator.saveItem(...)
if (offline) {
  showNotification('Saved offline - will sync when connected')
}
```

---

## Testing Endpoints with Postman

### 1. Login
```
POST http://localhost:3000/api/auth/login
Body (JSON):
{
  "email": "admin@metmma.mw",
  "password": "admin123"
}
```
Save the returned token for subsequent requests.

### 2. Get Products
```
GET http://localhost:3000/api/products
Headers: Authorization: Bearer {token}
```

### 3. Create Sale
```
POST http://localhost:3000/api/sales/checkout
Headers: Authorization: Bearer {token}
Body (JSON):
{
  "items": [
    { "productId": 1, "quantity": 5, "unitPrice": 150, "subtotal": 750 }
  ],
  "totalAmount": 750,
  "paymentMethod": "cash",
  "customerName": "Test Patient"
}
```

---

## Quick Reference Table

| Operation | Method | Endpoint | Frontend Function |
|-----------|--------|----------|------------------|
| List Products | GET | `/products` | `dataService.getProducts()` |
| Add Product | POST | `/products` | `dataService.addProduct()` |
| Update Product | PUT | `/products/:id` | `dataService.updateProduct()` |
| Delete Product | DELETE | `/products/:id` | `dataService.deleteProduct()` |
| Process Sale | POST | `/sales/checkout` | `dataService.recordSale()` |
| Sales History | GET | `/sales/history` | `dataService.getSalesHistory()` |
| List Employees | GET | `/employees` | `dataService.getEmployees()` |
| Add Employee | POST | `/employees` | `dataService.addEmployee()` |
| Mark Attendance | POST | `/attendance` | `dataService.markAttendance()` |
| Activity Feed | GET | `/reports/recent-activity` | `dataService.getRecentActivity()` |
| System Health | GET | `/health` | (public, no auth) |

---

## Best Practices

### ✅ DO
- Use `dataOrchestrator.fetchCollection()` for reads (automatic caching & offline support)
- Use `dataService` methods directly for writes (synced to backend)
- Check `navigator.onLine` before critical operations
- Handle API errors with try/catch
- Normalize data before displaying in components

### ❌ DON'T
- Call backend API directly (bypass dataService)
- Assume online connectivity (implement offline fallback)
- Store sensitive data in localStorage (use secure backend sessions)
- Make multiple API calls when one endpoint provides the data
- Skip error handling in async operations

---

**Last Updated**: January 2026  
**API Version**: 1.0  
**Status**: Production Ready
