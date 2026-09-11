const printerService = require('../services/printerService');

const printReceipt = async (req, res) => {
  const { receipt, amountPaid, change, taxRate } = req.body || {};

  if (!receipt || !receipt.items || !Array.isArray(receipt.items)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid receipt data. Expected a receipt object with an items array.',
    });
  }

  const printData = {
    ...receipt,
    amountPaid,
    change,
    taxRate,
  };

  try {
    const result = await printerService.printReceipt(printData);
    res.status(200).json(result);
  } catch (error) {
    console.error('Thermal printing error:', error.message);
    res.status(502).json({
      success: false,
      message: 'Failed to print receipt. Check that the thermal printer is connected and powered on.',
      error: error.message,
    });
  }
};

const testPrinter = async (req, res) => {
  try {
    const result = await printerService.testPrinter();
    res.status(200).json(result);
  } catch (error) {
    console.error('Thermal printer test error:', error.message);
    res.status(502).json({
      success: false,
      message: 'Printer test failed. Check the printer connection.',
      error: error.message,
    });
  }
};

module.exports = { printReceipt, testPrinter };