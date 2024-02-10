// using 'events' module from npm, for browser compatibility
// @ts-ignore
import * as PortableEventEmitterModule from 'events-es6'; 
import type {EventEmitter as EventEmitterType} from 'events'
export const EventEmitter:typeof EventEmitterType = (()=>{
    if(PortableEventEmitterModule?.default) {
        return PortableEventEmitterModule.default;
    }
    return PortableEventEmitterModule;
})();