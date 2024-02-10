import type * as cryptoType from 'crypto';
import { Client, ClientEvents, IrcClientOpts, Message } from '..';

const DEFAULT_PORT = (()=>{
    let port:number|undefined = undefined;
    try {
        port = parseInt(process.env.IRC_TEST_PORT as string, 10);
    } catch(e) {}
    if(!port || port == undefined) {
        port = 6667;
    }
    return port;
})();
const DEFAULT_ADDRESS = (()=>{
    let address:string|undefined = undefined;
    try {
        address = process.env.IRC_TEST_ADDRESS;
    } catch(e) {}
    if(!address || !address?.length) {
        address = '127.0.0.1';
    }
    return address;
})();

/**
 * Exposes a client instance with helper methods to listen
 * for events.
 */
export class TestClient extends Client {
    public readonly errors: Message[] = [];

    public async connect(fn?: () => void) {
        // These can be IRC errors which aren't fatal to tests.
        this.on('error', msg => this.errors.push(msg));
        super.connect(fn);
    }

    public waitForEvent<T extends keyof ClientEvents>(
        eventName: T, timeoutMs = 5000
    ): Promise<Parameters<ClientEvents[T]>> {
        return new Promise<Parameters<ClientEvents[T]>>(
            (resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${eventName}`)), timeoutMs);
                this.once(eventName, (...m: unknown[]) => {
                    clearTimeout(timeout);
                    resolve(m as Parameters<ClientEvents[T]>);
                });
            },
        );
    }
}

/**
 * A jest-compatible test rig that can be used to run tests against an IRC server.
 *
 * @example
 * ```ts
    let server: TestIrcServer;
    beforeEach(() => {
        server = new TestIrcServer();
        return server.setUp();
    });
    afterEach(() => {
        return server.tearDown();
    })
    describe('joining channels', () => {
        test('will get a join event from a newly joined user', async () => {
            const { speaker, listener } = server.clients;

            // Join the room and listen
            const listenerJoinPromise = listener.waitForEvent('join');
            await listener.join('#foobar');
            const [lChannel, lNick] = await listenerJoinPromise;
            expect(lNick).toBe(listener.nick);
            expect(lChannel).toBe('#foobar');

            const speakerJoinPromise = listener.waitForEvent('join');
            await speaker.join('#foobar');
            const [channel, nick] = await speakerJoinPromise;
            expect(nick).toBe(speaker.nick);
            expect(channel).toBe('#foobar');
        });
    });
 * ```
 */
export class TestIrcServer {

    static generateUniqueNick(name = 'default') {
        return `${name}-${TestIrcServer.crypto!.randomUUID().replace('-', '').substring(0, 8)}`;
    }
    static generateUniqueChannel(name = 'default') {
        return `#${this.generateUniqueNick(name)}`;
    }

    public readonly clients: Record<string, TestClient> = {};
    constructor(
        public readonly address = DEFAULT_ADDRESS, public readonly port = DEFAULT_PORT,
        public readonly customConfig: Partial<IrcClientOpts> = {}
    ) { }

    static crypto?: typeof cryptoType

    async setUp(clients = ['speaker', 'listener']) {

        if(!TestIrcServer?.crypto) {
            TestIrcServer.crypto = await import('crypto');
        }

        const connections: Promise<void>[] = [];
        for (const clientName of clients) {
            const client =
                new TestClient(this.address, TestIrcServer.generateUniqueNick(clientName), {
                    port: this.port,
                    autoConnect: false,
                    connectionTimeout: 4000,
                    debug: true,
                    ...this.customConfig,
                });
            this.clients[clientName] = client;
            // Make sure we load isupport before reporting readyness.
            const isupportEvent = client.waitForEvent('isupport').then(() => { /* not interested in the value */ });
            const connectionPromise = new Promise<void>((resolve, reject) => {
                client.once('error', e => reject(e));
                client.connect(resolve)
            }).then(() => isupportEvent);
            connections.push(connectionPromise);
        }
        await Promise.all(connections);
    }

    async tearDown() {
        const connections: Promise<void>[] = [];
        for (const client of Object.values(this.clients)) {
            connections.push(new Promise<void>((resolve, reject) => {
                client.once('error', e => reject(e));
                client.disconnect(resolve)
            }));
        }
        await Promise.all(connections);
    }
}
