import {beforeEach,it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import AccountsView from './AccountsView.vue'
import api from '@/services/api/apiClient'
vi.mock('@/services/api/apiClient',()=>({default:{get:vi.fn(),post:vi.fn(),patch:vi.fn()}}))
const stubs={MainLayout:{template:'<main><slot/></main>'},AppDialog:{props:['open'],template:'<section v-if="open"><slot/></section>'}}
beforeEach(()=>{vi.resetAllMocks();localStorage.setItem('user',JSON.stringify({id:1}));api.get.mockResolvedValue({data:{data:[],pagination:{page:1,totalPages:1,total:0,hasMore:false}}});api.post.mockResolvedValue({data:{}})})
it('creates an account linked to the selected existing staff member',async()=>{
 const w=mount(AccountsView,{global:{stubs}});await flushPromises()
 api.get.mockResolvedValueOnce({data:{data:[{id:8,first_name:'Jane',last_name:'Staff',email:'jane@example.com',is_active:true,user_id:null}],pagination:{page:1,totalPages:1,total:1}}})
 await w.findAll('button').find(b=>b.text()==='Create account').trigger('click');await flushPromises()
 const section=w.get('section');await section.findAll('select')[1].setValue('8')
 await section.get('input[autocomplete="off"]').setValue('janestaff');await section.get('input[type="password"]').setValue('SecretPassword42')
 await section.get('form').trigger('submit');await flushPromises()
 expect(api.post).toHaveBeenCalledWith('/auth/register',expect.objectContaining({username:'janestaff',full_name:'Jane Staff',email:'jane@example.com',employee_id:8,password:'SecretPassword42'}));expect(w.text()).toContain('Account created');w.unmount()
})
const openPasswordDialog=async w=>{await w.findAll('button').find(b=>b.text()==='Change my password').trigger('click');await flushPromises();return w.get('section')}
it('changes the signed-in administrator password and stores the reissued session token',async()=>{
 localStorage.setItem('token','stale-token')
 api.post.mockResolvedValueOnce({data:{success:true,token:'fresh-token',user:{id:1,username:'boss',role:'admin'}}})
 const w=mount(AccountsView,{global:{stubs}});await flushPromises()
 const section=await openPasswordDialog(w)
 const inputs=section.findAll('input')
 await inputs[0].setValue('CurrentPassword1');await inputs[1].setValue('BrandNewPassword1');await inputs[2].setValue('BrandNewPassword1')
 await section.get('form').trigger('submit');await flushPromises()
 expect(api.post).toHaveBeenCalledWith('/auth/change-password',{current_password:'CurrentPassword1',password:'BrandNewPassword1'})
 expect(localStorage.getItem('token')).toBe('fresh-token')
 expect(w.text()).toContain('Password changed');w.unmount()
})
it('blocks a confirmation that does not match the new password before calling the API',async()=>{
 const w=mount(AccountsView,{global:{stubs}});await flushPromises()
 const section=await openPasswordDialog(w)
 const inputs=section.findAll('input')
 await inputs[0].setValue('CurrentPassword1');await inputs[1].setValue('BrandNewPassword1');await inputs[2].setValue('DifferentPassword1')
 await section.get('form').trigger('submit');await flushPromises()
 expect(api.post).not.toHaveBeenCalled()
 expect(w.text()).toContain('New passwords do not match');w.unmount()
})
it('reveals each password field while it is being typed',async()=>{
 const w=mount(AccountsView,{global:{stubs}});await flushPromises()
 const section=await openPasswordDialog(w)
 const types=()=>section.findAll('input').map(i=>i.attributes('type'))
 expect(types()).toEqual(['password','password','password'])
 const toggles=section.findAll('button').filter(b=>b.attributes('aria-label')==='Show password')
 expect(toggles).toHaveLength(3)
 await toggles[1].trigger('click')
 expect(types()).toEqual(['password','text','password']);w.unmount()
})
