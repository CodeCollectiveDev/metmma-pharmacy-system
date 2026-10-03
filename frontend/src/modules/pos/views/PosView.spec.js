import { beforeEach,expect,it,vi } from 'vitest'
import { mount,flushPromises } from '@vue/test-utils'
import { createPinia,setActivePinia } from 'pinia'
import PosView from './PosView.vue'
import { usePosStore } from '../store/posStore'
import { currency } from '@/services/api/money'
import { dataService } from '@/services/api/dataService'
vi.mock('@/services/api/dataService',()=>({dataService:{getConfig:vi.fn(),getProductPage:vi.fn(),getProduct:vi.fn(),recordSale:vi.fn()}}))
beforeEach(()=>{vi.resetAllMocks();localStorage.clear();localStorage.setItem('user',JSON.stringify({id:1}));setActivePinia(createPinia());dataService.getConfig.mockResolvedValue({data:{taxRateBps:1650}});dataService.getProductPage.mockResolvedValue({data:{data:[{id:1,name:'Medicine',quantity:10,sellingPrice:'10.00'}]}})})
async function checkout(){const w=mount(PosView,{global:{stubs:{MainLayout:{template:'<main><slot /></main>'},AppDialog:{props:['open','title'],template:'<div v-if="open"><h2>{{title}}</h2><slot /></div>'}}}});await flushPromises();const s=usePosStore();s.addToCart(s.products[0]);await w.vm.$nextTick();await w.get('input[aria-label="Amount received"]').setValue('20.00');await w.findAll('button').find(b=>b.text()==='Complete Sale').trigger('click');await flushPromises();return{w,s}}
it('shows a confirmed receipt',async()=>{dataService.recordSale.mockResolvedValue({data:{data:{receiptNumber:'REC-confirmed',date:new Date().toISOString(),cashier:'Admin',paymentMethod:'cash',items:[{productId:1,name:'Medicine',quantity:1,subtotal:'10.00',remainingStock:9}],totalAmount:'11.65',tax:'1.65',subtotal:'10.00'}}});const{w,s}=await checkout();expect(w.text()).toContain('REC-confirmed');expect(s.cart).toHaveLength(0);w.unmount()})
it('shows safe inline validation and retains the cart without exposing server text',async()=>{dataService.recordSale.mockRejectedValue({response:{status:400,data:{message:'SQL secret detail',errors:[{field:'items.0.quantity',message:'raw'}]}}});const{w,s}=await checkout();expect(w.text()).toContain('Please check');expect(w.text()).not.toContain('SQL');expect(w.text()).not.toContain('Sales Receipt');expect(s.cart).toHaveLength(1);w.unmount()})
it('network failure shows retry and retains the pending sale',async()=>{dataService.recordSale.mockRejectedValue({request:{}});const{w,s}=await checkout();expect(w.text()).toContain('Retry sale');expect(w.text()).not.toContain('Sales Receipt');expect(s.pending).toBeTruthy();expect(s.cart).toHaveLength(1);w.unmount()})
it('loads products even when checkout configuration fails',async()=>{
 dataService.getConfig.mockRejectedValue({request:{}})
 const w=mount(PosView,{global:{stubs:{MainLayout:{template:'<main><slot/></main>'},AppDialog:true}}});await flushPromises()
 expect(w.findAll('button').some(b=>b.attributes('aria-label')==='Add Medicine to cart')).toBe(true)
 expect(w.findAll('button').find(b=>b.text()==='Complete Sale').attributes('disabled')).toBeDefined();w.unmount()
})
it('shows exact cash change and blocks underpayment',async()=>{
 const w=mount(PosView,{global:{stubs:{MainLayout:{template:'<main><slot/></main>'},AppDialog:true}}});await flushPromises();const s=usePosStore();s.addToCart(s.products[0]);await flushPromises()
 await w.get('input[aria-label="Amount received"]').setValue('20');expect(w.text()).toContain(`Change to give: ${currency(8.35)}`)
 await w.get('input[aria-label="Amount received"]').setValue('10');expect(w.text()).toContain(`Still owed: ${currency(1.65)}`);expect(w.findAll('button').find(b=>b.text()==='Complete Sale').attributes('disabled')).toBeDefined();w.unmount()
})
