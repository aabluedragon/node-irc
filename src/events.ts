import { WhoisResponse } from "./state";
import { ChanListItem, SaslErrors } from './irc';
import { Message } from './parse_message';

type IrcChannelName = string;
type CtcpType = string;
type MessageNick = string;

export type CtcpEventIndex = `ctcp-${CtcpType}`;

// Due to a horrible design decision of the past, there is no seperator between the type
// and channel in this event type. We also can't mandate that Channel has a non-zero length.
// The combination of which means that the signatures below would clash with the channel-less
// siguatures, so we've introduced a fake `#` to make the types work. This is a known bug, and
// until TypeScript let's us specify non-zero string, a bug it will remain.

export type PartEventIndex = `part#${IrcChannelName}`;
export type JoinEventIndex = `join#${IrcChannelName}`;
export type MessageEventIndex = `message#${IrcChannelName}`;

export type ClientEvents = {
    registered: () => void,
    notice: (from: MessageNick, to: string, noticeText: string, message: Message) => void,
    mode_is: (channel: IrcChannelName, mode: string) => void,
    '+mode': (
        channel: IrcChannelName, nick: MessageNick, mode: string, user: string|undefined, message: Message) => void,
    '-mode': (
        channel: IrcChannelName, nick: MessageNick, mode: string, user: string|undefined, message: Message) => void,
    nick: (oldNick: MessageNick, newNick: string, channels: string[], message: Message) => void,
    motd: (modt: string) => void,
    action: (from: string, to: string, action: string, message: Message) => void,
    ctcp: (from: string, to: string, text: string, CtcpType: string, message: Message) => void,
    [key: CtcpEventIndex]: (from: string, to: string, text: string, message: Message) => void,
    raw: (message: Message) => void,
    kick: (channel: IrcChannelName, who: string, by: MessageNick, reason: string, message: Message) => void,
    names: (channel: IrcChannelName, users: Map<string, string>) => void
    topic: (channel: IrcChannelName, topic: string, by: MessageNick, message: Message) => void,
    channellist: (items: ChanListItem[]) => void,
    channellist_start: () => void,
    channellist_item: (item: ChanListItem) => void,
    whois: (whois: WhoisResponse) => void,
    selfMessage: (target: string, messageLine: string) => void,
    kill: (nick: string, reason: string, channels: string[], message: Message) => void,
    message: (from: MessageNick, to: string, text: string, message: Message) => void,
    pm: (from: MessageNick, text: string, message: Message) => void,
    invite: (channel: IrcChannelName, from: MessageNick, message: Message) => void,
    quit: (nick: MessageNick, reason: string, channels: string[], message: Message) => void,
    join: (channel: IrcChannelName, nick: MessageNick, message: Message) => void,
    abort: (retryCount: number) => void,
    connect: () => void,
    error: (message: Message) => void,
    sasl_error: (error: SaslErrors, ...args: string[]) => void,
    sasl_loggedin: (nick: string, ident: string, account: string, message: string) => void,
    sasl_loggedout: (nick: string, ident: string, message: string) => void,
    ping: (pingData: string) => void,
    pong: (pingData: string) => void,
    netError: (error: Error) => void,
    part: (channel: IrcChannelName, nick: MessageNick, reason: string, message: Message) => void,
    [key: JoinEventIndex]: (who: MessageNick, message: Message) => void,
    [key: PartEventIndex]: (nick: MessageNick, who: string, message: Message) => void,
    [key: MessageEventIndex]: (nick: MessageNick, who: string, message: Message) => void,
}
