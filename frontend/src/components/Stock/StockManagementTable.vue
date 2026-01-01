<template>
  <div class="stock-table">
    <h2>📦 Pharmacy Stock Management</h2>
    
    <!-- Search and Filter Controls -->
    <div class="controls">
      <input 
        v-model="searchQuery" 
        placeholder="🔍 Search medicines..." 
        class="search-input"
      />
      <select v-model="selectedCategory" class="filter-select">
        <option value="">All Categories</option>
        <option v-for="category in categories" :key="category">
          {{ category }}
        </option>
      </select>
      <button @click="addNewMedicine" class="add-btn">➕ Add New</button>
    </div>
    
    <!-- Main Table -->
    <table>
      <thead>
        <tr>
          <th @click="sortBy('name')" class="sortable">
            Medicine Name 
            <span v-if="sortColumn === 'name'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
          </th>
          <th @click="sortBy('batch')" class="sortable">
            Batch No.
            <span v-if="sortColumn === 'batch'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
          </th>
          <th @click="sortBy('batch')" class="sortable">
            Expiry Date
            <span v-if="sortColumn === 'expiry'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
          </th>
          <th>Unit Price</th>
          <th>Supplier</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in filteredMedicines" :key="item.id">
          <td>{{ item.name }}</td>
          <td>{{ item.batch }}</td>
          <td>
            <span class="category-badge" :class="item.category.toLowerCase()">
              {{ item.category }}
            </span>
          </td>
          <td :class="getStockClass(item.quantity)">{{ item.quantity }}</td>
          <td :class="getExpiryClass(item.expiry)">{{ formatDate(item.expiry) }}</td>
          <td>${{ item.price.toFixed(2) }}</td>
          <td>{{ item.supplier }}</td>
          <td>
            <span class="status-badge" :class="getStatus(item.quantity)">
              {{ getStatus(item.quantity) }}
            </span>
          </td>
          <td class="actions">
            <button @click="editMedicine(item)" class="edit-btn">Edit</button>
            <button @click="deleteMedicine(item.id)" class="delete-btn">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
    
    <!-- Summary -->
    <div class="summary">
      Showing {{ filteredMedicines.length }} of {{ medicines.length }} medicines
    </div>
    </div>
    </template>


<script>export default {
  name: 'StockManagementTable',
  data() {
    return {
      searchQuery: '',
      selectedCategory: '',
      sortColumn: 'name',
      sortDirection: 'asc',
      medicines: [
        {
          id: 1,
          name: 'Paracetamol 500mg',
          batch: 'BATCH001',
          category: 'Tablets',
          quantity: 150,
          expiry: '2024-12-31',
          price: 5.99,
          supplier: 'MediCorp'
        },
        {
          id: 2,
          name: 'Amoxicillin 250mg',
          batch: 'BATCH002',
          category: 'Capsules',
          quantity: 45,
          expiry: '2024-10-15',
          price: 8.50,
          supplier: 'PharmaPlus'
        },
        {
          id: 3,
          name: 'Vitamin C 1000mg',
          batch: 'BATCH003',
          category: 'Tablets',
          quantity: 200,
          expiry: '2025-03-20',
          price: 12.99,
          supplier: 'HealthSupplies'
        },
        {
          id: 4,
          name: 'Ibuprofen 200mg',
          batch: 'BATCH004',
          category: 'Tablets',
          quantity: 80,
          expiry: '2024-11-30',
          price: 6.50,
          supplier: 'MediCorp'
        },
        {
          id: 5,
          name: 'Cough Syrup 100ml',
          batch: 'BATCH005',
          category: 'Syrup',
          quantity: 30,
          expiry: '2024-09-15',
          price: 10.99,
          supplier: 'PharmaPlus'
        },
        {
          id: 6,
          name: 'Insulin Injection',
          batch: 'BATCH006',
          category: 'Injection',
          quantity: 25,
          expiry: '2024-08-20',
          price: 45.50,
          supplier: 'MediCorp'
        }
      ]
    }
  },
  computed: {
    categories() {
      return [...new Set(this.medicines.map(m => m.category))]
    },
    filteredMedicines() {
      let filtered = this.medicines
      
      // Apply search
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(item => 
          item.name.toLowerCase().includes(query) ||
          item.batch.toLowerCase().includes(query)
        )
      }
      // Apply category filter
      if (this.selectedCategory) {
        filtered = filtered.filter(item => item.category === this.selectedCategory)
      }
      
      // Apply sorting
      return [...filtered].sort((a, b) => {
        let aVal = a[this.sortColumn]
        let bVal = b[this.sortColumn]
        
        if (this.sortColumn === 'expiry') {
          aVal = new Date(aVal)
          bVal = new Date(bVal)
        }
        
        if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }
  },
 methods: {
    sortBy(column) {
      if (this.sortColumn === column) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortColumn = column
        this.sortDirection = 'asc'
      }
    },
    getStockClass(quantity) {
      if (quantity < 50) return 'low-stock'
      if (quantity > 100) return 'high-stock'
      return ''
    },
    getExpiryClass(expiryDate) {
      const expiry = new Date(expiryDate)
      const today = new Date()
      const diffDays = (expiry - today) / (1000 * 60 * 60 * 24)
      
      if (diffDays < 0) return 'expired'
      if (diffDays < 30) return 'expiring-soon'
      return ''
    },
getStatus(quantity) {
      if (quantity === 0) return 'Out of Stock'
      if (quantity < 50) return 'Low Stock'
      return 'In Stock'
    },
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString()
    },
    addNewMedicine() {
      alert('Add new medicine feature will be implemented!')
    },
    editMedicine(medicine) {
      alert(`Editing: ${medicine.name}`)
    },
    deleteMedicine(id) {
      if (confirm('Are you sure you want to delete this medicine?')) {
        this.medicines = this.medicines.filter(m => m.id !== id)
      }
    }
  }
}
</script>

<style scoped>
.stock-table {
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.controls {
  margin: 20px 0;
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-input, .filter-select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.search-input {
  width: 300px;
}
.filter-select {
  width: 150px;
}

.add-btn {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}
th {
  background-color: #f8f9fa;
  font-weight: 600;
}

tr:hover {
  background-color: #f9f9f9;
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.sortable:hover {
  background-color: #e9ecef;
}

.category-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}
.tablets { background: #e3f2fd; color: #1565c0; }
.capsules { background: #f3e5f5; color: #7b1fa2; }
.syrup { background: #e8f5e8; color: #2e7d32; }
.injection { background: #fff3e0; color: #ef6c00; }

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.low-stock { color: #f44336; font-weight: bold; }
.high-stock { color: #4CAF50; font-weight: bold; }
.expired { color: #f44336; font-weight: bold; }
.expiring-soon { color: #ff9800; font-weight: bold; }

.actions {
  display: flex;
  gap: 5px;
}

.edit-btn, .delete-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
.edit-btn {
  background: #2196F3;
  color: white;
}

.delete-btn {
  background: #f44336;
  color: white;
}

.summary {
  margin-top: 20px;
  color: #666;
  font-size: 14px;
}
</style>