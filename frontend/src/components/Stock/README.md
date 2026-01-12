This documentation outlines the requirements and specifications for a Pharmacy Management System featuring sortable and filterable stock and sales tables. The system is designed to streamline pharmacy operations with intuitive inventory and sales tracking.

Stock Management Module

UI Design Specifications

Table Structure


| Column          | Data Type    | Description                        |
|-----------------|--------------|------------------------------------|
| Code            | String       | Unique product identifier          |
| Medicine Name   | String       | Product name with specifications   |
| Category        | String       | Product classification             |
| Stock           | Integer      | Current inventory quantity         |
| Cost Price      | Currency     | Purchase price per unit            |
| Selling Price   | Currency     | Retail price per unit              |
| Status          | Enum         | Stock status indicator             |


Status Definitions

· In Stock: Quantity > 20 units
· Low Stock: Quantity 1-20 units
· Out of Stock: Quantity = 0 units

Filter System

1. Search Filter

· Functionality: Real-time search across medicine names and codes
· Implementation: Case-insensitive partial matching
· Placeholder: "Search medicine..."

2. Category Filter

· Type: Dropdown selector
· Default: "All Categories"
· Categories: Painkiller, Antibiotic, Cough/Cold, Allergy, [Dynamically loaded]

3. Status Filter

· Type: Multi-select dropdown
· Options:
  · In Stock (✓)
  · Low Stock (⚠)
  · Out of Stock (✗)
· Default: Show all statuses

4. Quantity Filter

· Operators:
  · "Less Than" (<)
  · "Greater Than" (>)
· Input: Numerical field for threshold value
· Behavior: Filters stock quantities based on operator and value

Sorting System

Sortable Columns & Order:

1. Product Name
   · Ascending: A → Z
   · Descending: Z → A

2. Stock Quantity
   · Low → High
   · High → Low

3. Selling Price
   · Low → High
   · High → Low

4. Status (Custom Order)
   · Priority: Out of Stock → Low Stock → In Stock

Export Functionality

· Format: CSV/Excel export
· Scope: Currently filtered/sorted data
· Includes: All visible columns with current formatting


💰 Sales Management Module

(Based on typical POS requirements)

Sales Table Features

Table Columns (Suggested):


| Column          | Description                        |
|-----------------|------------------------------------|
| Sale ID         | Unique transaction identifier      |
| Date & Time     | Transaction timestamp              |
| Customer        | Customer name/ID                   |
| Items           | List of products purchased         |
| Total Amount    | Transaction total                  |
| Payment Method  | Cash/Card/Digital                  |
| Status          | Completed/Refunded/Pending         |


Sales Filters:

1. Date Range: Custom date selector
2. Payment Method: Cash, Card, Mobile Payment
3. Customer: Search by name/ID
4. Amount Range: Minimum/Maximum transaction value

Sales Sorting:

1. Date: Newest → Oldest
2. Amount: High → Low
3. Customer: A → Z