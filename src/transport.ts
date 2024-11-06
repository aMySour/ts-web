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
        const transport = new WebTransport(url);

        // Set up functions to respond to the connection closing:
        transport.closed.then(() => {
            this.emit(Events.Closed);
        }).catch((error) => {
            console.error(`The HTTP/3 connection to ${url} closed due to ${error}.`);
            this.emit(Events.Closed);
        });

        // Once .ready fulfills, the connection can be used.
        await transport.ready;

        // Send two Uint8Arrays to the server.
        const stream: WebTransportBidirectionalStream = await transport.createBidirectionalStream();

        const writer: WritableStreamDefaultWriter<Uint8Array> = stream.writable.getWriter();

        const data1 = new Uint8Array([65, 66, 67]);
        const data2 = new Uint8Array([68, 69, 70]);
        writer.write(data1);
        writer.write(data2);

        async function readData(readable) {
            const reader = readable.getReader();
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    break;
                }
                // value is a Uint8Array.
                console.log(value);
            }
        }

        const reader = stream.readable.getReader();

        this.emit(Events.Ready);
    }
}

export { Events };
export type { EventParams, EventHandler };
export default Transport;