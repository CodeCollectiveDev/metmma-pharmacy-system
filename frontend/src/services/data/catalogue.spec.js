import {beforeEach,expect,it,vi} from 'vitest'
import {createPinia,setActivePinia} from 'pinia'
import {useInventoryStore} from '@/modules/inventory/store/inventoryStore'
import {dataService} from '@/services/api/dataService'
vi.mock('@/services/api/dataService',()=>({dataService:{getProductPage:vi.fn(),getProductSummary:vi.fn()}}))
beforeEach(()=>{vi.resetAllMocks();setActivePinia(createPinia())})
it('inventory requests one bounded page and uses server-wide summary counts',async()=>{dataService.getProductPage.mockResolvedValue({data:{data:[{id:103}],pagination:{page:5,total:103,hasMore:false}}});dataService.getProductSummary.mockResolvedValue({data:{total:103,low:1,expired:0}});const s=useInventoryStore();await s.fetchProducts({page:5});await s.refreshSummary();expect(s.summary.total).toBe(103);expect(s.products[0].id).toBe(103);expect(dataService.getProductPage).toHaveBeenCalledWith({page:5,limit:25})})
it('API failures remain failures rather than being replaced by cached money or stock',async()=>{const error={request:{}};dataService.getProductPage.mockRejectedValue(error);const s=useInventoryStore();await s.fetchProducts();expect(s.error).toEqual(error);expect(s.products).toEqual([])})
