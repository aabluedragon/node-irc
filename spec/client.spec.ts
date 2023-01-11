import { describe, expect, test } from '@jest/globals';
import { IrcServer } from './util/irc-server';


IrcServer.describe('Client', (server) => {
    describe('joining channels', () => {
        test('will get a join event from a newly joined user', async () => {
            const [speaker, listener] = server().clients;

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
        test('can join a channel and send a message', async () => {
            const [speaker, listener] = server().clients;
            await listener.join('#foobar');
            const messagePromise = listener.waitForEvent('message');
            await speaker.join('#foobar');
            await speaker.say('#foobar', 'Hello world!');

            const [nick, channel, text] = await messagePromise;
            expect(nick).toBe(speaker.nick);
            expect(channel).toBe('#foobar');
            expect(text).toBe('Hello world!');
        });
        test('will store channel information', async () => {
            const [speaker] = server().clients;
            expect(speaker.chanData('#foobar')).toBeUndefined();
            speaker.join('#foobar');
            await speaker.waitForEvent('join');

            const channel = speaker.chanData('#foobar');
            expect(channel).toBeDefined();
            expect(channel?.key).toEqual('#foobar');
            expect(channel?.serverName).toEqual('#foobar');
            expect(channel?.users.get(speaker.nick)).toBeDefined();
        });
    });
    describe('mode changes', () => {
        test('will handle adding a parameter-less mode', async () => {
            const [speaker] = server().clients;
            await speaker.join('#foobar');
            await speaker.waitForEvent('join');
            speaker.send('MODE', '#foobar', '+m');

            const [channel, nick, mode, user] = await speaker.waitForEvent('+mode');
            expect(nick).toBe(speaker.nick);
            expect(channel).toBe('#foobar');
            expect(mode).toBe('m');
            expect(user).toBeUndefined();
        });
        test('will handle removing a parameter-less mode', async () => {
            const [speaker] = server().clients;
            await speaker.join('#foobar');
            await speaker.waitForEvent('join');
            await speaker.send('MODE', '#foobar', '+m');
            speaker.send('MODE', '#foobar', '-m');

            const [channel, nick, mode, user] = await speaker.waitForEvent('-mode');
            expect(nick).toBe(speaker.nick);
            expect(channel).toBe('#foobar');
            expect(mode).toBe('m');
            expect(user).toBeUndefined();
        });
        test('will handle adding a parameter mode', async () => {
            const [speaker, listener] = server().clients;
            await speaker.join('#foobar');
            await listener.join('#foobar');
            await speaker.waitForEvent('join');
            await speaker.send('MODE', '#foobar', '+o', listener.nick);

            const [channel, nick, mode, user] = await speaker.waitForEvent('+mode');
            expect(nick).toBe(speaker.nick);
            expect(channel).toBe('#foobar');
            expect(mode).toBe('o');
            expect(user).toBe(listener.nick);
        });
        test('will handle removing a parameter mode', async () => {
            const [speaker, listener] = server().clients;
            await speaker.join('#foobar');
            await listener.join('#foobar');
            await speaker.waitForEvent('join');
            await speaker.send('MODE', '#foobar', '+o', listener.nick);
            await speaker.send('MODE', '#foobar', '-o', listener.nick);

            const [channel, nick, mode, user] = await speaker.waitForEvent('-mode');
            expect(nick).toBe(speaker.nick);
            expect(channel).toBe('#foobar');
            expect(mode).toBe('o');
            expect(user).toBe(listener.nick);
        });
    });
});
