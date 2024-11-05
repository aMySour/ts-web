interface Player {
    x: number,
    y: number,
    color: number[],
    id: number,
}

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const connectionStatus = document.getElementById('connectionStatus')!;
let playerId = Math.floor(Math.random() * 10000);
let players: { [id: number]: Player } = {};
const moveSpeed = 5;
let transport: WebTransport | null = null;
let sendStreamWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;

function drawPlayers() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const id in players) {
        const player = players[id];
        ctx.fillStyle = `rgb(${player.color[0]}, ${player.color[1]}, ${player.color[2]})`;
        ctx.fillRect(player.x, player.y, 20, 20);
    }
}

async function connect() {
    try {
        transport = new WebTransport('https://localhost:4433/');

        await transport.ready;
        connectionStatus.textContent = 'Connected to server';
        console.log('Connected to server');

        const sendStream = await transport.createUnidirectionalStream();
        sendStreamWriter = sendStream.getWriter();

        readIncomingStreams();

    } catch (error) {
        connectionStatus.textContent = 'Failed to connect to server';
        console.error('Connection error:', error);
    }
}

async function readIncomingStreams() {
    const reader: ReadableStreamDefaultReader<any> = transport!.incomingUnidirectionalStreams.getReader();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        handleIncomingStream(value);
    }
}

async function handleIncomingStream(receivedStream: any) {
    const reader = receivedStream.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
            const playerUpdates = JSON.parse(new TextDecoder().decode(value));
            console.log(playerUpdates);
            players[playerUpdates.id] = playerUpdates;
            playerId = playerUpdates.id;
            drawPlayers();
        }
    }
}

window.addEventListener('keydown', async (e) => {
    if (!sendStreamWriter) return;

    let moved = false;
    const player = players[playerId];
    if (!player) return;

    if (e.code === 'ArrowUp') { player.y -= moveSpeed; moved = true; }
    if (e.code === 'ArrowDown') { player.y += moveSpeed; moved = true; }
    if (e.code === 'ArrowLeft') { player.x -= moveSpeed; moved = true; }
    if (e.code === 'ArrowRight') { player.x += moveSpeed; moved = true; }

    if (moved) {
        console.log('moved')
        const msg = JSON.stringify(player);
        await sendStreamWriter.write(new TextEncoder().encode(msg));
        console.log('sent');
        drawPlayers();
    }
});

connect();