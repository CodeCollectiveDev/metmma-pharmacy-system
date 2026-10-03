import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import ReceiptDialog from './ReceiptDialog.vue'
const sale={receiptNumber:'REC-42',date:'2026-10-03T10:00:00Z',cashier:'Cashier',paymentMethod:'cash',subtotal:'10.00',tax:'1.65',totalAmount:'11.65',amountReceived:'20.00',changeGiven:'8.35',items:[{productId:1,name:'Medicine',quantity:1,unitPrice:'10.00',subtotal:'10.00'}]}
it('prepares a standalone printable receipt and opens the browser print dialog',async()=>{
 const print=vi.spyOn(window,'print').mockImplementation(()=>{})
 const w=mount(ReceiptDialog,{props:{sale,open:true},global:{stubs:{AppDialog:{template:'<section><slot/></section>'}}}})
 expect(document.querySelector('.receipt-print').textContent).toContain('REC-42');expect(w.text()).toContain('Change');
 await w.findAll('button').find(b=>b.text()==='Print receipt').trigger('click');await flushPromises();expect(print).toHaveBeenCalledOnce()
 await w.setProps({open:false});expect(document.querySelector('.receipt-print')).toBeNull();w.unmount();print.mockRestore()
})
