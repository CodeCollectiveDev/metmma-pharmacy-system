const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');

const PRINTER_TYPE = process.env.PRINTER_TYPE || 'network';
const PRINTER_HOST = process.env.PRINTER_HOST || '127.0.0.1';
const PRINTER_PORT = process.env.PRINTER_PORT || 9100;
const PRINTER_INTERFACE = process.env.PRINTER_INTERFACE || 'printer:POS58';
const PRINTER_DRIVER = process.env.PRINTER_DRIVER || 'epson';
const PRINTER_WIDTH = parseInt(process.env.PRINTER_WIDTH || '42', 10);
const PHARMACY_NAME = process.env.PHARMACY_NAME || 'METMMA Pharmacy';

const buildInterface = () => {
  if (PRINTER_TYPE === 'usb' || PRINTER_TYPE === 'system') {
    return { interface: PRINTER_INTERFACE, driver: PRINTER_DRIVER };
  }
  return { interface: `tcp://${PRINTER_HOST}:${PRINTER_PORT}` };
};

const createPrinter = () => {
  const config = {
    type: PrinterTypes.EPSON,
    width: PRINTER_WIDTH,
    characterSet: 'PC858_EURO',
    ...buildInterface(),
  };
  return new ThermalPrinter(config);
};

const formatCurrency = (amount) => {
  return `MWK ${Number(amount || 0).toFixed(2)}`;
};

const repeat = (char, count) => char.repeat(Math.max(count, 0));

const buildReceipt = (data) => {
  const receipt = [];

  receipt.push({ type: 'center', text: `${PHARMACY_NAME}` });
  receipt.push({ type: 'center', text: 'Sales Receipt' });
  receipt.push({ type: 'dashed' });

  receipt.push({ type: 'text', text: `Receipt: ${data.receiptNumber || data.transactionId || ''}` });
  receipt.push({ type: 'text', text: `Date:    ${new Date(data.date || Date.now()).toLocaleString()}` });
  receipt.push({ type: 'text', text: `Cashier: ${data.cashier || ''}` });
  receipt.push({ type: 'dashed' });

  for (const item of data.items || []) {
    const line1 = `${item.name} x${item.quantity}`;
    const line2 = `${formatCurrency(item.unitPrice)}   ${formatCurrency(item.total)}`;
    receipt.push({ type: 'text', text: line1 });
    receipt.push({ type: 'text', text: line2 });
  }

  receipt.push({ type: 'dashed' });
  receipt.push({ type: 'text', text: `Subtotal: ${formatCurrency(data.subtotal)}` });
  if (data.tax) receipt.push({ type: 'text', text: `VAT (${data.taxRate || 16.5}%): ${formatCurrency(data.tax)}` });
  receipt.push({ type: 'bold', text: `Total: ${formatCurrency(data.total)}` });
  receipt.push({ type: 'dashed' });

  if (data.paymentMethod) {
    receipt.push({ type: 'text', text: `Payment: ${String(data.paymentMethod).toUpperCase()}` });
  }
  if (data.amountPaid && data.change !== undefined) {
    receipt.push({ type: 'text', text: `Paid:    ${formatCurrency(data.amountPaid)}` });
    receipt.push({ type: 'text', text: `Change:  ${formatCurrency(data.change)}` });
  }

  receipt.push({ type: 'empty' });
  receipt.push({ type: 'center', text: 'Thank you for your purchase!' });
  receipt.push({ type: 'center', text: PHARMACY_NAME });

  return receipt;
};

const renderReceipt = (receipt) => {
  const printer = createPrinter();
  printer.alignCenter();
  printer.bold(true);

  for (const line of receipt) {
    if (line.type === 'center') {
      printer.alignCenter();
      printer.print(line.text);
    } else if (line.type === 'bold') {
      printer.alignLeft();
      printer.bold(true);
      printer.print(line.text);
      printer.bold(false);
    } else if (line.type === 'dashed') {
      printer.alignLeft();
      printer.bold(false);
      printer.print(repeat('-', PRINTER_WIDTH));
    } else if (line.type === 'empty') {
      printer.newLine();
    } else {
      printer.alignLeft();
      printer.bold(false);
      printer.print(line.text);
    }
    printer.newLine();
  }

  printer.bold(false);
  printer.newLine();
  printer.cut(true);
  return printer;
};

const printReceipt = async (data) => {
  const printer = renderReceipt(buildReceipt(data));
  const executeOptions = {};
  await printer.execute(executeOptions);
  return { success: true, message: 'Receipt printed successfully' };
};

const testPrinter = async () => {
  const printer = createPrinter();
  printer.alignCenter();
  printer.bold(true);
  printer.println(`${PHARMACY_NAME}`);
  printer.bold(false);
  printer.println('Printer Test');
  printer.newLine();
  printer.println(`Connected to ${PRINTER_TYPE === 'usb' ? PRINTER_INTERFACE : `${PRINTER_HOST}:${PRINTER_PORT}`}`);
  printer.cut(true);
  await printer.execute();
  return { success: true, message: 'Test page printed successfully' };
};

module.exports = { printReceipt, testPrinter };