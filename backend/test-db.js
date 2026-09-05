const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function test() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test 1: Simple query
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database time:', result.rows[0].now);
    
    // Test 2: Check tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('✅ Tables found:', tables.rows.map(t => t.table_name).join(', '));
    
    // Test 3: Count products
    const count = await pool.query('SELECT COUNT(*) as count FROM products');
    console.log(`✅ Products in database: ${count.rows[0].count}`);
    
    // Test 4: Show sample products
    const products = await pool.query('SELECT product_code, name, quantity, unit_price, selling_price FROM products');
    console.log('📦 Sample products:');
    products.rows.forEach(p => {
      console.log(`   - ${p.product_code}: ${p.name} (Qty: ${p.quantity}, Unit Price: ${p.unit_price}, Selling Price: ${p.selling_price})`);
    });
    
    console.log('\n🎉 All tests passed! Your database is ready.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Is Docker running? Check: docker-compose ps');
    console.log('   2. Is database started? Run: docker-compose up -d');
    console.log('   3. Check .env file has correct credentials');
  }
}

test();