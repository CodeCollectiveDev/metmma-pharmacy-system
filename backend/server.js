require('dotenv').config({ quiet: true });
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || /^(change|your-secret)/i.test(process.env.JWT_SECRET)) throw new Error('Set JWT_SECRET to a random value of at least 32 characters before starting.');
if (!/^\d+$/.test(process.env.TAX_RATE_BPS || '1650') || Number(process.env.TAX_RATE_BPS || 1650) > 10000) throw new Error('TAX_RATE_BPS must be an integer from 0 to 10000.');
if (!/^[A-Za-z_\/-]+$/.test(process.env.PHARMACY_TIMEZONE || 'UTC')) throw new Error('Set a valid PHARMACY_TIMEZONE.');
const app = require('./app');
const {pool} = require('./api/db');
const server = app.listen(Number(process.env.PORT || 3000), () => console.info('Pharmacy API is listening.'));
server.requestTimeout = 15000; server.headersTimeout = 10000; server.keepAliveTimeout = 5000;
async function stop() { server.close(async () => { await pool.end(); process.exit(0); }); setTimeout(()=>process.exit(1),10000).unref(); }
process.once('SIGTERM',stop); process.once('SIGINT',stop);
