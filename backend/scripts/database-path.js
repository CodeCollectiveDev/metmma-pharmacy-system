const { existsSync } = require('node:fs');
const { resolve } = require('node:path');

// PM2 releases bundle database/ inside the backend. Source checkouts and the
// Docker image keep it beside the backend. Never depend on the shell's cwd.
const candidates = [resolve(__dirname, '../database'), resolve(__dirname, '../../database')];
const databasePath = candidates.find(path => existsSync(resolve(path, 'init.sql')));
if (!databasePath) {
  throw new Error(`Database SQL files are missing. Expected init.sql in: ${candidates.join(', ')}`);
}

module.exports = databasePath;
