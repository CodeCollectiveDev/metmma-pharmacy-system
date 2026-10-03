import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import LeaveView from './LeaveView.vue'
import api from '@/services/api/apiClient'
vi.mock('@/services/api/apiClient',()=>({default:{get:vi.fn(),patch:vi.fn()}}))
vi.mock('@/composables/useFeedback',()=>({confirmAction:vi.fn().mockResolvedValue(true)}))
it('approves a pending request and reloads the selected page',async()=>{
 api.get.mockResolvedValue({data:{data:[{id:7,first_name:'Jane',last_name:'Staff',start_date:'2026-10-01',expected_return_date:'2026-10-02',status:'pending'}],pagination:{page:1,totalPages:1,total:1}}});api.patch.mockResolvedValue({data:{}})
 const w=mount(LeaveView,{global:{stubs:{MainLayout:{template:'<main><slot/></main>'},AppDialog:true,RouterLink:true}}});await flushPromises()
 await w.findAll('button').find(b=>b.text()==='Approve').trigger('click');await flushPromises()
 expect(api.patch).toHaveBeenCalledWith('/leave/7',{status:'approved'});expect(api.get).toHaveBeenLastCalledWith('/leave',{params:{page:1,status:'pending'}});expect(w.text()).toContain('Leave status updated');w.unmount()
})
