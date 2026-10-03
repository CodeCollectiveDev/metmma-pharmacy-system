import {beforeEach,it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import BarcodeScanner from './BarcodeScanner.vue'
const mock=vi.hoisted(()=>({decode:vi.fn()}))
vi.mock('@zxing/browser',()=>({BrowserMultiFormatReader:class {decodeFromStream(...args){return mock.decode(...args)}}}))
beforeEach(()=>vi.resetAllMocks())
it('emits one detection and releases the camera',async()=>{
 const stop=vi.fn(),controlStop=vi.fn();let detected
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:vi.fn().mockResolvedValue({getTracks:()=>[{stop}]})}})
 mock.decode.mockImplementation(async(s,v,cb)=>{detected=cb;return{stop:controlStop}})
 const w=mount(BarcodeScanner);await flushPromises();detected({getText:()=> '001234'});detected({getText:()=> '001234'})
 expect(w.emitted('detected')).toEqual([['001234']]);expect(stop).toHaveBeenCalled();expect(controlStop).toHaveBeenCalled();w.unmount()
})
it('releases a stream granted after the scanner was closed',async()=>{
 let grant;const stop=vi.fn()
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:vi.fn(()=>new Promise(r=>{grant=r}))}})
 const w=mount(BarcodeScanner);w.unmount();grant({getTracks:()=>[{stop}]});await flushPromises();expect(stop).toHaveBeenCalled();expect(mock.decode).not.toHaveBeenCalled()
})
it('offers manual entry when camera access is unavailable',async()=>{
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:undefined})
 const w=mount(BarcodeScanner);await flushPromises();expect(w.get('[role="alert"]').text()).toContain('USB scanner');w.unmount()
})
