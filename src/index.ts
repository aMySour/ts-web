import Transport, { Events } from './transport2';

const transport = new Transport();

console.clear();
console.log('Connecting...');

transport.once(Events.Ready, () => {
    console.log('Connected');

    transport.sendReliable('example_reliable', {
        someData: 123,
    });
    transport.sendUnreliable('example_unreliable', {
        imDatagramed: 456,
    });
});

transport.on(Events.Message, (event, data) => {
    console.log('event', event, 'data', data);
});

transport.once(Events.Closed, () => {
    console.log('Closed');
});

transport.connect();