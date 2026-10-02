import {beforeEach,expect,it,vi} from 'vitest'
import apiClient from './apiClient'
import {dataService} from './dataService'
import {createRequire} from 'node:module'
vi.mock('./apiClient',()=>({default:{get:vi.fn(),post:vi.fn(),put:vi.fn(),delete:vi.fn()}}))
const {saleSchema}=createRequire(import.meta.url)('../../../../backend/api/validators/salesValidator.js')
beforeEach(()=>vi.resetAllMocks())
it('keeps the idempotency key and sends only accepted checkout fields',async()=>{await dataService.recordSale({idempotencyKey:'123e4567-e89b-42d3-a456-426614174000',items:[{productId:1,name:'Medicine',quantity:1,unitPrice:'10.00',subtotal:'10.00'}],totalAmount:'11.65',paymentMethod:'cash',date:'local',syncStatus:'old'});const[url,payload]=apiClient.post.mock.calls[0];expect(url).toBe('/sales/checkout');expect(payload.idempotencyKey).toBe('123e4567-e89b-42d3-a456-426614174000');expect(payload).not.toHaveProperty('syncStatus');expect(saleSchema.validate(payload).error).toBeUndefined()})
it('fetches one requested product page with unchanged metadata',async()=>{const r={data:{data:[],pagination:{page:2,hasMore:false}}};apiClient.get.mockResolvedValue(r);expect(await dataService.getProductPage({page:2,search:'Last'})).toBe(r);expect(apiClient.get).toHaveBeenCalledTimes(1)})
it('uses the actual attendance route',async()=>{await dataService.getAttendance(2);expect(apiClient.get).toHaveBeenCalledWith('/attendance/employee/2',{params:{}})})
it('strips local identifiers before product updates',async()=>{await dataService.updateProduct({id:2,_id:'2',quantity:15,expectedQuantity:10,reason:'Delivery'});expect(apiClient.put).toHaveBeenCalledWith('/products/2',{quantity:15,expectedQuantity:10,reason:'Delivery'})})
