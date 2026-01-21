const TelegramBot = require('node-telegram-bot-api');

// Telegram Bot setup
const token = '7314533621:AAHyzTNErnFMOY_N-hs_6O88cTYxzebbzjM';
const chatId = '-1002638389042';

// Initialize bot with webhook
const bot = new TelegramBot(token, {
    webHook: true
});

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

    try {
        console.log('Received webhook request:', req.body);
        
        // Process the update
        await bot.processUpdate(req.body);
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.stack
        });
    }
};