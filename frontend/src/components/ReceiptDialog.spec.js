import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import ReceiptDialog from './ReceiptDialog.vue'
import { renderReceiptPng } from '@/services/receiptExport'
vi.mock('@/composables/usePharmacyProfile', async () => {
 const { ref } = await import('vue')
 return { cachedPharmacyProfile: ref({ pharmacyName: 'METMMA Pharmacy' }), fetchPharmacyProfile: vi.fn(() => Promise.resolve()) }
})
vi.mock('@/services/receiptExport', async importOriginal => {
 const actual = await importOriginal()
 return { ...actual, renderReceiptPng: vi.fn(() => Promise.resolve(new Blob(['png'], { type: 'image/png' }))) }
})
const sale={receiptNumber:'REC-42',date:'2026-10-03T10:00:00Z',cashier:'Cashier',paymentMethod:'cash',subtotal:'10.00',tax:'1.65',totalAmount:'11.65',amountReceived:'20.00',changeGiven:'8.35',items:[{productId:1,name:'Medicine',quantity:1,unitPrice:'10.00',subtotal:'10.00'}]}
it('prepares a standalone printable receipt and opens the browser print dialog',async()=>{
 const print=vi.spyOn(window,'print').mockImplementation(()=>{})
 const w=mount(ReceiptDialog,{props:{sale,open:true},global:{stubs:{AppDialog:{template:'<section><slot/></section>'}}}})
 expect(document.querySelector('.receipt-print').textContent).toContain('REC-42');expect(w.text()).toContain('Change');
 await w.findAll('button').find(b=>b.text()==='Print receipt').trigger('click');await flushPromises();expect(print).toHaveBeenCalledOnce()
 await w.setProps({open:false});expect(document.querySelector('.receipt-print')).toBeNull();w.unmount();print.mockRestore()
})

it('downloads the receipt as a png named after the receipt number',async()=>{
 const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(){this.ownerDocument.body.dataset.downloaded=this.download})
 const createObjectURL=vi.fn(()=>'blob:receipt'),revokeObjectURL=vi.fn()
 URL.createObjectURL=createObjectURL;URL.revokeObjectURL=revokeObjectURL
 const w=mount(ReceiptDialog,{props:{sale:{...sale,id:123},open:true},global:{stubs:{AppDialog:{template:'<section><slot/></section>'}}}})
 await flushPromises()
 await w.findAll('button').find(b=>b.text()==='Download').trigger('click');await flushPromises()
 expect(renderReceiptPng).toHaveBeenCalledOnce()
 expect(createObjectURL).toHaveBeenCalledOnce()
 expect(document.body.dataset.downloaded).toBe('R-000123.png')
 expect(w.text()).toContain('Receipt downloaded.')
 click.mockRestore();delete document.body.dataset.downloaded;w.unmount()
})

it('copies a text summary when the device cannot share files',async()=>{
 const writeText=vi.fn(()=>Promise.resolve())
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}})
 Object.defineProperty(navigator,'share',{configurable:true,value:undefined})
 Object.defineProperty(navigator,'canShare',{configurable:true,value:undefined})
 const w=mount(ReceiptDialog,{props:{sale,open:true},global:{stubs:{AppDialog:{template:'<section><slot/></section>'}}}})
 await flushPromises()
 await w.findAll('button').find(b=>b.text()==='Share').trigger('click');await flushPromises()
 expect(writeText).toHaveBeenCalledWith(expect.stringContaining('REC-42'))
 expect(w.text()).toContain('copied to the clipboard')
 w.unmount()
})
