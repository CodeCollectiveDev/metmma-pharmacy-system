import { beforeEach, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePosStore } from './posStore'
import { dataService } from '@/services/api/dataService'
vi.mock('@/services/api/dataService',()=>({dataService:{getConfig:vi.fn(),getProductPage:vi.fn(),getProduct:vi.fn(),recordSale:vi.fn()}}))
const products=[{id:1,name:'Medicine',quantity:10,sellingPrice:'10.00',reorderLevel:2},{id:103,name:'Last product',quantity:2,sellingPrice:'0.20'}]
beforeEach(()=>{vi.resetAllMocks();localStorage.clear();localStorage.setItem('user',JSON.stringify({id:3,name:'Cashier'}));setActivePinia(createPinia());dataService.getConfig.mockResolvedValue({data:{taxRateBps:1650}});dataService.getProductPage.mockResolvedValue({data:{data:products}});dataService.recordSale.mockResolvedValue({data:{data:{id:9,receiptNumber:'REC-9',items:[{productId:1,remainingStock:9}]}}})})
async function ready(){const s=usePosStore();await s.configure();await s.fetchProducts();return s}
it('requests bounded authoritative POS results including products beyond the first catalogue page',async()=>{const s=await ready();s.searchQuery='Last';await s.fetchProducts();expect(dataService.getProductPage).toHaveBeenLastCalledWith(expect.objectContaining({search:'Last',sellable:true,limit:40}));expect(s.products[1].id).toBe(103)})
it('uses integer minor units for cart and VAT totals',async()=>{const s=await ready();s.addToCart({...s.products[0],price:'0.10'});s.addToCart(s.products[1]);expect(s.cartTotal).toBe(0.30);expect(s.taxMinor).toBe(5);expect(s.totalAmount).toBe(0.35)})
it('prevents overselling and keeps errors in readable UI state',async()=>{const s=await ready();s.addToCart({...s.products[0],stock:0});expect(s.cart).toHaveLength(0);expect(s.error.code).toBe('INSUFFICIENT_STOCK')})
it('successful checkout clears the cart and uses the response stock without a catalogue request',async()=>{const s=await ready();s.addToCart(s.products[0]);const result=await s.checkout('cash');expect(result.transaction.receiptNumber).toBe('REC-9');expect(s.cart).toHaveLength(0);expect(s.products[0].stock).toBe(9);expect(dataService.getProductPage).toHaveBeenCalledTimes(1);expect(dataService.recordSale.mock.calls[0][0]).toMatchObject({totalAmount:'11.65',items:[{productId:1,quantity:1,unitPrice:'10.00',subtotal:'10.00'}]})})
it.each([400,401,403,409,500])('retains the cart for rejected HTTP %s',async status=>{const s=await ready();s.addToCart(s.products[0]);dataService.recordSale.mockRejectedValue({response:{status,data:{code:status===409?'INSUFFICIENT_STOCK':undefined}}});await expect(s.checkout('cash')).rejects.toBeDefined();expect(s.cart).toHaveLength(1)})
it('ambiguous network failure retains the checkout key across reload and retry',async()=>{const s=await ready();s.addToCart(s.products[0]);dataService.recordSale.mockRejectedValueOnce({request:{}});await expect(s.checkout('cash')).rejects.toBeDefined();const key=s.pending.idempotencyKey;s.updateQuantity('1',1);expect(s.cart[0].quantity).toBe(1);setActivePinia(createPinia());const restored=usePosStore();restored.restoreCart();expect(restored.pending.idempotencyKey).toBe(key);expect(restored.cart).toHaveLength(1);await restored.checkout('card');expect(dataService.recordSale.mock.calls[1][0].idempotencyKey).toBe(key);expect(dataService.recordSale.mock.calls[1][0].paymentMethod).toBe('cash')})
it('never restores another staff member’s cart',async()=>{const s=await ready();s.addToCart(s.products[0]);localStorage.setItem('user',JSON.stringify({id:4}));s.restoreCart();expect(s.cart).toHaveLength(0)})
it('scanner resolves a real barcode through the server',async()=>{const s=await ready();dataService.getProductPage.mockResolvedValueOnce({data:{data:[products[0]]}});expect(await s.scan('900123')).toBe(true);expect(dataService.getProductPage).toHaveBeenLastCalledWith({barcode:'900123',sellable:true,limit:2});expect(s.cart).toHaveLength(1)})
it('does not submit when the retry reference cannot survive a reload',async()=>{
 const s=await ready();s.addToCart(s.products[0]);
 const quota=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota detail')});
 try{await expect(s.checkout('cash')).rejects.toMatchObject({code:'UNEXPECTED'});expect(dataService.recordSale).not.toHaveBeenCalled();expect(s.cart).toHaveLength(1);}
 finally{quota.mockRestore();}
 const key=s.pending.idempotencyKey;await s.checkout('cash');expect(dataService.recordSale).toHaveBeenCalledTimes(1);expect(dataService.recordSale.mock.calls[0][0].idempotencyKey).toBe(key);
})
