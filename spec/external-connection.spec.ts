import { test, expect, describe, beforeEach, afterEach } from '@jest/globals';
import { TestIrcServer, TestClient } from '../src/testing';
import { DefaultIrcSupported, IrcConnection, IrcInMemoryState } from '../src';
import { createConnection } from 'net';

class TestIrcInMemoryState extends IrcInMemoryState {
    public flushCount = 0;
    public flush() {
        this.flushCount++;
    }
}

describe('Client with external connection', () => {
    let server: TestIrcServer;
    beforeEach(() => {
        server = new TestIrcServer();
        return server.setUp([]);
    });
    afterEach(() => {
        return server.tearDown();
    })
    let client: TestClient;
    test('can connect with a fresh session', async () => {
        const inMemoryState = new TestIrcInMemoryState(DefaultIrcSupported);
        client = new TestClient(server.address, TestIrcServer.generateUniqueNick("mynick"), {
            port: server.port,
            autoConnect: false,
            connectionTimeout: 4000,
        }, inMemoryState, createConnection({
            port: server.port,
            host: server.address,
        }) as IrcConnection);
        client.connect();
        await client.waitForEvent('registered');
        expect(inMemoryState.registered).toBe(true);
        expect(inMemoryState.flushCount).toBeGreaterThan(0);
        client.disconnect();
    });
    test('can connect with a reused session', async () => {
        const inMemoryState = new TestIrcInMemoryState(DefaultIrcSupported);
        const persistentConnection = createConnection({
            port: server.port,
            host: server.address,
        }) as IrcConnection;
        client = new TestClient(server.address, TestIrcServer.generateUniqueNick("mynick"), {
            port: server.port,
            autoConnect: false,
            connectionTimeout: 4000,
        }, inMemoryState, persistentConnection);
        client.connect();
        await client.waitForEvent('registered');
        client.destroy();

        // Somehow we need to clear away the client.
        const reusedClient = new TestClient(server.address, TestIrcServer.generateUniqueNick("mynick"), {
            port: server.port,
            autoConnect: false,
            connectionTimeout: 4000,
        }, inMemoryState, persistentConnection);
        const promise = reusedClient.waitForEvent('registered');
        reusedClient.connect();
        await promise;
        client.disconnect();
    }, 15000);
});
