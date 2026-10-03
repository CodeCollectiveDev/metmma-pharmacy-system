import {expect,it,vi} from 'vitest'
import {userError} from './errors'
it.each([[400,'VALIDATION'],[401,'SESSION_EXPIRED'],[403,'PERMISSION_DENIED'],[404,'NOT_FOUND'],[409,'CONFLICT'],[500,'UNEXPECTED']])('maps HTTP %s to safe %s without raw internal text', (status,code)=>{const error=userError({response:{status,data:{message:'SQL stack secret',errors:[{field:'amount',message:'private'}]}}});expect(error.code).toBe(code);expect(JSON.stringify(error)).not.toMatch(/SQL|stack|secret|private/);expect(error.fields[0].field).toBe('amount')})
it('distinguishes offline and network failures',()=>{vi.spyOn(navigator,'onLine','get').mockReturnValue(false);expect(userError({request:{}}).code).toBe('OFFLINE');vi.spyOn(navigator,'onLine','get').mockReturnValue(true);expect(userError({request:{}}).code).toBe('NETWORK')})
it('unknown server codes cannot become raw UI messages',()=>{expect(userError({response:{status:500,data:{code:'SQL_23501',message:'private'}}}).code).toBe('UNEXPECTED')})
