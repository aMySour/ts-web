const url = 'https://localhost:4433/';

enum Events {
    Ready = "ready",
    Message = "message",
    Closed = "closed",
};

interface EventParams {
    [Events.Ready]: [void];
    [Events.Message]: [event: string, data: object];
    [Events.Closed]: [void];
};

type EventHandler<T extends keyof EventParams> = (...params: EventParams[T]) => void;

class Transport {
    transport: WebTransport | null = null;

    unreliable: {
        writer: WritableStreamDefaultWriter<Uint8Array>,
        reader: ReadableStreamDefaultReader<Uint8Array>,
    } | null = null;

    reliable: {
        writer: WritableStreamDefaultWriter<Uint8Array>,
        reader: ReadableStreamDefaultReader<Uint8Array>,
    } | null = null;

    listeners: { [key: string]: Function[] } = {};

    on<K extends keyof EventParams>(event: K, callback: EventHandler<K>) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    once<K extends keyof EventParams>(event: K, callback: EventHandler<K>) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push((...args: any[]) => {
            // @ts-ignore
            callback(...args);
            this.off(event, callback);
        });
    }

    emit<K extends keyof EventParams>(event: K, ...args: EventParams[K]) {
        if (!this.listeners[event]) return;
        for (let listener of this.listeners[event]) {
            listener(...args);
        }
    }

    off<K extends keyof EventParams>(event: K, callback: EventHandler<K>) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(l => l !== callback);
    }

    async connect() {
        this.transport = new WebTransport(url);

        // Set up functions to respond to the connection closing:
        this.transport.closed.then(() => {
            this.emit(Events.Closed);
        }).catch((error) => {
            console.error(`The HTTP/3 connection to ${url} closed due to ${error}.`);
            this.emit(Events.Closed);
        });

        // Once .ready fulfills, the connection can be used.
        await this.transport.ready;

        this.unreliable = {
            writer: this.transport.datagrams.writable.getWriter(),
            reader: this.transport.datagrams.readable.getReader(),
        };

        const stream = await this.transport.createBidirectionalStream();
        this.reliable = {
            writer: stream.writable.getWriter(),
            reader: stream.readable.getReader(),
        };

        this.unreliable.writer.closed.then(() => {
            console.log('Writer closed gracefully');
            this.emit(Events.Closed);
        }).catch((e) => {
            console.log('Writer closed abruptly');
            this.emit(Events.Closed);
        });

        this.reliable.writer.closed.then(() => {
            console.log('Writer closed gracefully');
            this.emit(Events.Closed);
        }).catch((e) => {
            console.log('Writer closed abruptly');
            this.emit(Events.Closed);
        });

        this.unreliable.reader.closed.then(() => {
            console.log('Reader closed gracefully');
            this.emit(Events.Closed);
        }).catch((e) => {
            console.log('Reader closed abruptly');
            this.emit(Events.Closed);
        });

        this.reliable.reader.closed.then(() => {
            console.log('Reader closed gracefully');
            this.emit(Events.Closed);
        }).catch((e) => {
            console.log('Reader closed abruptly');
            this.emit(Events.Closed);
        });

        this.setupReader(this.unreliable.reader);
        this.setupReader(this.reliable.reader);

        window.addEventListener('beforeunload', (event) => {
            this.transport?.close();
        });

        this.emit(Events.Ready);
    }

    private async setupReader(reader: ReadableStreamDefaultReader<Uint8Array>) {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            // value is a Uint8Array
            console.log(value);
            if (value) {
                const data: { event?: string, data?: any } = JSON.parse(new TextDecoder().decode(value));
                if (data.event) {
                    this.emit(Events.Message, data.event, data.data);
                }
            }
        }
    }

    async sendUnreliable(event: string, data: object) {
        if (!this.unreliable) {
            console.error("Unreliable transport not available.");
            return;
        }

        const message = JSON.stringify({ event, data });
        const encodedMessage = new TextEncoder().encode(message);
        try {
            await this.unreliable.writer.write(encodedMessage);
        } catch (error) {
            console.error("Sending unreliable message failed:", error);
        }
    }

    async sendReliable(event: string, data: object) {
        if (!this.reliable) {
            console.error("Reliable transport not available.");
            return;
        }

        const message = JSON.stringify({ event, data });
        const encodedMessage = new TextEncoder().encode(message);
        try {
            await this.reliable.writer.write(encodedMessage);
        } catch (error) {
            console.error("Sending reliable message failed:", error);
        }
    }
}

export { Events };
export type { EventParams, EventHandler };
export default Transport;