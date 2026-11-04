import { receiptLabel } from '@/services/api/display'
import { currency } from '@/services/api/money'

const WIDTH = 360
const PADDING = 12
const SCALE = 2

const STYLE_PROPERTIES = [
  'display', 'box-sizing',
  'font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing', 'line-height',
  'text-align', 'text-decoration', 'text-transform', 'white-space', 'word-break', 'overflow-wrap', 'vertical-align',
  'flex-direction', 'justify-content', 'align-items', 'gap',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-radius'
]

export function receiptText(sale, profile = null) {
  if (!sale) return ''
  const lines = [
    profile?.pharmacyName || 'METMMA Pharmacy',
    'Sales receipt',
    receiptLabel(sale),
    new Date(sale.date).toLocaleString(),
    `Served by: ${sale.cashier || 'Staff member'}`,
    `Customer: ${sale.customerName || 'Walk-in customer'}`
  ]
  if (sale.status === 'reversed') lines.push('REVERSED — this sale was refunded or voided')
  lines.push('')
  for (const item of sale.items || []) {
    lines.push(`${item.name} — ${item.quantity} × ${currency(item.unitPrice)} = ${currency(item.subtotal)}`)
  }
  lines.push('', `Total: ${currency(sale.totalAmount)}`, `Payment: ${(sale.paymentMethod || 'cash').replaceAll('_', ' ')}`)
  if (sale.amountReceived != null) lines.push(`Received: ${currency(sale.amountReceived)}`)
  if (sale.changeGiven != null && sale.paymentMethod === 'cash') lines.push(`Change: ${currency(sale.changeGiven)}`)
  if (profile?.phone) lines.push(`Phone: ${profile.phone}`)
  if (profile?.email) lines.push(profile.email)
  if (profile?.address) lines.push(profile.address)
  lines.push('Thank you for your purchase.')
  return lines.join('\n')
}

export function receiptFileName(sale) {
  const name = receiptLabel(sale).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'receipt'
  return `${name}.png`
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const copied = document.execCommand?.('copy')
  area.remove()
  if (!copied) throw new Error('The clipboard is not available')
}

function fileToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read the receipt image'))
    reader.readAsDataURL(blob)
  })
}

async function inlineImage(image) {
  const source = image.getAttribute('src')
  if (!source) return
  if (source.startsWith('data:')) return
  try {
    const response = await fetch(source)
    if (!response.ok) throw new Error('Image request failed')
    image.setAttribute('src', await fileToDataUrl(await response.blob()))
  } catch {
    image.remove()
  }
}

function inlineStyles(root) {
  const elements = [root, ...root.querySelectorAll('*')]
  for (const element of elements) {
    const styles = window.getComputedStyle(element)
    for (const property of STYLE_PROPERTIES) {
      const value = styles.getPropertyValue(property)
      if (value) element.style.setProperty(property, value)
    }
    if (element.tagName === 'IMG') {
      element.style.setProperty('width', styles.getPropertyValue('width'))
      element.style.setProperty('height', styles.getPropertyValue('height'))
      element.style.setProperty('object-fit', styles.getPropertyValue('object-fit'))
    }
    element.style.setProperty('color', '#000', 'important')
    element.style.setProperty('background-color', 'transparent', 'important')
    element.style.setProperty('background-image', 'none', 'important')
    for (const side of ['top', 'right', 'bottom', 'left']) element.style.setProperty(`border-${side}-color`, '#000', 'important')
  }
  root.style.setProperty('width', '100%', 'important')
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not render the receipt image'))
    image.src = source
  })
}

export async function renderReceiptPng(element) {
  if (!element) throw new Error('The receipt is not available')

  const clone = element.cloneNode(true)
  for (const picture of clone.querySelectorAll('picture')) {
    const fallback = picture.querySelector('img')
    if (fallback) picture.replaceWith(fallback)
    else picture.remove()
  }

  const host = document.createElement('div')
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${WIDTH}px;padding:${PADDING}px;box-sizing:border-box;background:#fff;color:#000;`
  host.appendChild(clone)
  document.body.appendChild(host)

  try {
    await document.fonts?.ready
    await Promise.all([...clone.querySelectorAll('img')].map(inlineImage))
    inlineStyles(clone)

    const height = Math.ceil(host.getBoundingClientRect().height)
    if (!height) throw new Error('The receipt is empty')

    const serialized = new XMLSerializer().serializeToString(clone)
    const wrapper = `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${WIDTH}px;padding:${PADDING}px;box-sizing:border-box;background:#fff;color:#000;font-family:Arial,sans-serif;">${serialized}</div>`
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}"><foreignObject width="100%" height="100%">${wrapper}</foreignObject></svg>`
    const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)

    const canvas = document.createElement('canvas')
    canvas.width = WIDTH * SCALE
    canvas.height = height * SCALE
    const context = canvas.getContext('2d')
    if (!context) throw new Error('This device cannot create the receipt image')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.setTransform(SCALE, 0, 0, SCALE, 0, 0)
    context.drawImage(image, 0, 0, WIDTH, height)

    return await new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not save the receipt image')), 'image/png')
    })
  } finally {
    host.remove()
  }
}
