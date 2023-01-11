import { randomUUID } from 'crypto';
import { Client, ClientEvents } from '../../lib';
import { describe, beforeEach, afterEach } from '@jest/globals';

const DEFAULT_PORT = parseInt(process.env.IRC_TEST_PORT ?? '6667', 10);
const DEFAULT_ADDRESS = process.env.IRC_TEST_ADDRESS ?? "127.0.0.1";

export class TestClient extends Client {
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

export class IrcServer {

    /**
     * Test wrapper that automatically provisions an IRC server
     * @param name The test name
     * @param fn The inner function
     * @returns A jest describe function.
     */
    static describe(name: string, fn: (server: () => IrcServer) => void, opts?: {clients: string[]}) {
        return describe(name, () => {
            let server: IrcServer;
            beforeEach(async () => {
                server = new IrcServer();
                await server.setUp(opts?.clients);
            });
            afterEach(async () => {
                await server.tearDown();
            });
            fn(() => server);
        });
    }

    static generateUniqueNick(name = 'default') {
        return `${name}-${randomUUID().replace('-', '').substring(0, 8)}`;
    }

    public readonly clients: TestClient[] = [];
    constructor(private readonly address = DEFAULT_ADDRESS, private readonly port = DEFAULT_PORT) { }

    async setUp(clients = ['speaker', 'listener']) {
        const connections: Promise<void>[] = [];
        for (let index = 0; index < clients.length; index++) {
            const client =
                new TestClient(this.address, IrcServer.generateUniqueNick(clients[index]), {
                    port: this.port,
                    autoConnect: false,
                    connectionTimeout: 4000,
                });
            this.clients.push(client);
            connections.push(new Promise<void>((resolve, reject) => {
                client.once('error', e => reject(e));
                client.connect(resolve)
            }));
        }
        await Promise.all(connections);
    }

    async tearDown() {
        const connections: Promise<void>[] = [];
        for (const client of this.clients) {
            connections.push(new Promise<void>((resolve, reject) => {
                client.once('error', e => reject(e));
                client.disconnect(resolve)
            }));
        }
        await Promise.all(connections);
    }
}
