import {beforeEach,it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import AttendancePanel from './AttendancePanel.vue'
import api from '@/services/api/apiClient'
vi.mock('@/services/api/apiClient',()=>({default:{get:vi.fn(),post:vi.fn()}}))
beforeEach(()=>{vi.resetAllMocks();api.get.mockResolvedValue({data:{data:[{employee_id:3,first_name:'Jane',last_name:'Staff',status:'present'}],pagination:{page:1,totalPages:1,total:1}}});api.post.mockResolvedValue({data:{}})})
it('loads and corrects attendance for the chosen date',async()=>{
 const w=mount(AttendancePanel);await flushPromises();await w.get('[aria-label="Attendance date"]').setValue('2026-09-20');await flushPromises()
 expect(api.get).toHaveBeenLastCalledWith('/attendance/day',{params:{page:1,search:'',start:'2026-09-20'}})
 await w.get('[aria-label="Status for Jane Staff"]').setValue('late');await w.findAll('button').find(b=>b.text()==='Save').trigger('click');await flushPromises()
 expect(api.post).toHaveBeenCalledWith('/attendance',{employee_id:3,date:'2026-09-20',status:'late'});expect(w.text()).toContain('saved for 2026-09-20');w.unmount()
})
it('filters attendance history by a date range and name',async()=>{
 const w=mount(AttendancePanel);await flushPromises();await w.findAll('button').find(b=>b.text()==='Attendance history').trigger('click');await flushPromises()
 await w.get('[aria-label="Attendance from"]').setValue('2026-09-01');await w.get('[aria-label="Attendance to"]').setValue('2026-09-30');await w.get('input[placeholder="Name or staff code"]').setValue('Jane');await w.get('form').trigger('submit');await flushPromises()
 expect(api.get).toHaveBeenLastCalledWith('/attendance',{params:{page:1,search:'Jane',start:'2026-09-01',end:'2026-09-30',status:undefined}});w.unmount()
})
