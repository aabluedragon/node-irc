import { EventEmitter } from './event_emitter';
import {IrcConnection, IrcConnectionEventsMap} from './irc'
import {IMessageEvent, w3cwebsocket} from 'websocket';
import type {EventEmitter as EventEmitterType} from 'events'

const hasBrowserWebsocket = (()=>{
    try {
        return window.WebSocket != null;
    } catch(e) {
        return false
    }
})();

export class WebsocketWrapper implements IrcConnection {

    #timeoutMS: number|undefined = undefined;
    #timeoutTimer: any = undefined;
    ee: EventEmitterType = new EventEmitter();
    ws: w3cwebsocket|WebSocket;

    constructor(remote:string, protocols:string|string[]|undefined) {
        this.ws = hasBrowserWebsocket? new WebSocket(remote, protocols) : new w3cwebsocket(remote, protocols);

        this.extendTimeoutTimer();

        this.ws.onopen = ()=>{
            this.extendTimeoutTimer();
            this.ee.emit('connect');
        }

        this.ws.onclose = ()=>{
            this.ee.emit('end');
            this.ee.emit('close');
            this.dismissTimeoutTimer();
        }

        this.ws.onerror = (ev:Error)=>{
            this.ee.emit('error', ev);
            this.dismissTimeoutTimer();
        }
        this.ws.onmessage = (ev:IMessageEvent)=>{
            this.extendTimeoutTimer();
            this.ee.emit('data', ev?.data);
        }
    }

    
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

    //
    // IrcConnection
    //
    get connecting() {
        return this.ws.readyState == w3cwebsocket.CONNECTING;
    };
    setTimeout(timeoutMS?: number|undefined): void {
        this.#timeoutMS = timeoutMS;
        this.extendTimeoutTimer(); 
    }
    destroy():void {
        this.ws.close();
    }
    write(data: string): void {
        this.extendTimeoutTimer();
        this.ws.send(data);
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
