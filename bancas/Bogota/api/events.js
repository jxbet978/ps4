let clients = new Set();
let lastEvents = [];
const MAX_EVENTS = 100;

// Función para enviar eventos a todos los clientes conectados
function sendEventToAll(data) {
    const eventString = `data: ${JSON.stringify(data)}\n\n`;
    clients.forEach(client => {
        try {
            client.write(eventString);
        } catch (e) {
            console.error('Error enviando evento al cliente:', e);
            clients.delete(client);
        }
    });
}

// Función para almacenar y transmitir eventos
function storeAndBroadcastEvent(event) {
    // Agregar timestamp si no existe
    const eventWithTimestamp = {
        ...event,
        timestamp: event.timestamp || Date.now()
    };

    // Almacenar el evento
    lastEvents.unshift(eventWithTimestamp);
    if (lastEvents.length > MAX_EVENTS) {
        lastEvents = lastEvents.slice(0, MAX_EVENTS);
    }

    // Transmitir el evento a todos los clientes
    sendEventToAll(eventWithTimestamp);
}

// Manejador principal para el endpoint de eventos
function handleEvents(req, res) {
    // Configurar headers para SSE
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    // Enviar un evento inicial
    const initialEvent = {
        type: 'connected',
        timestamp: Date.now()
    };
    res.write(`data: ${JSON.stringify(initialEvent)}\n\n`);

    // Agregar este cliente al conjunto de clientes
    clients.add(res);

    // Manejar desconexión del cliente
    req.on('close', () => {
        clients.delete(res);
        res.end();
    });
}

// Endpoint para eventos
module.exports = (req, res) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.status(200).end();
        return;
    }

    if (req.method === 'GET') {
        handleEvents(req, res);
    } else {
        res.status(405).end();
    }
};

// Exportar funciones necesarias
module.exports.storeAndBroadcastEvent = storeAndBroadcastEvent;
module.exports.sendEventToAll = sendEventToAll;