import { randomUUID } from 'crypto';
import { Client, ClientEvents, Message } from '..';

const DEFAULT_PORT = parseInt(process.env.IRC_TEST_PORT ?? '6667', 10);
const DEFAULT_ADDRESS = process.env.IRC_TEST_ADDRESS ?? "127.0.0.1";

/**
 * Exposes a client instance with helper methods to listen
 * for events.
 */
export class TestClient extends Client {
    public readonly errors: Message[] = [];

    public connect(fn?: () => void) {
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
        return `${name}-${randomUUID().replace('-', '').substring(0, 8)}`;
    }

    public readonly clients: Record<string, TestClient> = {};
    constructor(public readonly address = DEFAULT_ADDRESS, public readonly port = DEFAULT_PORT) { }

    async setUp(clients = ['speaker', 'listener']) {
        const connections: Promise<void>[] = [];
        for (const clientName of clients) {
            const client =
                new TestClient(this.address, TestIrcServer.generateUniqueNick(clientName), {
                    port: this.port,
                    autoConnect: false,
                    connectionTimeout: 4000,
                });
            this.clients[clientName] = client;
            connections.push(new Promise<void>((resolve, reject) => {
                client.once('error', e => reject(e));
                client.connect(resolve)
            }));
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
