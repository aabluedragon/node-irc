import {IrcConnection, IrcConnectionEventsMap} from './irc'
import {IMessageEvent, w3cwebsocket} from 'websocket';

// using 'events' module from npm, for browser compatibility

// @ts-ignore
import * as PortableEventEmitterModule from '../node_modules/events/events'; 
import type {EventEmitter as EventEmitterType} from 'events'

const EventEmitter:typeof EventEmitterType = (()=>{
    if(PortableEventEmitterModule?.default) {
        return PortableEventEmitterModule.default;
    }
    return PortableEventEmitterModule;
})();

export class WebsocketWrapper extends w3cwebsocket implements IrcConnection {

    #timeoutMS: number|undefined = undefined;
    #timeoutTimer: any = undefined;
    ee: EventEmitterType = new EventEmitter();

    extendTimeoutTimer() {
        if(this.#timeoutMS === null || this.#timeoutMS === undefined) return;

        clearTimeout(this.#timeoutTimer);
        this.#timeoutTimer = setTimeout(()=>{
            this.#timeoutTimer = undefined;
            this.ee.emit('timeout');
        }, this.#timeoutMS);
    }

    dismissTimeoutTimer() {
        clearTimeout(this.#timeoutTimer);
        this.#timeoutTimer = undefined;
    }

    constructor(remote:string, protocols:string|string[]|undefined) {
        super(remote, protocols);

        this.extendTimeoutTimer();

        this.onopen = ()=>{
            this.extendTimeoutTimer();
            this.ee.emit('connect');
        }

        this.onclose = ()=>{
            this.ee.emit('end');
            this.ee.emit('close');
            this.dismissTimeoutTimer();
        }

        this.onerror = (ev:Error)=>{
            this.ee.emit('error', ev);
            this.dismissTimeoutTimer();
        }
        this.onmessage = (ev:IMessageEvent)=>{
            this.extendTimeoutTimer();
            this.ee.emit('data', ev?.data);
        }
    }

    //
    // IrcConnection
    //
    get connecting() {
        return this.readyState == w3cwebsocket.CONNECTING;
    };
    setTimeout(timeoutMS?: number|undefined): void {
        this.#timeoutMS = timeoutMS;
        this.extendTimeoutTimer(); 
    }
    destroy():void {
        super.close();
    }
    write(data: string): void {
        this.extendTimeoutTimer();
        super.send(data);
    }
    end(): void {
        // Cannot send FIN packet in Websockets, so just destroy.
        this.destroy();
    }
    addListener<E extends keyof IrcConnectionEventsMap>(event: E, listener: IrcConnectionEventsMap[E]): this {
        this.ee.addListener(event,listener);
        return this;
    }
    on<E extends keyof IrcConnectionEventsMap>(event: E, listener: IrcConnectionEventsMap[E]): this {
        this.ee.on(event,listener);
        return this;
    }
    once<E extends keyof IrcConnectionEventsMap>(event: E, listener: IrcConnectionEventsMap[E]): this {
        this.ee.once(event,listener);
        return this;
    }
    prependListener<E extends keyof IrcConnectionEventsMap>(event: E, listener: IrcConnectionEventsMap[E]): this {
        this.ee.prependListener(event,listener);
        return this;
    }
    prependOnceListener<E extends keyof IrcConnectionEventsMap>(event: E, listener: IrcConnectionEventsMap[E]): this {
        this.ee.prependOnceListener(event,listener);
        return this;
    }
    off<E extends keyof IrcConnectionEventsMap>(event: E, listener: IrcConnectionEventsMap[E]): this {
        this.ee.off(event,listener);
        return this;
    }
    removeAllListeners<E extends keyof IrcConnectionEventsMap>(event?: E | undefined): this {
        this.ee.removeAllListeners(event);
        return this;
    }
    removeListener<E extends keyof IrcConnectionEventsMap>(event: E, listener: IrcConnectionEventsMap[E]): this {
        this.ee.removeListener(event,listener);
        return this;
    }
    emit<E extends keyof IrcConnectionEventsMap>(event: E, ...args: Parameters<IrcConnectionEventsMap[E]>): boolean {
        return this.ee.emit(event, ...args);
    }
    eventNames(): (string | symbol)[] {
        return this.ee.eventNames();
    }
    rawListeners<E extends keyof IrcConnectionEventsMap>(event: E): IrcConnectionEventsMap[E][] {
        return this.ee.rawListeners(event) as any;
    }
    listeners<E extends keyof IrcConnectionEventsMap>(event: E): IrcConnectionEventsMap[E][] {
        return this.ee.listeners(event) as any;
    }
    listenerCount<E extends keyof IrcConnectionEventsMap>(event: E): number {
        return this.ee.listenerCount(event);
    }
    getMaxListeners(): number {
        return this.ee.getMaxListeners();
    }
    setMaxListeners(maxListeners: number): this {
        this.ee.setMaxListeners(maxListeners);
        return this;
    }
    
}