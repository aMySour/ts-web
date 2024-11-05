import Transport, { Events } from './transport';

const transport = new Transport();

transport.on(Events.Ready, () => {
    console.log('Connected');
});

transport.on(Events.Message, (msg) => {
    console.log('Message:', msg);
});

transport.on(Events.Closed, () => {
    console.log('Closed');
});