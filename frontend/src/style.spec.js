import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8')

describe('receipt print styles', () => {
  it('forces black receipt text and a white background in dark mode', () => {
    const printStyles = css.slice(css.indexOf('@media print'))
    expect(printStyles).toMatch(/html\.dark body > \.receipt-print,\s*html\.dark body > \.receipt-print :where\([^)]*\)\s*\{[^}]*color:\s*#000\s*!important/)
    expect(printStyles).toMatch(/html\.dark body > \.receipt-print :where\([^)]*\)\s*\{[^}]*background-color:\s*#fff\s*!important/)
  })
})
