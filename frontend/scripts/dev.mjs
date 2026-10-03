import { spawn } from 'node:child_process'
// This process environment wins over all Vite .env files, including production URLs.
const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', ...process.argv.slice(2)], {
  stdio: 'inherit', env: { ...process.env, VITE_API_BASE_URL: '/api' },
})
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
