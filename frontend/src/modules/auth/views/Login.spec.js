import {it,expect,vi} from 'vitest'
import {mount} from '@vue/test-utils'
vi.mock('vue-router',()=>({useRouter:()=>({push:vi.fn()})}))
import Login from './Login.vue'
it('lets the user reveal the password on the sign-in screen',async()=>{
 const w=mount(Login)
 expect(w.get('#password').attributes('type')).toBe('password')
 await w.get('button[aria-label="Show password"]').trigger('click')
 expect(w.get('#password').attributes('type')).toBe('text')
 expect(w.get('label[for="password"]').exists()).toBe(true)
 await w.get('#password').setValue('SecretPassword1')
 await w.get('button[aria-label="Hide password"]').trigger('click')
 expect(w.get('#password').attributes('type')).toBe('password');w.unmount()
})
