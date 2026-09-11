const express = require('express');
const router = express.Router();
const printController = require('../controllers/printController');

// Print a receipt to the configured thermal printer
router.post('/receipt', printController.printReceipt);

// Print a test page - useful for verifying the printer connection
router.post('/test', printController.testPrinter);

module.exports = router;