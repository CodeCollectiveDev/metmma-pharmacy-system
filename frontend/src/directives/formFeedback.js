import { userError } from '@/services/api/errors'

let sequence = 0
const controls = form => [...form.querySelectorAll('input:not([type=hidden]),select,textarea')]
function clear(input) {
  input.removeAttribute('aria-invalid')
  const id = input.dataset.feedbackId
  if (id) {
    input.closest('form')?.querySelector(`[id="${id}"]`)?.remove()
    const described = (input.getAttribute('aria-describedby') || '').split(' ').filter(x => x !== id).join(' ')
    if (described) input.setAttribute('aria-describedby', described)
    else input.removeAttribute('aria-describedby')
  }
}
function show(input, message) {
  clear(input)
  input.setAttribute('aria-invalid', 'true')
  const hint = document.createElement('span')
  hint.id = input.dataset.feedbackId ||= `field-feedback-${++sequence}`
  hint.className = 'field-error'
  hint.textContent = message
  input.insertAdjacentElement('afterend', hint)
  input.setAttribute('aria-describedby', [input.getAttribute('aria-describedby'), hint.id].filter(Boolean).join(' '))
}
function decorate(form) {
  form.querySelectorAll('.required-mark').forEach(marker => marker.remove())
  for (const input of controls(form)) {
    const label = input.closest('label') || (input.id ? form.querySelector(`label[for="${input.id}"]`) : null)
    if (!label || !input.required || label.querySelector('.required-mark')) continue
    const marker = document.createElement('span')
    marker.className = 'required-mark'
    marker.textContent = ' *'
    marker.setAttribute('aria-hidden', 'true')
    const target = [...label.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim())
    if (target) target.after(marker)
  }
}
function applyErrors(form, error) {
  if (form._feedbackError === error) return
  form._feedbackError = error
  controls(form).forEach(clear)
  if (!error) return
  let first
  for (const issue of userError(error).fields) {
    const input = controls(form).find(el => el.name === issue.field)
    if (input) { show(input, issue.message); first ||= input }
  }
  if (first) {
    let parent = first.parentElement
    while (parent && parent !== form) { if (parent.tagName === 'DETAILS') parent.open = true; parent = parent.parentElement }
    first.focus()
  }
}
export default {
  mounted(form, binding) {
    form._onInvalid = event => {
      event.preventDefault()
      show(event.target, event.target.validationMessage || 'Please complete this field.')
      if (!form._focusingInvalid) {
        form._focusingInvalid = true
        event.target.focus()
        queueMicrotask(() => { form._focusingInvalid = false })
      }
    }
    form._onInput = event => {
      const input = event.target
      clear(input)
      if (input.autocomplete === 'new-password') {
        input.setCustomValidity(new TextEncoder().encode(input.value).length > 72 ? 'This password is too long. Use fewer characters.' : '')
      }
    }
    form.addEventListener('invalid', form._onInvalid, true)
    form.addEventListener('input', form._onInput)
    decorate(form)
    applyErrors(form, binding.value)
  },
  updated(form, binding) { decorate(form); applyErrors(form, binding.value) },
  unmounted(form) { form.removeEventListener('invalid', form._onInvalid, true); form.removeEventListener('input', form._onInput) }
}
