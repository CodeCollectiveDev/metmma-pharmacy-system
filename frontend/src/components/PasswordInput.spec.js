import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import PasswordInput from './PasswordInput.vue'
it('reveals and hides the value while it is being typed',async()=>{
 const w=mount(PasswordInput,{props:{label:'Password',autocomplete:'current-password',placeholder:'••••••••',modelValue:'hunter2'}})
 const input=w.get('input'), toggle=w.get('button')
 expect(w.get('label').attributes('for')).toBe(input.attributes('id'))
 expect(input.attributes('type')).toBe('password');expect(input.attributes('placeholder')).toBe('••••••••')
 expect(toggle.attributes('aria-label')).toBe('Show password');expect(toggle.attributes('type')).toBe('button')
 await toggle.trigger('click')
 expect(w.get('input').attributes('type')).toBe('text');expect(w.get('button').attributes('aria-label')).toBe('Hide password')
 expect(toggle.attributes('title')).toBe('Hide password')
 await w.get('input').setValue('hunter2!')
 expect(w.emitted('update:modelValue').at(-1)).toEqual(['hunter2!'])
 await toggle.trigger('click')
 expect(w.get('input').attributes('type')).toBe('password');w.unmount()
})
