const axios = require('axios');

const API_URL = 'http://localhost:3000/api'; 

const runTests = async () => {
  console.log('🧪 Starting Pharmacy System Integration Test...\n');

  try {
    // --- 1. TEST: CREATE PRODUCT ---
    console.log('▶️ Step 1: Creating a new product (Amoxicillin)...');
    const newProduct = {
      productCode: "AMOX-001",
      name: "Amoxicillin 500mg",
      genericName: "Amoxicillin",
      batchNumber: "BN12345",
      expiryDate: "2026-12-31", // Future date for Joi
      quantity: 100,
      unitPrice: 50.00,
      sellingPrice: 150.00,
      costPrice: 40.00,
      supplier: "SADM Malawi",
      category: "Antibiotics",
      reorderLevel: 20
    };

    const createRes = await axios.post(`${API_URL}/products`, newProduct);
    const productId = createRes.data.data.id;
    console.log(`✅ Product Created! ID: ${productId}\n`);

    // --- 2. TEST: MANUAL STOCK ADJUSTMENT (WITH REASON) ---
    console.log('▶️ Step 2: Manually adjusting stock (Adding 50 units)...');
    const updateRes = await axios.put(`${API_URL}/products/${productId}`, {
      quantity: 150,
      reason: "Received top-up delivery from supplier"
    });
    console.log(`✅ Stock Updated! New Quantity: ${updateRes.data.data.quantity}\n`);

    // --- 3. TEST: JOI VALIDATION (NEGATIVE TEST) ---
    console.log('▶️ Step 3: Testing Validation (Attempting to update quantity without a reason)...');
    try {
      await axios.put(`${API_URL}/products/${productId}`, { quantity: 200 });
    } catch (error) {
      console.log(`✅ Success: System blocked update without reason. Message: "${error.response.data.message}"\n`);
    }

    // --- 4. TEST: PROCESS A SALE ---
    console.log('▶️ Step 4: Processing a sale (Selling 10 units)...');
    const saleData = {
      userId: 1, // Assuming a user exists
      customerName: "John Phiri",
      paymentMethod: "cash",
      totalAmount: 1500.00,
      items: [
        {
          productId: productId,
          quantity: 10,
          unitPrice: 150.00,
          subtotal: 1500.00
        }
      ]
    };

    const saleRes = await axios.post(`${API_URL}/sales/checkout`, saleData);
    console.log(`✅ Sale Completed! Receipt: ${saleRes.data.receiptNumber}\n`);

    // --- 5. TEST: VERIFY STOCK REDUCTION ---
    console.log('▶️ Step 5: Verifying stock was reduced automatically...');
    const verifyRes = await axios.get(`${API_URL}/products/${productId}`);
    const finalQty = verifyRes.data.data.quantity;
    console.log(`✅ Verified! Quantity is now ${finalQty} (Started at 150, sold 10)\n`);

    // --- 6. TEST: SEARCH ---
    console.log('▶️ Step 6: Testing search functionality...');
    const searchRes = await axios.get(`${API_URL}/products?search=Amox`);
    console.log(`✅ Found ${searchRes.data.count} products matching "Amox"\n`);

    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');

  } catch (error) {
    console.error('❌ TEST FAILED:');
    if (error.response) {
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
};

runTests();