const { AppError } = require('./errors');
function minor(value) {
  const text = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new AppError('VALIDATION',400,['amount']);
  const [whole, part=''] = text.split('.');
  return BigInt(whole)*100n+BigInt(part.padEnd(2,'0'));
}
const decimal = cents => `${cents/100n}.${String(cents%100n).padStart(2,'0')}`;
const tax = (subtotal,bps) => (subtotal*BigInt(bps)+5000n)/10000n;
const taxRate = () => Number(process.env.TAX_RATE_BPS ?? 1650);
module.exports = { minor, decimal, tax, taxRate };
